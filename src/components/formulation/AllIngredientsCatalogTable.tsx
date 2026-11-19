import { memo, useCallback, useEffect, useRef, useState } from "react";
import { getFeedClassLabel, resolveFeedClass } from "../../data/feed-classes";
import { pickLang } from "../../i18n";
import type { AppLanguage, Ingredient } from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { Button } from "../ui/Button";

export interface AllIngredientsCatalogTableProps {
  readonly items: readonly Ingredient[];
  readonly language: AppLanguage;
  readonly simpleMode: boolean;
  readonly searchQuery: string;
  readonly onToggleActive: (id: string, active: boolean) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
  readonly onResetFilter: () => void;
}

const ROW_HEIGHT = 36;
const VIEWPORT_HEIGHT = 240;
const OVERSCAN = 6;
const VIRTUAL_THRESHOLD = 40;

/**
 * Tabel terpisah "Daftar Semua Bahan" dengan virtualisasi murni 60fps:
 * seluruh katalog (300+ bahan) dapat digulir mulus tanpa tombol "Muat +50"
 * maupun teks pagination.
 */
export const AllIngredientsCatalogTable = memo(function AllIngredientsCatalogTable({
  items,
  language,
  simpleMode,
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
      className="custom-scrollbar max-h-[240px] overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
    >
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-[var(--bg-sunken)] text-[11px] font-bold text-[var(--text-secondary)]">
          <tr>
            <th className="w-16 border-b border-[var(--border-subtle)] px-2.5 py-2 text-center">
              {pickLang(language, "Pakai", "Use")}
            </th>
            <th className="border-b border-[var(--border-subtle)] px-2.5 py-2">
              {pickLang(language, "Nama Bahan", "Ingredient Name")}
            </th>
            <th className="border-b border-[var(--border-subtle)] px-2.5 py-2">
              {pickLang(language, "Klasifikasi (8 Kelas)", "Feed Class")}
            </th>
            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-center">Basis</th>
            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
              {pickLang(language, "Harga/kg", "Price/kg")}
            </th>
            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
              {pickLang(language, "BK %", "DM %")}
            </th>
            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
              {simpleMode
                ? pickLang(language, "PK %", "CP %")
                : pickLang(language, "Protein %", "Protein %")}
            </th>
            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
              {simpleMode ? "EM / TDN" : pickLang(language, "Energi / TDN", "ME / TDN")}
            </th>
            <th className="w-16 border-b border-[var(--border-subtle)] px-2 py-2 text-center">
              Detail
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {topPad > 0 && (
            <tr aria-hidden="true">
              <td colSpan={9} style={{ height: `${topPad}px`, padding: 0, border: 0 }} />
            </tr>
          )}
          {visibleSlice.map((ing) => {
            const isActive = ing.isActive !== false;
            const feedClass = resolveFeedClass(ing);
            const displayName = language === "id" ? ing.name : (ing.nameEn ?? ing.name);
            const cp = ing.nutrients.cp;
            const me = ing.nutrients.me_poultry;
            const tdn = ing.nutrients.tdn;

            return (
              <tr
                key={ing.id}
                style={{ height: `${ROW_HEIGHT}px` }}
                className={cn(
                  "transition-colors duration-100 hover:bg-[var(--bg-surface-elevated)]",
                  isActive && "bg-[var(--status-success-soft)]",
                )}
              >
                <td className="px-2.5 py-1 text-center">
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
                  className="max-w-60 truncate px-2.5 py-1 font-semibold text-[var(--text-primary)]"
                >
                  {displayName}
                </td>
                <td className="px-2.5 py-1 whitespace-nowrap">
                  <span className="inline-block rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                    {getFeedClassLabel(language, feedClass, { short: true })}
                  </span>
                </td>
                <td className="px-2 py-1 text-center">
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
                <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums text-[var(--text-primary)]">
                  {formatCurrencyIdr(ing.priceOverride ?? ing.pricePerKg)}
                </td>
                <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                  {formatNumberLocale(ing.dryMatter, 1)}%
                </td>
                <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums text-[var(--text-primary)]">
                  {cp !== null && cp !== undefined ? `${formatNumberLocale(cp, 1)}%` : "N/A"}
                </td>
                <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                  {me !== null && me !== undefined
                    ? `${formatNumberLocale(me, 0)} kcal`
                    : tdn !== null && tdn !== undefined
                      ? `${formatNumberLocale(tdn, 1)}% TDN`
                      : "N/A"}
                </td>
                <td className="px-2 py-1 text-center">
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
              <td colSpan={9} style={{ height: `${bottomPad}px`, padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});
