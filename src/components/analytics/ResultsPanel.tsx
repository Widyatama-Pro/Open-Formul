import { memo, useState } from "react";
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
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
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

export interface ResultsPanelProps {
  readonly result: FormulationResult;
  readonly ingredients: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly requirement?: Requirement;
  readonly config: FormulationConfig;
  readonly simpleMode?: boolean;
  readonly language?: AppLanguage;
  readonly hideKpiStrip?: boolean;
  readonly activeSubTab?: ResultSubTab;
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
  simpleMode = !config.enableAdvanceNutrients,
  language = "id",
  hideKpiStrip = false,
  activeSubTab,
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
  };

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
      className="flex h-full flex-col overflow-hidden"
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
                  "Aktifkan mode toleransi elastik saat target mustahil",
                  "Enable elastic relaxation mode when target is infeasible",
                )}
              />
              <span>{pickLang(language, "Relaksasi Elastik", "Elastic Relaxation")}</span>
            </label>
            {statusBadge}
          </div>
        </div>
      )}

      {result.status !== "infeasible" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
          <SegmentedTabs
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

      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
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
                  language={language}
                />

                {result.rumenEvaluation && (
                  <div className="glass-card rounded-xl p-3 text-xs">
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
                          {formatNumberLocale(result.rumenEvaluation.forageFractionPct, 1)}% /{" "}
                          {formatNumberLocale(result.rumenEvaluation.ndfPct, 1)}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          peuNDF240 / Est. DMI
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(result.rumenEvaluation.peuNdf240Pct, 1)}% /{" "}
                          {formatNumberLocale(result.rumenEvaluation.estimatedDmiPctBw, 2)}% BW
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
                simpleMode={simpleMode}
                language={language}
              />
            )}

            {subTab === "dual" && (
              <ShadowPriceTab
                nutrients={result.nutrients}
                allNutrients={nutrientsCatalog}
                composition={result.composition}
                opportunityCosts={result.opportunityCosts ?? []}
                boundDuals={result.boundDuals ?? []}
                ingredients={ingredients}
                {...(requirement ? { requirement } : {})}
                config={config}
                simpleMode={simpleMode}
                language={language}
              />
            )}

            {subTab === "whatif" && (
              <WhatIfManualLock
                ingredients={ingredients}
                composition={result.composition}
                manualLocks={config.manualLocks ?? {}}
                onSetManualLock={onSetManualLock}
                onClearLocks={onClearManualLocks}
                language={language}
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
});
