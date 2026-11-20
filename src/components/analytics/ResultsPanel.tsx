import { memo, useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getFormulationStatusLabel, getNutrientDisplayName, pickLang } from "../../i18n";
import type {
  AppLanguage,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  Requirement,
} from "../../types";
import { cn } from "../../utils/cn";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { Switch } from "../ui/Switch";
import { BatchMixerCalculator } from "./BatchMixerCalculator";
import { ConflictDiagnosticsBanner } from "./ConflictDiagnosticsBanner";
import { FormulationCharts } from "./FormulationCharts";
import { ShadowPriceTab } from "./ShadowPriceTab";
import { WhatIfManualLock } from "./WhatIfManualLock";

export type ResultSubTab = "batch" | "charts" | "dual" | "whatif";
export type ResultSpotlightTarget = "dual" | "whatif" | "rumen" | null;

export interface ResultsPanelProps {
  readonly result: FormulationResult;
  readonly ingredients: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly requirement?: Requirement;
  readonly config: FormulationConfig;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly simpleMode?: boolean;
  readonly language?: AppLanguage;
  readonly hideKpiStrip?: boolean;
  readonly activeSubTab?: ResultSubTab;
  readonly spotlightTarget?: ResultSpotlightTarget;
  readonly onClearSpotlight?: () => void;
  readonly onSubTabChange?: (tab: ResultSubTab) => void;
  readonly onSetBatchSize: (kg: number) => void;
  readonly onToggleElastic: (enabled: boolean) => void;
  readonly onSetManualLock: (id: string, pct: number | null) => void;
  readonly onClearManualLocks: () => void;
}

export const ResultsPanel = memo(function ResultsPanel({
  result,
  ingredients,
  allNutrients,
  requirement,
  config,
  decimalPlaces = 0,
  simpleMode = !config.enableAdvanceNutrients,
  language = "id",
  hideKpiStrip = false,
  activeSubTab,
  spotlightTarget = null,
  onClearSpotlight,
  onSubTabChange,
  onSetBatchSize,
  onToggleElastic,
  onSetManualLock,
  onClearManualLocks,
}: ResultsPanelProps) {
  const [internalSubTab, setInternalSubTab] = useState<ResultSubTab>("batch");
  const subTab = activeSubTab ?? internalSubTab;
  const setSubTab = (next: ResultSubTab) => {
    setInternalSubTab(next);
    onSubTabChange?.(next);
    onClearSpotlight?.();
  };

  const dualRef = useRef<HTMLDivElement | null>(null);
  const whatIfRef = useRef<HTMLDivElement | null>(null);
  const rumenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!spotlightTarget) return;
    const targetEl =
      spotlightTarget === "dual" && subTab === "dual"
        ? dualRef.current
        : spotlightTarget === "whatif" && subTab === "whatif"
          ? whatIfRef.current
          : spotlightTarget === "rumen" && subTab === "batch"
            ? rumenRef.current
            : null;
    if (!targetEl || typeof targetEl.scrollIntoView !== "function") return;
    const id = requestAnimationFrame(() => {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [spotlightTarget, subTab]);

  const nutrientsCatalog = allNutrients ?? [...MOCK_NUTRIENTS, ...(config.customNutrients ?? [])];

  const statusBadge =
    result.status === "optimal" ? (
      <Badge tone="emerald">{getFormulationStatusLabel(language, "optimal")}</Badge>
    ) : result.status === "near_feasible" ? (
      <Badge tone="amber">{getFormulationStatusLabel(language, "near_feasible")}</Badge>
    ) : (
      <Badge tone="rose">{getFormulationStatusLabel(language, result.status)}</Badge>
    );

  const fracNutMeta = config.fractionalObjective
    ? nutrientsCatalog.find((n) => n.id === config.fractionalObjective?.nutrientId)
    : undefined;

  return (
    <Card
      interactive={false}
      highlight={result.status === "infeasible" ? "coral" : "none"}
      className="flex flex-col lg:h-full lg:overflow-hidden"
    >
      {!hideKpiStrip && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                {pickLang(language, "Biaya / kg", "Cost / kg")} (
                {result.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")})
              </span>
              <span className="text-base font-bold tracking-tight tabular-nums text-[var(--status-warning)]">
                {result.costPerKg !== null ? formatCurrencyIdr(result.costPerKg) : "—"}
              </span>
            </div>

            <div className="border-l border-[var(--border-subtle)] pl-4">
              <span className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                {pickLang(language, "Biaya", "Cost")} / {config.batchSizeKg} kg
              </span>
              <span className="text-base font-bold tracking-tight tabular-nums text-[var(--status-success)]">
                {result.batchTotalCost !== null && result.batchTotalCost !== undefined
                  ? formatCurrencyIdr(result.batchTotalCost)
                  : "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <Switch
                checked={config.enableElasticFallback}
                onCheckedChange={onToggleElastic}
                label={pickLang(
                  language,
                  "Aktifkan toleransi batas saat target terlalu ketat",
                  "Enable flexible bounds when targets are too tight",
                )}
              />
              <span>{pickLang(language, "Toleransi Target", "Flexible Bounds")}</span>
            </label>
            {statusBadge}
          </div>
        </div>
      )}

      {result.status !== "infeasible" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-2.5 py-2 sm:px-3">
          <SegmentedTabs
            fitMobile
            ariaLabel={pickLang(
              language,
              "Sub-tampilan hasil formulasi",
              "Formulation result views",
            )}
            value={subTab}
            onChange={setSubTab}
            options={[
              {
                value: "batch",
                label: pickLang(language, "Komposisi & Batch", "Composition & Batch"),
                mobileLabel: pickLang(language, "Komposisi", "Mix"),
                badge: result.composition.length,
              },
              { value: "charts", label: pickLang(language, "Grafik", "Charts") },
              { value: "dual", label: pickLang(language, "Harga Bayangan", "Shadow Price") },
              {
                value: "whatif",
                label: "What-If",
                badge: Object.keys(config.manualLocks ?? {}).length || undefined,
              },
            ]}
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {result.fractionalCost !== undefined && result.fractionalCost !== null && (
              <Badge tone="sky">
                {formatCurrencyIdr(result.fractionalCost)} /{" "}
                {fracNutMeta
                  ? getNutrientDisplayName(fracNutMeta, language, simpleMode)
                  : config.fractionalObjective?.nutrientId}
              </Badge>
            )}
            {result.stochasticIterations !== undefined && (
              <Badge tone="amber">
                SLP {result.stochasticIterations} {pickLang(language, "iter", "iter")}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="custom-scrollbar space-y-3 p-3 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
        <ConflictDiagnosticsBanner
          status={result.status}
          conflicts={result.conflicts ?? []}
          messages={result.messages}
          iis={result.iis ?? []}
          relaxationPenalty={result.relaxationPenalty}
          language={language}
        />

        {result.status !== "infeasible" && (
          <>
            {subTab === "batch" && (
              <>
                <BatchMixerCalculator
                  batchSizeKg={config.batchSizeKg}
                  onSetBatchSize={onSetBatchSize}
                  composition={result.composition}
                  ingredients={ingredients}
                  activeBasis={result.basis}
                  decimalPlaces={decimalPlaces}
                  language={language}
                />

                {result.rumenEvaluation && (
                  <div
                    ref={rumenRef}
                    onPointerDown={onClearSpotlight}
                    onClick={onClearSpotlight}
                    className={cn(
                      "glass-card rounded-xl p-3 text-xs transition-shadow",
                      spotlightTarget === "rumen" && "feature-spotlight-glow",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                        <Activity className="h-3.5 w-3.5 text-[var(--status-success)]" />
                        <span>
                          {pickLang(
                            language,
                            "Evaluator Rumen (CNCPS / NASEM)",
                            "Rumen Biology Evaluator (CNCPS / NASEM)",
                          )}
                        </span>
                      </h3>
                      <Badge
                        tone={
                          result.rumenEvaluation.acidosisRisk === "low"
                            ? "emerald"
                            : result.rumenEvaluation.acidosisRisk === "moderate"
                              ? "amber"
                              : "rose"
                        }
                      >
                        {pickLang(language, "Risiko Asidosis", "Acidosis Risk")}:{" "}
                        {result.rumenEvaluation.acidosisRisk === "low"
                          ? pickLang(language, "Rendah", "Low")
                          : result.rumenEvaluation.acidosisRisk === "moderate"
                            ? pickLang(language, "Sedang", "Moderate")
                            : pickLang(language, "Tinggi", "High")}
                      </Badge>
                    </div>
                    <div className="neu-well grid grid-cols-2 gap-2.5 rounded-lg p-2.5 tabular-nums sm:grid-cols-4">
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          {pickLang(language, "Hijauan / NDF", "Forage / NDF")}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(
                            result.rumenEvaluation.forageFractionPct,
                            resolveDisplayDigits(
                              "%",
                              "inclusion",
                              decimalPlaces,
                              result.rumenEvaluation.forageFractionPct,
                            ),
                          )}
                          % /{" "}
                          {formatNumberLocale(
                            result.rumenEvaluation.ndfPct,
                            resolveDisplayDigits(
                              "%",
                              "ndf",
                              decimalPlaces,
                              result.rumenEvaluation.ndfPct,
                            ),
                          )}
                          %
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          peuNDF240 / Est. DMI
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(
                            result.rumenEvaluation.peuNdf240Pct,
                            resolveDisplayDigits(
                              "%",
                              "ndf",
                              decimalPlaces,
                              result.rumenEvaluation.peuNdf240Pct,
                            ),
                          )}
                          % / {formatNumberLocale(result.rumenEvaluation.estimatedDmiPctBw, 2)}% BW
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          {pickLang(language, "Laju Alir kp (F/C)", "Passage kp (F/C)")}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(result.rumenEvaluation.kpForagePctPerH, 2)} /{" "}
                          {formatNumberLocale(result.rumenEvaluation.kpConcPctPerH, 2)} %/h
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          {pickLang(language, "MCP / Metana eCH4", "MCP / Methane eCH4")}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(result.rumenEvaluation.microbialProteinGPerKgDm, 0)} /{" "}
                          {formatNumberLocale(result.rumenEvaluation.predictedMethaneGPerKgDm, 1)}{" "}
                          g/kg
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {subTab === "charts" && (
              <FormulationCharts
                composition={result.composition}
                nutrients={result.nutrients}
                allNutrients={nutrientsCatalog}
                ingredients={ingredients}
                batchTotalCost={result.batchTotalCost ?? null}
                decimalPlaces={decimalPlaces}
                simpleMode={simpleMode}
                language={language}
              />
            )}

            {subTab === "dual" && (
              <div
                ref={dualRef}
                onPointerDown={onClearSpotlight}
                onClick={onClearSpotlight}
                className={cn(
                  "rounded-xl transition-shadow",
                  spotlightTarget === "dual" && "feature-spotlight-glow p-1.5",
                )}
              >
                <ShadowPriceTab
                  nutrients={result.nutrients}
                  allNutrients={nutrientsCatalog}
                  composition={result.composition}
                  opportunityCosts={result.opportunityCosts ?? []}
                  boundDuals={result.boundDuals ?? []}
                  ingredients={ingredients}
                  {...(requirement ? { requirement } : {})}
                  config={config}
                  decimalPlaces={decimalPlaces}
                  simpleMode={simpleMode}
                  language={language}
                />
              </div>
            )}

            {subTab === "whatif" && (
              <div
                ref={whatIfRef}
                onPointerDown={onClearSpotlight}
                onClick={onClearSpotlight}
                className={cn(
                  "rounded-xl transition-shadow",
                  spotlightTarget === "whatif" && "feature-spotlight-glow p-1.5",
                )}
              >
                <WhatIfManualLock
                  ingredients={ingredients}
                  composition={result.composition}
                  manualLocks={config.manualLocks ?? {}}
                  decimalPlaces={decimalPlaces}
                  onSetManualLock={onSetManualLock}
                  onClearLocks={onClearManualLocks}
                  language={language}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
});
