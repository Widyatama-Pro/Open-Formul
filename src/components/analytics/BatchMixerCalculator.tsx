import { useState } from "react";
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
  "bg-gradient-to-r from-[#0E7490] to-[#0891B2]",
  "bg-gradient-to-r from-[#10B981] to-[#059669]",
  "bg-gradient-to-r from-[#F59E0B] to-[#D97706]",
  "bg-gradient-to-r from-[#38BDF8] to-[#0284C7]",
  "bg-gradient-to-r from-[#F472B6] to-[#DB2777]",
  "bg-gradient-to-r from-[#818CF8] to-[#4F46E5]",
  "bg-gradient-to-r from-[#FB7185] to-[#E11D48]",
] as const;

export function BatchMixerCalculator({
  batchSizeKg,
  onSetBatchSize,
  composition,
  ingredients,
  activeBasis,
}: BatchMixerCalculatorProps) {
  const [printBatchOnly, setPrintBatchOnly] = useState(false);
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  return (
    <div className="space-y-4">
      {/* Kontrol ukuran adukan dalam wadah cekung neumorfik */}
      <div className="neu-well flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#122B36] dark:text-slate-200">
            Skala Adukan:
          </span>
          {PRESET_BATCH_KG.map((kg) => (
            <button
              key={kg}
              type="button"
              onClick={() => onSetBatchSize(kg)}
              className={cn(
                "min-h-8 cursor-pointer rounded-xl px-2.5 text-xs font-semibold tabular-nums transition-[transform,box-shadow,background-color,color] duration-150 active:scale-[0.96] motion-reduce:transform-none",
                batchSizeKg === kg
                  ? "neu-cta-btn text-white"
                  : "neu-pill-btn text-[#234350] dark:text-slate-200",
              )}
            >
              {formatNumberLocale(kg, 0)} kg
            </button>
          ))}
          <div className="w-24">
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

        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#375563] dark:text-slate-300">
          <input
            type="checkbox"
            checked={printBatchOnly}
            onChange={(e) => setPrintBatchOnly(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-[#0E7490]"
          />
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Mode Operator (Print Batch Only)</span>
        </label>
      </div>

      {/* Stacked composition bar bergaya track cekung */}
      {composition.length > 0 && (
        <div>
          <div className="mb-1.5 flex justify-between text-[11px] font-medium text-[#54707E] dark:text-slate-300">
            <span>Distribusi Komposisi (Total 100%)</span>
            {activeBasis === "dry_matter" && (
              <span>Tercantum juga berat segar As-Fed penimbangan</span>
            )}
          </div>
          <div className="neu-well flex h-3.5 w-full overflow-hidden rounded-full p-0.5">
            {composition.map((item, idx) => {
              const ing = ingMap.get(item.ingredientId);
              const color = BAR_COLORS[idx % BAR_COLORS.length]!;
              return (
                <div
                  key={item.ingredientId}
                  style={{ width: `${(item.fraction * 100).toFixed(2)}%` }}
                  title={`${ing?.name ?? item.ingredientId}: ${(item.fraction * 100).toFixed(2)}%`}
                  className={cn(
                    "h-full border-r border-white/50 first:rounded-l-full last:rounded-r-full last:border-r-0",
                    color,
                  )}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop Composition Table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-white/80 bg-white/65 backdrop-blur-xs md:block dark:border-cyan-200/10 dark:bg-[#0B2632]/70">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#EAF2F7]/90 text-[11px] font-bold tracking-wide text-[#466270] dark:bg-[#0D303E]/90 dark:text-cyan-100/85">
            <tr>
              <th className="px-3.5 py-2.5 text-left">Bahan Pakan</th>
              <th className="px-2 py-2.5 text-right">Porsi %</th>
              {activeBasis === "dry_matter" && <th className="px-2 py-2.5 text-right">As-Fed %</th>}
              <th className="px-2 py-2.5 text-right">Takaran (kg)</th>
              {!printBatchOnly && <th className="px-3.5 py-2.5 text-right">Kontribusi Biaya</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/65 dark:divide-cyan-200/10">
            {composition.map((item, idx) => {
              const ing = ingMap.get(item.ingredientId);
              const color = BAR_COLORS[idx % BAR_COLORS.length]!;
              const pct = item.fraction * 100;
              const weightKg = item.weightKg ?? item.fraction * batchSizeKg;
              return (
                <tr
                  key={item.ingredientId}
                  className="transition-colors hover:bg-white/70 dark:hover:bg-[#113A4A]/60"
                >
                  <td className="px-3.5 py-2 font-semibold text-[#122B36] dark:text-slate-100">
                    <span className={cn("mr-2 inline-block h-2.5 w-2.5 rounded-[4px]", color)} />
                    {ing?.name ?? item.ingredientId}
                  </td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">
                    {formatNumberLocale(pct, 2)}%
                  </td>
                  {activeBasis === "dry_matter" && (
                    <td className="px-2 py-2 text-right tabular-nums text-[#54707E] dark:text-slate-300">
                      {formatNumberLocale((item.asFedFraction ?? item.fraction) * 100, 2)}%
                    </td>
                  )}
                  <td className="px-2 py-2 text-right font-bold tabular-nums text-[#122B36] dark:text-white">
                    {formatNumberLocale(weightKg, 2)} kg
                  </td>
                  {!printBatchOnly && (
                    <td className="px-3.5 py-2 text-right tabular-nums text-[#375563] dark:text-slate-200">
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
            <div key={item.ingredientId} className="glass-card rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("h-3 w-3 shrink-0 rounded-[4px]", color)} />
                  <span className="truncate text-xs font-bold text-[#122B36] dark:text-white">
                    {ing?.name ?? item.ingredientId}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-[#122B36] dark:text-white">
                  {formatNumberLocale(pct, 2)}% · {formatNumberLocale(weightKg, 2)} kg
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-[#54707E] dark:text-slate-300">
                <span>
                  {activeBasis === "dry_matter"
                    ? `Segar As-Fed: ${formatNumberLocale((item.asFedFraction ?? item.fraction) * 100, 2)}%`
                    : `Kategori: ${ing?.category ?? "-"}`}
                </span>
                {!printBatchOnly ? (
                  <span className="font-semibold text-[#122B36] dark:text-slate-100">
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
}
