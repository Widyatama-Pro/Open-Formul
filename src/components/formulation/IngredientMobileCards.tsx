import { memo } from "react";
import { ChevronRight, Leaf, Pill, RotateCcw, Sparkles, Wheat } from "lucide-react";
import { getCategoryLabel, pickLang } from "../../i18n";
import type { AppLanguage, Ingredient, IngredientCategory } from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon, type SquircleTone } from "../ui/GlossySquircleIcon";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientMobileCardsProps {
  readonly ingredients: readonly Ingredient[];
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
}

const CATEGORY_TONE: Record<IngredientCategory, SquircleTone> = {
  energy: "coral",
  protein: "sky",
  mineral: "indigo",
  premix: "orchid",
  forage: "mint",
  additive: "amber",
  enzyme: "petrol",
};

function renderCategoryIcon(category: IngredientCategory) {
  switch (category) {
    case "forage":
      return <Leaf className="h-4 w-4" />;
    case "mineral":
    case "premix":
      return <Pill className="h-4 w-4" />;
    case "additive":
    case "enzyme":
      return <Sparkles className="h-4 w-4" />;
    default:
      return <Wheat className="h-4 w-4" />;
  }
}

/**
 * Transformasi tabel matriks bahan untuk layar sempit (<768px):
 * Card-Stack Tactile Neumorphism dengan ikon squircle kategori & sorotan aksen bahaya saat bentrok batas.
 */
export const IngredientMobileCards = memo(function IngredientMobileCards({
  ingredients,
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
        const meLabel =
          ing.nutrients.me_poultry !== null && ing.nutrients.me_poultry !== undefined
            ? `ME ${formatNumberLocale(ing.nutrients.me_poultry, 0)}`
            : me !== null && me !== undefined
              ? `TDN ${formatNumberLocale(me, 1)}%`
              : pickLang(language, "Energi N/A", "Energy N/A");
        const ingName = language === "id" ? ing.name : (ing.nameEn ?? ing.name);

        return (
          <Card
            key={ing.id}
            highlight={invalidBounds ? "coral" : hasOverride ? "amber" : "none"}
            className={cn("p-3.5", !isActive && "opacity-60")}
          >
            {/* Baris 1: Squircle Kategori, Toggle Aktif, Nama & Akses Detail */}
            <div className="flex items-start justify-between gap-2">
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isActive}
                  aria-label={`Aktifkan ${ing.name}`}
                  onChange={(e) => onUpdateIngredient(ing.id, { isActive: e.target.checked })}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                />
                <GlossySquircleIcon
                  tone={CATEGORY_TONE[ing.category]}
                  size="sm"
                  icon={renderCategoryIcon(ing.category)}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">{ingName}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">{getCategoryLabel(language, ing.category)}</Badge>
                    <Badge tone={ing.basis === "as_fed" ? "sky" : "emerald"}>
                      {ing.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")}
                    </Badge>
                    {hasOverride && (
                      <Badge tone="amber">
                        {pickLang(language, "Harga Custom", "Custom Price")}
                      </Badge>
                    )}
                  </div>
                </div>
              </label>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenDetail(ing)}
                aria-label={`Edit nutrien ${ing.name}`}
                className="neu-pill-btn shrink-0 rounded-xl"
              >
                <span>{pickLang(language, "Nutrien", "Nutrients")}</span>
                <ChevronRight className="h-4 w-4" />
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
                  fractionDigits={1}
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
                  fractionDigits={1}
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

            {/* Baris 3: Ringkasan 3 nutrien kunci tabular */}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-2.5 text-[11px] tabular-nums text-[var(--text-secondary)]">
              <span>
                {pickLang(language, "PK", "CP")}:{" "}
                <strong className="text-[var(--text-primary)]">
                  {cp !== null && cp !== undefined ? `${formatNumberLocale(cp, 1)}%` : "N/A"}
                </strong>
              </span>
              <span>{meLabel}</span>
              <span>
                {pickLang(language, "BK", "DM")}: {formatNumberLocale(ing.dryMatter, 0)}%
              </span>
              <span className="ml-auto text-[var(--text-muted)]">
                {pickLang(language, "Pasar", "Market")}: {formatCurrencyIdr(ing.pricePerKg)}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
});
