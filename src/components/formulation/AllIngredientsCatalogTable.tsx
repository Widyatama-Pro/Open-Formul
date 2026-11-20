import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveFeedClass } from "../../data/feed-classes";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getNutrientFullName, getNutrientShortName, pickLang } from "../../i18n";
import type { AppLanguage, Ingredient, Nutrient, TableViewTier } from "../../types";
import { cn } from "../../utils/cn";
import { isDerivedNutrient, resolveNutrientValue } from "../../utils/equations";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { isPoultrySpecies, isRuminantSpecies } from "../../utils/species";
import { Button } from "../ui/Button";
import { FeedClassIcon } from "../ui/FeedClassIcon";

export interface AllIngredientsCatalogTableProps {
  readonly items: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly language: AppLanguage;
  readonly activeSpecies?: string;
  readonly tableViewTier?: TableViewTier;
  readonly showNdf?: boolean;
  readonly showBetn?: boolean;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly searchQuery: string;
  readonly onToggleActive: (id: string, active: boolean) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
  readonly onResetFilter: () => void;
}

const BASIC_NUTRIENT_IDS = new Set(["cp", "me_poultry", "tdn", "ee", "cf", "ca", "p"]);
const NDF_NUTRIENT_IDS = new Set(["ndf", "adf"]);
const BETN_NUTRIENT_IDS = new Set(["betn"]);

const ROW_HEIGHT = 36;
const VIEWPORT_HEIGHT = 240;
const OVERSCAN = 6;
const VIRTUAL_THRESHOLD = 40;

/**
 * Tabel terpisah "Daftar Semua Bahan" dengan virtualisasi murni 60fps:
 * - Menghapus kolom teks Klasifikasi dan menggantinya dengan ikon mini 8 kelas di samping Nama Bahan
 * - Selaras dengan tier Dasar / Standar / Lanjutan & filter energi Unggas (EM) vs Ruminansia (TDN)
 */
export const AllIngredientsCatalogTable = memo(function AllIngredientsCatalogTable({
  items,
  allNutrients = MOCK_NUTRIENTS,
  language,
  activeSpecies,
  tableViewTier = "basic",
  showNdf = false,
  showBetn = false,
  decimalPlaces = 0,
  searchQuery,
  onToggleActive,
  onOpenDetail,
  onResetFilter,
}: AllIngredientsCatalogTableProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    setScrollTop(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [items.length, searchQuery]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    setScrollTop(scrollRef.current.scrollTop);
  }, []);

  const isPoultry = isPoultrySpecies(activeSpecies);
  const isRuminant = isRuminantSpecies(activeSpecies);
  const showStandardCols = tableViewTier !== "basic";

  const visibleNutrients = useMemo(() => {
    return allNutrients.filter((n) => {
      if (isPoultry && n.id === "tdn") return false;
      if (isRuminant && n.id === "me_poultry") return false;
      if (BASIC_NUTRIENT_IDS.has(n.id) || n.isCustom === true) return true;
      if (showBetn && BETN_NUTRIENT_IDS.has(n.id)) return true;
      if (showNdf && NDF_NUTRIENT_IDS.has(n.id)) return true;
      return tableViewTier === "advanced";
    });
  }, [allNutrients, isPoultry, isRuminant, showBetn, showNdf, tableViewTier]);

  const totalColumns =
    4 + // Pakai, Nama Bahan, Harga/kg, Detail
    (showStandardCols ? 2 : 0) + // Basis, BK%
    visibleNutrients.length;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sunken)] py-8 text-center text-xs text-[var(--text-secondary)]">
        <p>
          {pickLang(
            language,
            `Tidak ada bahan yang cocok dengan pencarian “${searchQuery}”.`,
            `No feed matches “${searchQuery}”.`,
          )}
        </p>
        <Button variant="secondary" size="sm" onClick={onResetFilter}>
          {pickLang(language, "Reset Pencarian", "Reset Filter")}
        </Button>
      </div>
    );
  }

  const useVirtual = items.length > VIRTUAL_THRESHOLD;
  const startIdx = useVirtual ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const endIdx = useVirtual ? Math.min(items.length, startIdx + visibleCount) : items.length;
  const visibleSlice = items.slice(startIdx, endIdx);
  const topPad = useVirtual ? startIdx * ROW_HEIGHT : 0;
  const bottomPad = useVirtual ? Math.max(0, (items.length - endIdx) * ROW_HEIGHT) : 0;

  return (
    <div
      ref={scrollRef}
      onScroll={useVirtual ? handleScroll : undefined}
      className="custom-scrollbar max-h-[240px] overflow-auto overscroll-contain rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
    >
      <table className="w-max min-w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-[var(--bg-sunken)] text-[11px] font-bold text-[var(--text-secondary)]">
          <tr>
            <th className="sticky left-0 z-20 w-14 border-r border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2 py-2 text-center">
              {pickLang(language, "Pakai", "Use")}
            </th>
            <th className="sticky left-14 z-20 w-56 min-w-56 border-r border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2.5 py-2 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.10)]">
              {pickLang(language, "Nama Bahan", "Ingredient Name")}
            </th>
            {showStandardCols && (
              <th className="w-16 min-w-16 border-b border-[var(--border-subtle)] px-2 py-2 text-center">
                Basis
              </th>
            )}
            <th className="w-24 min-w-24 border-b border-[var(--border-subtle)] px-2 py-2 text-right">
              {pickLang(language, "Harga/kg", "Price/kg")}
            </th>
            {showStandardCols && (
              <th className="w-16 min-w-16 border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                {pickLang(language, "BK %", "DM %")}
              </th>
            )}
            {visibleNutrients.map((nut) => {
              const shortLabel = getNutrientShortName(nut, language);
              const fullName = getNutrientFullName(nut, language);
              const isEnergySlot = nut.id === "me_poultry" || nut.id === "tdn";
              return (
                <th
                  key={nut.id}
                  title={`${fullName} (${nut.unit})`}
                  className={cn(
                    "border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap",
                    isEnergySlot
                      ? "w-[86px] min-w-[86px] max-w-[86px]"
                      : "w-[74px] min-w-[74px] max-w-[74px]",
                  )}
                >
                  <div className="text-[var(--text-primary)]">{shortLabel}</div>
                  <div className="text-[10px] font-medium lowercase text-[var(--text-muted)]">
                    {nut.unit}
                  </div>
                </th>
              );
            })}
            <th className="w-16 min-w-16 border-b border-[var(--border-subtle)] px-2 py-2 text-center">
              Detail
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {topPad > 0 && (
            <tr aria-hidden="true">
              <td colSpan={totalColumns} style={{ height: `${topPad}px`, padding: 0, border: 0 }} />
            </tr>
          )}
          {visibleSlice.map((ing) => {
            const isActive = ing.isActive !== false;
            const feedClass = resolveFeedClass(ing);
            const displayName = language === "id" ? ing.name : (ing.nameEn ?? ing.name);
            const dmDigits = resolveDisplayDigits("%", "dm", decimalPlaces, ing.dryMatter);

            return (
              <tr
                key={ing.id}
                style={{ height: `${ROW_HEIGHT}px` }}
                className={cn(
                  "group transition-colors duration-100 hover:bg-[var(--bg-surface-elevated)]",
                  isActive && "bg-[var(--status-success-soft)]",
                )}
              >
                <td className="sticky left-0 z-10 w-14 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-center transition-colors group-hover:bg-[var(--bg-surface-elevated)]">
                  <input
                    type="checkbox"
                    checked={isActive}
                    aria-label={`${pickLang(language, "Gunakan", "Use")} ${displayName}`}
                    onChange={(e) => onToggleActive(ing.id, e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                  />
                </td>
                <td
                  title={displayName}
                  className="sticky left-14 z-10 w-56 min-w-56 max-w-56 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] transition-colors group-hover:bg-[var(--bg-surface-elevated)]"
                >
                  <div className="flex items-center gap-1.5">
                    <FeedClassIcon code={feedClass} language={language} />
                    <span className="truncate font-semibold text-[var(--text-primary)]">
                      {displayName}
                    </span>
                  </div>
                </td>
                {showStandardCols && (
                  <td className="w-16 min-w-16 px-2 py-1 text-center">
                    <span
                      className={cn(
                        "inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        ing.basis === "as_fed"
                          ? "border-[var(--status-info-border)] bg-[var(--status-info-soft)] text-[var(--status-info)]"
                          : "border-[var(--status-success-border)] bg-[var(--status-success-soft)] text-[var(--status-success)]",
                      )}
                    >
                      {ing.basis === "as_fed" ? "AF" : "BK"}
                    </span>
                  </td>
                )}
                <td className="w-24 min-w-24 px-2 py-1 text-right whitespace-nowrap tabular-nums text-[var(--text-primary)]">
                  {formatCurrencyIdr(ing.priceOverride ?? ing.pricePerKg)}
                </td>
                {showStandardCols && (
                  <td className="w-16 min-w-16 px-2 py-1 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                    {formatNumberLocale(ing.dryMatter, dmDigits)}%
                  </td>
                )}
                {visibleNutrients.map((nut) => {
                  const isEnergySlot = nut.id === "me_poultry" || nut.id === "tdn";
                  const cellWidthClass = isEnergySlot
                    ? "w-[86px] min-w-[86px] max-w-[86px]"
                    : "w-[74px] min-w-[74px] max-w-[74px]";
                  const rawVal = isDerivedNutrient(nut.id)
                    ? resolveNutrientValue(ing, nut.id)
                    : ing.nutrients[nut.id];
                  const hasVal = rawVal !== null && rawVal !== undefined;
                  const digits = resolveDisplayDigits(nut.unit, nut.id, decimalPlaces, rawVal);

                  return (
                    <td
                      key={nut.id}
                      className={cn(
                        cellWidthClass,
                        "px-2 py-1 text-right whitespace-nowrap tabular-nums",
                        hasVal ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
                      )}
                    >
                      {hasVal ? formatNumberLocale(rawVal, digits) : "N/A"}
                    </td>
                  );
                })}
                <td className="w-16 min-w-16 px-2 py-1 text-center">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(ing)}
                    aria-label={`Detail ${displayName}`}
                    className="neu-pill-btn cursor-pointer rounded-md px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Detail
                  </button>
                </td>
              </tr>
            );
          })}
          {bottomPad > 0 && (
            <tr aria-hidden="true">
              <td
                colSpan={totalColumns}
                style={{ height: `${bottomPad}px`, padding: 0, border: 0 }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});
