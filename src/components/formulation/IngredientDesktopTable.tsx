import { memo, useState, type ClipboardEvent } from "react";
import { RotateCcw, Sliders } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import type { AppLanguage, Ingredient, IngredientCategory, Nutrient } from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr } from "../../utils/locale-number";
import { applyTsvGridPaste, type PasteColumnKey } from "../../utils/tsvPaste";
import { Badge } from "../ui/Badge";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientDesktopTableProps {
  readonly ingredients: readonly Ingredient[];
  readonly allIngredients?: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly showAdvanceColumns: boolean;
  readonly globalAntiNol: boolean;
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
  readonly onBatchIngredientsUpdate?: (nextAllIngredients: readonly Ingredient[]) => void;
}

const BASIC_NUTRIENT_IDS = new Set(["cp", "me_poultry", "tdn", "ee", "cf", "ca", "p"]);

const CATEGORY_DOT: Record<IngredientCategory, string> = {
  energy: "bg-gradient-to-br from-[#FFA27F] to-[#F26E58]",
  protein: "bg-gradient-to-br from-[#5BC8FF] to-[#0E74C9]",
  mineral: "bg-gradient-to-br from-[#9DA8FF] to-[#4745D6]",
  premix: "bg-gradient-to-br from-[#F69AD0] to-[#B83286]",
  forage: "bg-gradient-to-br from-[#43E6B5] to-[#04936E]",
  additive: "bg-gradient-to-br from-[#FCD35D] to-[#D97706]",
  enzyme: "bg-gradient-to-br from-[#22B8CF] to-[#0B4657]",
};

export const IngredientDesktopTable = memo(function IngredientDesktopTable({
  ingredients,
  allIngredients,
  allNutrients = MOCK_NUTRIENTS,
  showAdvanceColumns,
  globalAntiNol,
  language,
  onUpdateIngredient,
  onResetPriceOverride,
  onOpenDetail,
  onBatchIngredientsUpdate,
}: IngredientDesktopTableProps) {
  const [pasteNotice, setPasteNotice] = useState<{
    readonly text: string;
    readonly warnings: readonly string[];
  } | null>(null);

  const visibleNutrients: readonly Nutrient[] = allNutrients.filter(
    (n) => showAdvanceColumns || BASIC_NUTRIENT_IDS.has(n.id) || n.isCustom === true,
  );

  const orderedCols: PasteColumnKey[] = [
    "price",
    "dm",
    "min",
    "max",
    ...visibleNutrients.map((n) => n.id),
  ];

  const handleCellPaste =
    (startRowIdx: number, startColKey: PasteColumnKey) =>
    (event: ClipboardEvent<HTMLInputElement>) => {
      if (!onBatchIngredientsUpdate) return;
      const clipboardText =
        event.clipboardData.getData("text/plain") || event.clipboardData.getData("text") || "";
      if (!clipboardText) return;

      const outcome = applyTsvGridPaste({
        clipboardText,
        activeIngredients: ingredients,
        allIngredients: allIngredients ?? ingredients,
        orderedCols,
        startRowIdx,
        startColKey,
      });

      if (!outcome.isGrid) return;
      event.preventDefault();

      if (outcome.appliedCells > 0) {
        onBatchIngredientsUpdate(outcome.ingredients);
      }
      setPasteNotice({
        text: `${outcome.appliedCells} sel ditempel dari spreadsheet.`,
        warnings: outcome.warnings,
      });
    };

  return (
    <div className="flex h-full w-full flex-col gap-1.5">
      {pasteNotice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300/70 bg-emerald-50/90 px-3 py-1.5 text-[11px] font-medium text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-200"
        >
          <span>
            {pasteNotice.text}
            {pasteNotice.warnings.length > 0 ? ` (${pasteNotice.warnings.join(" ")})` : ""}
          </span>
          <button
            type="button"
            onClick={() => setPasteNotice(null)}
            className="cursor-pointer rounded px-1.5 py-0.5 font-semibold underline hover:opacity-80"
          >
            Tutup
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1 overflow-auto rounded-2xl border border-white/80 bg-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-sm dark:border-cyan-200/12 dark:bg-[#0B2632]/70">
        <table className="w-max min-w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 bg-[#EAF2F7]/95 text-[11px] font-bold tracking-wide text-[#466270] backdrop-blur-md dark:bg-[#0D303E]/95 dark:text-cyan-100/85">
            <tr>
              <th className="sticky left-0 z-30 w-11 border-r border-b border-white/75 bg-[#EAF2F7]/95 px-2 py-2.5 text-center dark:border-cyan-200/10 dark:bg-[#0D303E]/95">
                Aktif
              </th>
              <th className="sticky left-11 z-30 min-w-46 border-r border-b border-white/75 bg-[#EAF2F7]/95 px-3 py-2.5 dark:border-cyan-200/10 dark:bg-[#0D303E]/95">
                {language === "id" ? "Nama Bahan" : "Ingredient"}
              </th>
              <th className="min-w-28 border-b border-white/75 px-2 py-2.5 text-right dark:border-cyan-200/10">
                Harga/kg
              </th>
              <th className="w-20 border-b border-white/75 px-2 py-2.5 text-right dark:border-cyan-200/10">
                BK %
              </th>
              <th className="w-20 border-b border-white/75 px-2 py-2.5 text-right dark:border-cyan-200/10">
                Min %
              </th>
              <th className="w-20 border-b border-white/75 px-2 py-2.5 text-right dark:border-cyan-200/10">
                Max %
              </th>
              <th className="w-16 border-b border-white/75 px-2 py-2.5 text-center dark:border-cyan-200/10">
                Anti-0
              </th>
              {visibleNutrients.map((nut) => (
                <th
                  key={nut.id}
                  className="min-w-22 border-b border-white/75 px-2 py-2.5 text-right whitespace-nowrap dark:border-cyan-200/10"
                >
                  <div>{language === "id" ? nut.name : (nut.nameEn ?? nut.name)}</div>
                  <div className="text-[10px] font-medium lowercase text-[#6C8693] dark:text-slate-400">
                    {nut.unit}
                  </div>
                </th>
              ))}
              <th className="w-12 border-b border-white/75 px-2 py-2.5 text-center dark:border-cyan-200/10">
                Detail
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/65 dark:divide-cyan-200/10">
            {ingredients.map((ing, rowIdx) => {
              const isActive = ing.isActive !== false;
              const min = ing.inclusion?.min ?? 0;
              const max = ing.inclusion?.max ?? 100;
              const invalidBounds = min > max;
              const hasOverride = ing.priceOverride !== undefined;
              const effectiveAntiNol = ing.zeroInclusionRule?.enforceNonZero ?? globalAntiNol;

              return (
                <tr
                  key={ing.id}
                  className={cn(
                    "transition-colors duration-150 hover:bg-white/70 dark:hover:bg-[#113A4A]/60",
                    !isActive && "opacity-55",
                  )}
                >
                  <td className="sticky left-0 z-10 border-r border-white/70 bg-white/85 px-2 py-2 text-center backdrop-blur-xs dark:border-cyan-200/10 dark:bg-[#0D2E3B]/90">
                    <input
                      type="checkbox"
                      checked={isActive}
                      aria-label={`Aktifkan ${ing.name}`}
                      onChange={(e) => onUpdateIngredient(ing.id, { isActive: e.target.checked })}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#0E7490]"
                    />
                  </td>

                  <td className="sticky left-11 z-10 border-r border-white/70 bg-white/85 px-3 py-2 backdrop-blur-xs dark:border-cyan-200/10 dark:bg-[#0D2E3B]/90">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-[4px] shadow-xs",
                            CATEGORY_DOT[ing.category],
                          )}
                        />
                        <span className="truncate font-semibold text-[#122B36] dark:text-slate-100">
                          {language === "id" ? ing.name : (ing.nameEn ?? ing.name)}
                        </span>
                      </div>
                      <Badge tone={ing.basis === "as_fed" ? "neutral" : "emerald"}>
                        {ing.basis === "as_fed" ? "AF" : "BK"}
                      </Badge>
                    </div>
                  </td>

                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <NumericCellInput
                        value={ing.priceOverride ?? ing.pricePerKg}
                        treatSingleThousandDot
                        fractionDigits={0}
                        gridRow={rowIdx}
                        gridCol="price"
                        onPaste={handleCellPaste(rowIdx, "price")}
                        ariaLabel={`Harga/kg ${ing.name}`}
                        className={cn(
                          hasOverride &&
                            "border-amber-400/80 bg-amber-50/75 dark:border-amber-500/70 dark:bg-amber-950/30",
                        )}
                        onCommit={(next) => {
                          if (next === null) return;
                          if (Math.abs(next - ing.pricePerKg) < 0.01) {
                            onResetPriceOverride(ing.id);
                          } else {
                            onUpdateIngredient(ing.id, { priceOverride: next });
                          }
                        }}
                      />
                      {hasOverride && (
                        <button
                          type="button"
                          onClick={() => onResetPriceOverride(ing.id)}
                          title={`Reset ke harga pasar (${formatCurrencyIdr(ing.pricePerKg)})`}
                          aria-label={`Reset harga pasar ${ing.name}`}
                          className="neu-pill-btn cursor-pointer rounded-lg p-1 text-amber-700 dark:text-amber-300"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-2 py-1.5">
                    <NumericCellInput
                      value={ing.dryMatter}
                      fractionDigits={1}
                      gridRow={rowIdx}
                      gridCol="dm"
                      onPaste={handleCellPaste(rowIdx, "dm")}
                      invalid={ing.dryMatter <= 0 || ing.dryMatter > 100}
                      errorTooltip="BK harus antara > 0 dan 100%"
                      ariaLabel={`BK % ${ing.name}`}
                      onCommit={(next) => {
                        if (next !== null && next > 0 && next <= 100) {
                          onUpdateIngredient(ing.id, { dryMatter: next });
                        }
                      }}
                    />
                  </td>

                  <td className="px-2 py-1.5">
                    <NumericCellInput
                      value={min}
                      fractionDigits={1}
                      gridRow={rowIdx}
                      gridCol="min"
                      onPaste={handleCellPaste(rowIdx, "min")}
                      invalid={invalidBounds}
                      errorTooltip={`Min (${min}%) > Max (${max}%)`}
                      ariaLabel={`Min % ${ing.name}`}
                      onCommit={(next) =>
                        onUpdateIngredient(ing.id, {
                          inclusion: { ...ing.inclusion, min: next ?? 0 },
                        })
                      }
                    />
                  </td>

                  <td className="px-2 py-1.5">
                    <NumericCellInput
                      value={max}
                      fractionDigits={1}
                      gridRow={rowIdx}
                      gridCol="max"
                      onPaste={handleCellPaste(rowIdx, "max")}
                      invalid={invalidBounds}
                      errorTooltip={`Max (${max}%) < Min (${min}%)`}
                      ariaLabel={`Max % ${ing.name}`}
                      onCommit={(next) =>
                        onUpdateIngredient(ing.id, {
                          inclusion: { ...ing.inclusion, max: next ?? 100 },
                        })
                      }
                    />
                  </td>

                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={effectiveAntiNol}
                      aria-label={`Aturan Anti-Nol ${ing.name}`}
                      onChange={(e) =>
                        onUpdateIngredient(ing.id, {
                          zeroInclusionRule: {
                            enforceNonZero: e.target.checked,
                            minIfSelected: ing.zeroInclusionRule?.minIfSelected ?? 1,
                          },
                        })
                      }
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#0E7490]"
                    />
                  </td>

                  {visibleNutrients.map((nut) => {
                    const val = ing.nutrients[nut.id];
                    const isNull = val === null || val === undefined;
                    return (
                      <td key={nut.id} className="px-2 py-1.5">
                        <NumericCellInput
                          value={val ?? null}
                          allowNull
                          fractionDigits={nut.unit === "kcal/kg" ? 0 : 2}
                          gridRow={rowIdx}
                          gridCol={nut.id}
                          onPaste={handleCellPaste(rowIdx, nut.id)}
                          placeholder="N/A"
                          ariaLabel={`${nut.name} ${ing.name}`}
                          className={cn(
                            isNull &&
                              "border-dashed border-amber-400/70 bg-amber-50/45 dark:border-amber-700/70 dark:bg-amber-950/20",
                          )}
                          onCommit={(next) =>
                            onUpdateIngredient(ing.id, {
                              nutrients: { ...ing.nutrients, [nut.id]: next },
                            })
                          }
                        />
                      </td>
                    );
                  })}

                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(ing)}
                      aria-label={`Edit detail ${ing.name}`}
                      className="neu-pill-btn inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#466270] dark:text-slate-200"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
