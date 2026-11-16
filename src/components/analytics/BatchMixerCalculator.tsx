import { memo, useState } from "react";
import { EyeOff } from "lucide-react";
import type { Basis, CompositionItem, Ingredient } from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { NumericCellInput } from "../formulation/NumericCellInput";
import { Badge } from "../ui/Badge";

export interface BatchMixerCalculatorProps {
  readonly batchSizeKg: number;
  readonly onSetBatchSize: (kg: number) => void;
  readonly composition: readonly CompositionItem[];
  readonly ingredients: readonly Ingredient[];
  readonly activeBasis: Basis;
}

const PRESET_BATCH_KG = [50, 100, 500, 1000] as const;

const BAR_COLORS = [
  "bg-[#059669]",
  "bg-[#0F3D3E]",
  "bg-[#D97706]",
  "bg-[#0284C7]",
  "bg-[#6366F1]",
  "bg-[#EA580C]",
  "bg-[#0D9488]",
] as const;

export const BatchMixerCalculator = memo(function BatchMixerCalculator({
  batchSizeKg,
  onSetBatchSize,
  composition,
  ingredients,
  activeBasis,
}: BatchMixerCalculatorProps) {
  const [printBatchOnly, setPrintBatchOnly] = useState(false);
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  return (
    <div className="space-y-3">
      {/* Kontrol ukuran adukan dalam wadah ringkas */}
      <div className="neu-well flex flex-wrap items-center justify-between gap-2.5 rounded-xl p-2.5">
        <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
          <span className="shrink-0 text-xs font-semibold text-[#0F172A] dark:text-slate-200">
            Skala Adukan:
          </span>
          {PRESET_BATCH_KG.map((kg) => (
            <button
              key={kg}
              type="button"
              onClick={() => onSetBatchSize(kg)}
              className={cn(
                "min-h-7 shrink-0 cursor-pointer rounded-lg px-2.5 text-xs font-semibold tabular-nums transition-[transform,background-color,color] duration-150 active:scale-[0.96] motion-reduce:transform-none",
                batchSizeKg === kg
                  ? "neu-cta-btn text-white"
                  : "neu-pill-btn text-[#0F172A] dark:text-slate-200",
              )}
            >
              {formatNumberLocale(kg, 0)} kg
            </button>
          ))}
          <div className="w-22 shrink-0">
            <NumericCellInput
              value={batchSizeKg}
              treatSingleThousandDot
              fractionDigits={0}
              ariaLabel="Total berat adukan kg"
              onCommit={(val) => {
                if (val !== null && val >= 1) onSetBatchSize(val);
              }}
            />
          </div>
        </div>

        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-[#475569] dark:text-slate-300">
          <input
            type="checkbox"
            checked={printBatchOnly}
            onChange={(e) => setPrintBatchOnly(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-[#059669]"
          />
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Mode Operator (Print Batch Only)</span>
        </label>
      </div>

      {/* Stacked composition bar */}
      {composition.length > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-medium text-[#475569] dark:text-slate-300">
            <span>Distribusi Komposisi (Total 100%)</span>
            {activeBasis === "dry_matter" && (
              <span>Tercantum juga berat segar As-Fed penimbangan</span>
            )}
          </div>
          <div className="neu-well flex h-3 w-full overflow-hidden rounded-full p-0.5">
            {composition.map((item, idx) => {
              const ing = ingMap.get(item.ingredientId);
              const color = BAR_COLORS[idx % BAR_COLORS.length]!;
              return (
                <div
                  key={item.ingredientId}
                  style={{ width: `${(item.fraction * 100).toFixed(2)}%` }}
                  title={`${ing?.name ?? item.ingredientId}: ${(item.fraction * 100).toFixed(2)}%`}
                  className={cn(
                    "h-full border-r border-white/60 first:rounded-l-full last:rounded-r-full last:border-r-0",
                    color,
                  )}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop Composition Table */}
      <div className="hidden overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white md:block dark:border-[#1E333D] dark:bg-[#111F26]">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#F1F5F9] text-[11px] font-bold tracking-wide text-[#475569] dark:bg-[#162831] dark:text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Bahan Pakan</th>
              <th className="px-2 py-2 text-right">Porsi %</th>
              {activeBasis === "dry_matter" && <th className="px-2 py-2 text-right">As-Fed %</th>}
              <th className="px-2 py-2 text-right">Takaran (kg)</th>
              {!printBatchOnly && <th className="px-3 py-2 text-right">Kontribusi Biaya</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E333D]">
            {composition.map((item, idx) => {
              const ing = ingMap.get(item.ingredientId);
              const color = BAR_COLORS[idx % BAR_COLORS.length]!;
              const pct = item.fraction * 100;
              const weightKg = item.weightKg ?? item.fraction * batchSizeKg;
              return (
                <tr
                  key={item.ingredientId}
                  className="transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#162831]"
                >
                  <td className="px-3 py-1.5 font-semibold text-[#0F172A] dark:text-slate-100">
                    <span className={cn("mr-2 inline-block h-2.5 w-2.5 rounded-xs", color)} />
                    {ing?.name ?? item.ingredientId}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-[#059669] dark:text-emerald-400">
                    {formatNumberLocale(pct, 2)}%
                  </td>
                  {activeBasis === "dry_matter" && (
                    <td className="px-2 py-1.5 text-right tabular-nums text-[#475569] dark:text-slate-300">
                      {formatNumberLocale((item.asFedFraction ?? item.fraction) * 100, 2)}%
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#0F172A] dark:text-white">
                    {formatNumberLocale(weightKg, 2)} kg
                  </td>
                  {!printBatchOnly && (
                    <td className="px-3 py-1.5 text-right tabular-nums text-[#475569] dark:text-slate-200">
                      {formatCurrencyIdr(item.costContribution ?? 0)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile 2-line Composition Cards */}
      <div className="space-y-2 md:hidden">
        {composition.map((item, idx) => {
          const ing = ingMap.get(item.ingredientId);
          const color = BAR_COLORS[idx % BAR_COLORS.length]!;
          const pct = item.fraction * 100;
          const weightKg = item.weightKg ?? item.fraction * batchSizeKg;
          return (
            <div key={item.ingredientId} className="glass-card rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("h-3 w-3 shrink-0 rounded-xs", color)} />
                  <span className="truncate text-xs font-bold text-[#0F172A] dark:text-white">
                    {ing?.name ?? item.ingredientId}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-[#059669] dark:text-emerald-400">
                  {formatNumberLocale(pct, 2)}% · {formatNumberLocale(weightKg, 2)} kg
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-[#475569] dark:text-slate-300">
                <span>
                  {activeBasis === "dry_matter"
                    ? `Segar As-Fed: ${formatNumberLocale((item.asFedFraction ?? item.fraction) * 100, 2)}%`
                    : `Kategori: ${ing?.category ?? "-"}`}
                </span>
                {!printBatchOnly ? (
                  <span className="font-semibold text-[#0F172A] dark:text-slate-100">
                    {formatCurrencyIdr(item.costContribution ?? 0)}
                  </span>
                ) : (
                  <Badge tone="neutral">Biaya disembunyikan</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
