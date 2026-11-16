import { memo, useCallback, useMemo, useState, type ClipboardEvent } from "react";
import { RotateCcw, Sliders } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import type {
  AppLanguage,
  CompositionItem,
  Ingredient,
  IngredientCategory,
  Nutrient,
} from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { applyTsvGridPaste, type PasteColumnKey } from "../../utils/tsvPaste";
import { Badge } from "../ui/Badge";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientDesktopTableProps {
  readonly ingredients: readonly Ingredient[];
  readonly allIngredients?: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly composition?: readonly CompositionItem[];
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
  energy: "bg-[#D97706]",
  protein: "bg-[#0284C7]",
  mineral: "bg-[#6366F1]",
  premix: "bg-[#DB2777]",
  forage: "bg-[#059669]",
  additive: "bg-[#EA580C]",
  enzyme: "bg-[#0F3D3E]",
};

interface IngredientTableRowProps {
  readonly ing: Ingredient;
  readonly rowIdx: number;
  readonly inclusionPct: number;
  readonly visibleNutrients: readonly Nutrient[];
  readonly globalAntiNol: boolean;
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
  readonly onCellPaste: (
    rowIdx: number,
    colKey: PasteColumnKey,
    event: ClipboardEvent<HTMLInputElement>,
  ) => void;
}

const IngredientTableRow = memo(function IngredientTableRow({
  ing,
  rowIdx,
  inclusionPct,
  visibleNutrients,
  globalAntiNol,
  language,
  onUpdateIngredient,
  onResetPriceOverride,
  onOpenDetail,
  onCellPaste,
}: IngredientTableRowProps) {
  const isActive = ing.isActive !== false;
  const min = ing.inclusion?.min ?? 0;
  const max = ing.inclusion?.max ?? 100;
  const invalidBounds = min > max;
  const hasOverride = ing.priceOverride !== undefined;
  const effectiveAntiNol = ing.zeroInclusionRule?.enforceNonZero ?? globalAntiNol;
  const hasInclusion = inclusionPct > 0.005;

  return (
    <tr
      className={cn(
        "transition-colors duration-100 hover:bg-[#F8FAFC] dark:hover:bg-[#162831]",
        !isActive && "opacity-55",
      )}
    >
      <td className="sticky left-0 z-10 border-r border-[#E2E8F0] bg-white px-1.5 py-1.5 text-center dark:border-[#1E333D] dark:bg-[#111F26]">
        <input
          type="checkbox"
          checked={isActive}
          aria-label={`Aktifkan ${ing.name}`}
          onChange={(e) => onUpdateIngredient(ing.id, { isActive: e.target.checked })}
          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#059669]"
        />
      </td>

      <td className="sticky left-10 z-10 border-r border-[#E2E8F0] bg-white px-2.5 py-1.5 dark:border-[#1E333D] dark:bg-[#111F26]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("h-2.5 w-2.5 shrink-0 rounded-xs", CATEGORY_DOT[ing.category])}
            />
            <span className="truncate font-semibold text-[#0F172A] dark:text-slate-100">
              {language === "id" ? ing.name : (ing.nameEn ?? ing.name)}
            </span>
          </div>
          <Badge tone={ing.basis === "as_fed" ? "neutral" : "emerald"}>
            {ing.basis === "as_fed" ? "AF" : "BK"}
          </Badge>
        </div>
      </td>

      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <NumericCellInput
            value={ing.priceOverride ?? ing.pricePerKg}
            treatSingleThousandDot
            fractionDigits={0}
            gridRow={rowIdx}
            gridCol="price"
            onPaste={(e) => onCellPaste(rowIdx, "price", e)}
            ariaLabel={`Harga/kg ${ing.name}`}
            className={cn(
              hasOverride &&
                "border-[#D97706] bg-amber-50 text-[#B45309] dark:border-amber-500/70 dark:bg-amber-950/30 dark:text-amber-200",
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
              className="neu-pill-btn cursor-pointer rounded-md p-1 text-[#D97706] dark:text-amber-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>

      <td className="px-2 py-1">
        <NumericCellInput
          value={ing.dryMatter}
          fractionDigits={1}
          gridRow={rowIdx}
          gridCol="dm"
          onPaste={(e) => onCellPaste(rowIdx, "dm", e)}
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

      <td className="px-2 py-1">
        <NumericCellInput
          value={min}
          fractionDigits={1}
          gridRow={rowIdx}
          gridCol="min"
          onPaste={(e) => onCellPaste(rowIdx, "min", e)}
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

      <td className="px-2 py-1">
        <NumericCellInput
          value={max}
          fractionDigits={1}
          gridRow={rowIdx}
          gridCol="max"
          onPaste={(e) => onCellPaste(rowIdx, "max", e)}
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

      <td
        className={cn(
          "px-2 py-1 text-right tabular-nums",
          hasInclusion
            ? "bg-emerald-50/45 font-bold text-[#059669] dark:bg-emerald-950/25 dark:text-emerald-400"
            : "text-[#475569] dark:text-slate-400",
        )}
      >
        {formatNumberLocale(inclusionPct, 2)}%
      </td>

      <td className="px-2 py-1 text-center">
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
          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#059669]"
        />
      </td>

      {visibleNutrients.map((nut) => {
        const val = ing.nutrients[nut.id];
        const isNull = val === null || val === undefined;
        return (
          <td key={nut.id} className="px-2 py-1">
            <NumericCellInput
              value={val ?? null}
              allowNull
              fractionDigits={nut.unit === "kcal/kg" ? 0 : 2}
              gridRow={rowIdx}
              gridCol={nut.id}
              onPaste={(e) => onCellPaste(rowIdx, nut.id, e)}
              placeholder="N/A"
              ariaLabel={`${nut.name} ${ing.name}`}
              className={cn(
                isNull &&
                  "border-dashed border-amber-400 bg-amber-50/50 dark:border-amber-700/70 dark:bg-amber-950/20",
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

      <td className="px-2 py-1 text-center">
        <button
          type="button"
          onClick={() => onOpenDetail(ing)}
          aria-label={`Edit detail ${ing.name}`}
          className="neu-pill-btn inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#475569] dark:text-slate-200"
        >
          <Sliders className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
});

export const IngredientDesktopTable = memo(function IngredientDesktopTable({
  ingredients,
  allIngredients,
  allNutrients = MOCK_NUTRIENTS,
  composition,
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

  const compositionMap = useMemo(
    () => new Map((composition ?? []).map((c) => [c.ingredientId, c.fraction * 100])),
    [composition],
  );

  const visibleNutrients: readonly Nutrient[] = useMemo(
    () =>
      allNutrients.filter(
        (n) => showAdvanceColumns || BASIC_NUTRIENT_IDS.has(n.id) || n.isCustom === true,
      ),
    [allNutrients, showAdvanceColumns],
  );

  const orderedCols: PasteColumnKey[] = useMemo(
    () => ["price", "dm", "min", "max", ...visibleNutrients.map((n) => n.id)],
    [visibleNutrients],
  );

  const handleCellPaste = useCallback(
    (startRowIdx: number, startColKey: PasteColumnKey, event: ClipboardEvent<HTMLInputElement>) => {
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
    },
    [allIngredients, ingredients, onBatchIngredientsUpdate, orderedCols],
  );

  return (
    <div className="flex h-full w-full flex-col gap-1.5">
      {pasteNotice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-[#047857] dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200"
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
      <div className="custom-scrollbar relative min-h-0 flex-1 overflow-auto rounded-lg border border-[#E2E8F0] bg-white dark:border-[#1E333D] dark:bg-[#111F26]">
        <table className="w-max min-w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 bg-[#F1F5F9] text-[11px] font-bold tracking-wide text-[#475569] dark:bg-[#162831] dark:text-slate-300">
            <tr>
              <th className="sticky left-0 z-30 w-10 border-r border-b border-[#E2E8F0] bg-[#F1F5F9] px-1.5 py-2 text-center dark:border-[#1E333D] dark:bg-[#162831]">
                Aktif
              </th>
              <th className="sticky left-10 z-30 min-w-40 border-r border-b border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-2 dark:border-[#1E333D] dark:bg-[#162831]">
                {language === "id" ? "Nama Bahan" : "Ingredient"}
              </th>
              <th className="w-24 min-w-24 border-b border-[#E2E8F0] px-2 py-2 text-right dark:border-[#1E333D]">
                Harga/kg
              </th>
              <th className="w-16 border-b border-[#E2E8F0] px-1.5 py-2 text-right dark:border-[#1E333D]">
                BK %
              </th>
              <th className="w-16 border-b border-[#E2E8F0] px-1.5 py-2 text-right dark:border-[#1E333D]">
                Min %
              </th>
              <th className="w-16 border-b border-[#E2E8F0] px-1.5 py-2 text-right dark:border-[#1E333D]">
                Max %
              </th>
              <th className="w-20 min-w-20 border-b border-[#E2E8F0] bg-emerald-50/70 px-2 py-2 text-right text-[#0F3D3E] dark:border-[#1E333D] dark:bg-emerald-950/35 dark:text-emerald-300">
                Inklusi %
              </th>
              <th className="w-14 border-b border-[#E2E8F0] px-2 py-2 text-center dark:border-[#1E333D]">
                Anti-0
              </th>
              {visibleNutrients.map((nut) => (
                <th
                  key={nut.id}
                  className="min-w-20 border-b border-[#E2E8F0] px-2 py-2 text-right whitespace-nowrap dark:border-[#1E333D]"
                >
                  <div className="text-[#0F172A] dark:text-slate-100">
                    {language === "id" ? nut.name : (nut.nameEn ?? nut.name)}
                  </div>
                  <div className="text-[10px] font-medium lowercase text-[#475569] dark:text-slate-400">
                    {nut.unit}
                  </div>
                </th>
              ))}
              <th className="w-12 border-b border-[#E2E8F0] px-2 py-2 text-center dark:border-[#1E333D]">
                Detail
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E333D]">
            {ingredients.map((ing, rowIdx) => (
              <IngredientTableRow
                key={ing.id}
                ing={ing}
                rowIdx={rowIdx}
                inclusionPct={compositionMap.get(ing.id) ?? 0}
                visibleNutrients={visibleNutrients}
                globalAntiNol={globalAntiNol}
                language={language}
                onUpdateIngredient={onUpdateIngredient}
                onResetPriceOverride={onResetPriceOverride}
                onOpenDetail={onOpenDetail}
                onCellPaste={handleCellPaste}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
