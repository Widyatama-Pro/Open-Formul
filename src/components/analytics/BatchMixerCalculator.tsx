import { memo, useState } from "react";
import { EyeOff } from "lucide-react";
import { getCategoryLabel, pickLang } from "../../i18n";
import type { AppLanguage, Basis, CompositionItem, Ingredient } from "../../types";
import { cn } from "../../utils/cn";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { NumericCellInput } from "../formulation/NumericCellInput";
import { Badge } from "../ui/Badge";

export interface BatchMixerCalculatorProps {
  readonly batchSizeKg: number;
  readonly onSetBatchSize: (kg: number) => void;
  readonly composition: readonly CompositionItem[];
  readonly ingredients: readonly Ingredient[];
  readonly activeBasis: Basis;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly language?: AppLanguage;
}

const PRESET_BATCH_KG = [50, 100, 500, 1000] as const;

const BAR_COLORS = [
  "bg-[var(--chart-series-1)]",
  "bg-[var(--chart-series-2)]",
  "bg-[var(--chart-series-3)]",
  "bg-[var(--chart-series-4)]",
  "bg-[var(--chart-series-5)]",
  "bg-[var(--chart-series-6)]",
  "bg-[var(--chart-series-7)]",
] as const;

export const BatchMixerCalculator = memo(function BatchMixerCalculator({
  batchSizeKg,
  onSetBatchSize,
  composition,
  ingredients,
  activeBasis,
  decimalPlaces = 0,
  language = "id",
}: BatchMixerCalculatorProps) {
  const [printBatchOnly, setPrintBatchOnly] = useState(false);
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  return (
    <div className="space-y-3">
      {/* Kontrol ukuran adukan dalam wadah ringkas (stack rapi pada HP, 1 baris di layar lebar) */}
      <div className="neu-well flex flex-col gap-2 rounded-xl p-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="shrink-0 text-xs font-semibold text-[var(--text-primary)]">
            {pickLang(language, "Skala Adukan:", "Batch Size:")}
          </span>
          {PRESET_BATCH_KG.map((kg) => (
            <button
              key={kg}
              type="button"
              onClick={() => onSetBatchSize(kg)}
              className={cn(
                "min-h-7 shrink-0 cursor-pointer rounded-lg px-2.5 text-xs font-semibold tabular-nums transition-[transform,background-color,color] duration-150 active:scale-[0.96] motion-reduce:transform-none",
                batchSizeKg === kg ? "neu-cta-btn" : "neu-pill-btn text-[var(--text-primary)]",
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
              ariaLabel={pickLang(language, "Total berat adukan kg", "Total batch weight kg")}
              onCommit={(val) => {
                if (val !== null && val >= 1) onSetBatchSize(val);
              }}
            />
          </div>
        </div>

        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={printBatchOnly}
            onChange={(e) => setPrintBatchOnly(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
          />
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {pickLang(
              language,
              "Mode Operator (Print Batch Only)",
              "Operator Mode (Print Batch Only)",
            )}
          </span>
        </label>
      </div>

      {/* Stacked composition bar */}
      {composition.length > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-medium text-[var(--text-secondary)]">
            <span>
              {pickLang(
                language,
                "Distribusi Komposisi (Total 100%)",
                "Composition Breakdown (Total 100%)",
              )}
            </span>
            {activeBasis === "dry_matter" && (
              <span>
                {pickLang(
                  language,
                  "Tercantum juga berat segar As-Fed penimbangan",
                  "Includes As-Fed fresh weighing proportions",
                )}
              </span>
            )}
          </div>
          <div className="neu-well flex h-2 w-full overflow-hidden rounded-full p-0.5">
            {composition.map((item, idx) => {
              const ing = ingMap.get(item.ingredientId);
              const color = BAR_COLORS[idx % BAR_COLORS.length]!;
              const ingName = ing
                ? language === "id"
                  ? ing.name
                  : (ing.nameEn ?? ing.name)
                : item.ingredientId;
              return (
                <div
                  key={item.ingredientId}
                  style={{ width: `${(item.fraction * 100).toFixed(2)}%` }}
                  title={`${ingName}: ${(item.fraction * 100).toFixed(2)}%`}
                  className={cn(
                    "h-full border-r border-[var(--bg-surface-elevated)] first:rounded-l-full last:rounded-r-full last:border-r-0",
                    color,
                  )}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop Composition Table */}
      <div className="hidden overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] md:block">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[var(--bg-sunken)] text-[11px] font-bold tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2 text-left">
                {pickLang(language, "Bahan Pakan", "Feed Ingredient")}
              </th>
              <th className="px-2 py-2 text-right">{pickLang(language, "Porsi %", "Share %")}</th>
              {activeBasis === "dry_matter" && <th className="px-2 py-2 text-right">As-Fed %</th>}
              <th className="px-2 py-2 text-right">
                {pickLang(language, "Takaran (kg)", "Weight (kg)")}
              </th>
              {!printBatchOnly && (
                <th className="px-3 py-2 text-right">
                  {pickLang(language, "Kontribusi Biaya (/kg)", "Cost Contribution (/kg)")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {composition.map((item, idx) => {
              const ing = ingMap.get(item.ingredientId);
              const color = BAR_COLORS[idx % BAR_COLORS.length]!;
              const pct = item.fraction * 100;
              const afPct = (item.asFedFraction ?? item.fraction) * 100;
              const weightKg = item.weightKg ?? item.fraction * batchSizeKg;
              const pctDigits = resolveDisplayDigits("%", "inclusion", decimalPlaces, pct);
              const afDigits = resolveDisplayDigits("%", "inclusion", decimalPlaces, afPct);
              const wtDigits = resolveDisplayDigits("%", "ca", decimalPlaces, weightKg);
              const ingName = ing
                ? language === "id"
                  ? ing.name
                  : (ing.nameEn ?? ing.name)
                : item.ingredientId;
              return (
                <tr
                  key={item.ingredientId}
                  className="transition-colors hover:bg-[var(--bg-surface)]"
                >
                  <td className="px-3 py-1.5 font-semibold text-[var(--text-primary)]">
                    <span className={cn("mr-2 inline-block h-2.5 w-2.5 rounded-xs", color)} />
                    {ingName}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-[var(--status-success)]">
                    {formatNumberLocale(pct, pctDigits)}%
                  </td>
                  {activeBasis === "dry_matter" && (
                    <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                      {formatNumberLocale(afPct, afDigits)}%
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[var(--text-primary)]">
                    {formatNumberLocale(weightKg, wtDigits)} kg
                  </td>
                  {!printBatchOnly && (
                    <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
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
          const afPct = (item.asFedFraction ?? item.fraction) * 100;
          const weightKg = item.weightKg ?? item.fraction * batchSizeKg;
          const pctDigits = resolveDisplayDigits("%", "inclusion", decimalPlaces, pct);
          const afDigits = resolveDisplayDigits("%", "inclusion", decimalPlaces, afPct);
          const wtDigits = resolveDisplayDigits("%", "ca", decimalPlaces, weightKg);
          const ingName = ing
            ? language === "id"
              ? ing.name
              : (ing.nameEn ?? ing.name)
            : item.ingredientId;
          return (
            <div key={item.ingredientId} className="glass-card rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("h-3 w-3 shrink-0 rounded-xs", color)} />
                  <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                    {ingName}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--status-success)]">
                  {formatNumberLocale(pct, pctDigits)}% · {formatNumberLocale(weightKg, wtDigits)}{" "}
                  kg
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-[var(--text-secondary)]">
                <span>
                  {activeBasis === "dry_matter"
                    ? `${pickLang(language, "Segar As-Fed:", "Fresh As-Fed:")} ${formatNumberLocale(afPct, afDigits)}%`
                    : `${pickLang(language, "Kategori:", "Category:")} ${ing ? getCategoryLabel(language, ing.category) : "-"}`}
                </span>
                {!printBatchOnly ? (
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatCurrencyIdr(item.costContribution ?? 0)}
                  </span>
                ) : (
                  <Badge tone="neutral">
                    {pickLang(language, "Biaya disembunyikan", "Cost hidden")}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
