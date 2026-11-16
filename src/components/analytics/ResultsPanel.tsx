import { memo, useState } from "react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import type { FormulationConfig, FormulationResult, Ingredient, Nutrient } from "../../types";
import { formatCurrencyIdr } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { Switch } from "../ui/Switch";
import { BatchMixerCalculator } from "./BatchMixerCalculator";
import { ConflictDiagnosticsBanner } from "./ConflictDiagnosticsBanner";
import { FormulationCharts } from "./FormulationCharts";
import { ShadowPriceTab } from "./ShadowPriceTab";
import { WhatIfManualLock } from "./WhatIfManualLock";

export interface ResultsPanelProps {
  readonly result: FormulationResult;
  readonly ingredients: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly config: FormulationConfig;
  readonly hideKpiStrip?: boolean;
  readonly onSetBatchSize: (kg: number) => void;
  readonly onToggleElastic: (enabled: boolean) => void;
  readonly onSetManualLock: (id: string, pct: number | null) => void;
  readonly onClearManualLocks: () => void;
}

type ResultSubTab = "batch" | "charts" | "dual" | "whatif";

export const ResultsPanel = memo(function ResultsPanel({
  result,
  ingredients,
  allNutrients,
  config,
  hideKpiStrip = false,
  onSetBatchSize,
  onToggleElastic,
  onSetManualLock,
  onClearManualLocks,
}: ResultsPanelProps) {
  const [subTab, setSubTab] = useState<ResultSubTab>("batch");
  const nutrientsCatalog = allNutrients ?? [...MOCK_NUTRIENTS, ...(config.customNutrients ?? [])];

  const statusBadge =
    result.status === "optimal" ? (
      <Badge tone="emerald">Optimal</Badge>
    ) : result.status === "near_feasible" ? (
      <Badge tone="amber">Near-Feasible (Elastik)</Badge>
    ) : (
      <Badge tone="rose">Infeasible</Badge>
    );

  return (
    <Card
      interactive={false}
      highlight={result.status === "infeasible" ? "coral" : "none"}
      className="flex h-full flex-col overflow-hidden"
    >
      {!hideKpiStrip && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-2.5 dark:border-[#1E333D]">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="block text-[11px] font-semibold text-[#475569] dark:text-slate-300">
                Biaya / kg ({result.basis === "as_fed" ? "As-Fed" : "BK"})
              </span>
              <span className="text-base font-bold tracking-tight tabular-nums text-[#D97706] dark:text-amber-400">
                {result.costPerKg !== null ? formatCurrencyIdr(result.costPerKg) : "—"}
              </span>
            </div>

            <div className="border-l border-[#E2E8F0] pl-4 dark:border-[#1E333D]">
              <span className="block text-[11px] font-semibold text-[#475569] dark:text-slate-300">
                Biaya / {config.batchSizeKg} kg
              </span>
              <span className="text-base font-bold tracking-tight tabular-nums text-[#059669] dark:text-emerald-400">
                {result.batchTotalCost !== null && result.batchTotalCost !== undefined
                  ? formatCurrencyIdr(result.batchTotalCost)
                  : "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#475569] dark:text-slate-200">
              <Switch
                checked={config.enableElasticFallback}
                onCheckedChange={onToggleElastic}
                label="Aktifkan mode toleransi elastik saat target mustahil"
              />
              <span>Relaksasi Elastik</span>
            </label>
            {statusBadge}
          </div>
        </div>
      )}

      {result.status !== "infeasible" && (
        <div className="border-b border-[#E2E8F0] px-3 py-2 dark:border-[#1E333D]">
          <SegmentedTabs
            ariaLabel="Sub-tampilan hasil formulasi"
            value={subTab}
            onChange={setSubTab}
            options={[
              { value: "batch", label: "Komposisi & Batch", badge: result.composition.length },
              { value: "charts", label: "Grafik" },
              { value: "dual", label: "Shadow Price" },
              {
                value: "whatif",
                label: "What-If",
                badge: Object.keys(config.manualLocks ?? {}).length || undefined,
              },
            ]}
          />
        </div>
      )}

      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3.5">
        <ConflictDiagnosticsBanner
          status={result.status}
          conflicts={result.conflicts ?? []}
          messages={result.messages}
        />

        {result.status !== "infeasible" && (
          <>
            {subTab === "batch" && (
              <BatchMixerCalculator
                batchSizeKg={config.batchSizeKg}
                onSetBatchSize={onSetBatchSize}
                composition={result.composition}
                ingredients={ingredients}
                activeBasis={result.basis}
              />
            )}

            {subTab === "charts" && (
              <FormulationCharts
                composition={result.composition}
                nutrients={result.nutrients}
                allNutrients={nutrientsCatalog}
                ingredients={ingredients}
                batchTotalCost={result.batchTotalCost ?? null}
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
              />
            )}

            {subTab === "whatif" && (
              <WhatIfManualLock
                ingredients={ingredients}
                composition={result.composition}
                manualLocks={config.manualLocks ?? {}}
                onSetManualLock={onSetManualLock}
                onClearLocks={onClearManualLocks}
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
});
