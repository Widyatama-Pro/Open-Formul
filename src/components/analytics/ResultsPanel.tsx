import { useState } from "react";
import { Coins, Scale } from "lucide-react";
import type { FormulationConfig, FormulationResult, Ingredient } from "../../types";
import { formatCurrencyIdr } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
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
  readonly config: FormulationConfig;
  readonly onSetBatchSize: (kg: number) => void;
  readonly onToggleElastic: (enabled: boolean) => void;
  readonly onSetManualLock: (id: string, pct: number | null) => void;
  readonly onClearManualLocks: () => void;
}

type ResultSubTab = "batch" | "charts" | "dual" | "whatif";

export function ResultsPanel({
  result,
  ingredients,
  config,
  onSetBatchSize,
  onToggleElastic,
  onSetManualLock,
  onClearManualLocks,
}: ResultsPanelProps) {
  const [subTab, setSubTab] = useState<ResultSubTab>("batch");

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
      {/* Strip KPI Ringkas bergaya kartu hero kaca-neumorfik */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/65 px-4 py-3 dark:border-cyan-200/10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <GlossySquircleIcon tone="sky" size="sm" icon={<Coins className="h-4 w-4" />} />
            <div>
              <span className="block text-[11px] font-semibold text-[#54707E] dark:text-slate-300">
                Biaya / kg ({result.basis === "as_fed" ? "As-Fed" : "BK"})
              </span>
              <span className="text-lg font-bold tracking-tight tabular-nums text-[#122B36] dark:text-white">
                {result.costPerKg !== null ? formatCurrencyIdr(result.costPerKg) : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 border-l border-white/75 pl-4 dark:border-cyan-200/15">
            <GlossySquircleIcon tone="mint" size="sm" icon={<Scale className="h-4 w-4" />} />
            <div>
              <span className="block text-[11px] font-semibold text-[#54707E] dark:text-slate-300">
                Biaya / {config.batchSizeKg} kg
              </span>
              <span className="text-lg font-bold tracking-tight tabular-nums text-emerald-700 dark:text-emerald-300">
                {result.batchTotalCost !== null && result.batchTotalCost !== undefined
                  ? formatCurrencyIdr(result.batchTotalCost)
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#375563] dark:text-slate-200">
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

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <ConflictDiagnosticsBanner
          status={result.status}
          conflicts={result.conflicts ?? []}
          messages={result.messages}
        />

        {result.status !== "infeasible" && (
          <>
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
                ingredients={ingredients}
                batchTotalCost={result.batchTotalCost ?? null}
              />
            )}

            {subTab === "dual" && (
              <ShadowPriceTab
                nutrients={result.nutrients}
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
}
