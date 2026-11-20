import { memo } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import { resolveFeedClass } from "../../data/feed-classes";
import { getCategoryLabel, pickLang } from "../../i18n";
import type { AppLanguage, Ingredient } from "../../types";
import { cn } from "../../utils/cn";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FeedClassIcon } from "../ui/FeedClassIcon";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientMobileCardsProps {
  readonly ingredients: readonly Ingredient[];
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
}

/**
 * Transformasi tabel matriks bahan untuk layar sempit (<768px):
 * - Nama bahan pakan tampil penuh hingga 2 baris (line-clamp-2) tanpa terjepit tombol Nutrien >
 * - Tombol Nutrien > ditempatkan di baris kedua sejajar badge kategori & basis
 * - Metadata bawah (PK | EM/TDN | BK | Pasar) berukuran 12px kontras jelas
 */
export const IngredientMobileCards = memo(function IngredientMobileCards({
  ingredients,
  decimalPlaces = 0,
  language,
  onUpdateIngredient,
  onResetPriceOverride,
  onOpenDetail,
}: IngredientMobileCardsProps) {
  return (
    <div className="space-y-3">
      {ingredients.map((ing) => {
        const isActive = ing.isActive !== false;
        const min = ing.inclusion?.min ?? 0;
        const max = ing.inclusion?.max ?? 100;
        const invalidBounds = min > max;
        const hasOverride = ing.priceOverride !== undefined;
        const cp = ing.nutrients.cp;
        const me = ing.nutrients.me_poultry ?? ing.nutrients.tdn;
        const feedClass = resolveFeedClass(ing);
        const meLabel =
          ing.nutrients.me_poultry !== null && ing.nutrients.me_poultry !== undefined
            ? `EM ${formatNumberLocale(ing.nutrients.me_poultry, 0)}`
            : me !== null && me !== undefined
              ? `TDN ${formatNumberLocale(me, resolveDisplayDigits("%", "tdn", decimalPlaces, me))}%`
              : pickLang(language, "Energi N/A", "Energy N/A");
        const ingName = language === "id" ? ing.name : (ing.nameEn ?? ing.name);

        return (
          <Card
            key={ing.id}
            highlight={invalidBounds ? "coral" : hasOverride ? "amber" : "none"}
            className={cn("p-3.5", !isActive && "opacity-60")}
          >
            {/* Baris 1A: Checkbox + Ikon Kelas Kontekstual + Judul Nama Bahan Penuh (max 2 baris) */}
            <label className="flex min-h-9 min-w-0 cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={isActive}
                aria-label={`Aktifkan ${ing.name}`}
                onChange={(e) => onUpdateIngredient(ing.id, { isActive: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
              />
              <FeedClassIcon
                code={feedClass}
                language={language}
                className="mt-0.5 h-6 w-6 rounded-lg"
              />
              <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-bold text-[var(--text-primary)]">
                {ingName}
              </p>
            </label>

            {/* Baris 1B: Badge Kategori / Basis sejajar dengan tombol Nutrien > di kanan */}
            <div className="mt-2 flex items-center justify-between gap-2 pl-7">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Badge tone="neutral">{getCategoryLabel(language, ing.category)}</Badge>
                <Badge tone={ing.basis === "as_fed" ? "sky" : "emerald"}>
                  {ing.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")}
                </Badge>
                {hasOverride && (
                  <Badge tone="amber">{pickLang(language, "Harga Custom", "Custom Price")}</Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenDetail(ing)}
                aria-label={`Edit nutrien ${ing.name}`}
                className="neu-pill-btn min-h-8 shrink-0 rounded-lg px-2.5 text-xs md:min-h-8"
              >
                <span>{pickLang(language, "Nutrien", "Nutrients")}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Baris 2: Input Cepat Harga, Min%, Max% */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    {pickLang(language, "Harga/kg", "Price/kg")}
                  </span>
                  {hasOverride && (
                    <button
                      type="button"
                      onClick={() => onResetPriceOverride(ing.id)}
                      aria-label={`Reset harga pasar ${ing.name}`}
                      className="cursor-pointer text-[var(--status-warning)]"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <NumericCellInput
                  value={ing.priceOverride ?? ing.pricePerKg}
                  treatSingleThousandDot
                  fractionDigits={0}
                  ariaLabel={`Harga ${ing.name}`}
                  onCommit={(next) => {
                    if (next === null) return;
                    if (Math.abs(next - ing.pricePerKg) < 0.01) {
                      onResetPriceOverride(ing.id);
                    } else {
                      onUpdateIngredient(ing.id, { priceOverride: next });
                    }
                  }}
                />
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">
                  Min %
                </span>
                <NumericCellInput
                  value={min}
                  fractionDigits={resolveDisplayDigits("%", "inclusion", decimalPlaces, min)}
                  invalid={invalidBounds}
                  ariaLabel={`Min % ${ing.name}`}
                  onCommit={(next) =>
                    onUpdateIngredient(ing.id, {
                      inclusion: { ...ing.inclusion, min: next ?? 0 },
                    })
                  }
                />
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">
                  Max %
                </span>
                <NumericCellInput
                  value={max}
                  fractionDigits={resolveDisplayDigits("%", "inclusion", decimalPlaces, max)}
                  invalid={invalidBounds}
                  ariaLabel={`Max % ${ing.name}`}
                  onCommit={(next) =>
                    onUpdateIngredient(ing.id, {
                      inclusion: { ...ing.inclusion, max: next ?? 100 },
                    })
                  }
                />
              </div>
            </div>

            {invalidBounds && (
              <p className="mt-2 text-xs font-semibold text-[var(--status-danger)]">
                {pickLang(
                  language,
                  `Nilai Min (${min}%) tidak boleh melebihi Max (${max}%).`,
                  `Min (${min}%) cannot exceed Max (${max}%).`,
                )}
              </p>
            )}

            {/* Baris 3: Ringkasan metadata nutrisi 12px kontras tinggi */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border-subtle)] pt-2.5 text-xs tabular-nums text-[var(--text-secondary)]">
              <span>
                {pickLang(language, "PK", "CP")}:{" "}
                <strong className="font-bold text-[var(--text-primary)]">
                  {cp !== null && cp !== undefined
                    ? `${formatNumberLocale(cp, resolveDisplayDigits("%", "cp", decimalPlaces, cp))}%`
                    : "N/A"}
                </strong>
              </span>
              <span className="font-medium text-[var(--text-primary)]">{meLabel}</span>
              <span>
                {pickLang(language, "BK", "DM")}:{" "}
                <strong className="font-semibold text-[var(--text-primary)]">
                  {formatNumberLocale(
                    ing.dryMatter,
                    resolveDisplayDigits("%", "dm", decimalPlaces, ing.dryMatter),
                  )}
                  %
                </strong>
              </span>
              <span className="ml-auto font-medium text-[var(--text-secondary)]">
                {pickLang(language, "Pasar", "Market")}:{" "}
                <strong className="font-semibold text-[var(--text-primary)]">
                  {formatCurrencyIdr(ing.pricePerKg)}
                </strong>
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
});
