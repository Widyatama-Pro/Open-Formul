import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Plus, Search } from "lucide-react";
import { FEED_CLASSES, getFeedClassLabel, resolveFeedClass } from "../../data/feed-classes";
import { pickLang } from "../../i18n";
import { generateIngredientDatabasePdf } from "../../storage";
import type { AppLanguage, FeedClassCode, Ingredient, Nutrient } from "../../types";
import { cn } from "../../utils/cn";
import { downloadBinaryFile } from "../../utils/download";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

export interface IngredientLibraryPageProps {
  readonly ingredients: readonly Ingredient[];
  readonly customNutrients?: readonly Nutrient[];
  readonly language: AppLanguage;
  readonly onToggleActive: (id: string, active: boolean) => void;
  readonly onOpenAdd: () => void;
  readonly onImportIngredients?: (nextIngredients: readonly Ingredient[]) => void;
}

/**
 * Database Bahan Pakan dikelompokkan berdasarkan 8 klasifikasi bahan pakan standar
 * (IFN / NRC / Hartadi 1980) dengan ekspor khusus PDF rapi untuk peternak.
 */
export const IngredientLibraryPage = memo(function IngredientLibraryPage({
  ingredients,
  language,
  onToggleActive,
  onOpenAdd,
}: IngredientLibraryPageProps) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | FeedClassCode>("all");
  const [collapsedClasses, setCollapsedClasses] = useState<ReadonlySet<FeedClassCode>>(
    () => new Set(),
  );
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ingredients.filter((ing) => {
      const code = resolveFeedClass(ing);
      const matchesClass = classFilter === "all" || code === classFilter;
      if (!matchesClass) return false;
      if (!q) return true;
      return (
        ing.name.toLowerCase().includes(q) ||
        ing.source.toLowerCase().includes(q) ||
        (ing.nameEn?.toLowerCase().includes(q) ?? false) ||
        getFeedClassLabel(language, code).toLowerCase().includes(q)
      );
    });
  }, [ingredients, query, classFilter, language]);

  // Hitung total bahan per kelas dari seluruh katalog untuk pill filter
  const classCounts = useMemo(() => {
    const counts = new Map<FeedClassCode, number>();
    for (const fc of FEED_CLASSES) counts.set(fc.code, 0);
    for (const ing of ingredients) {
      const code = resolveFeedClass(ing);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return counts;
  }, [ingredients]);

  // Kelompokkan hasil filter ke dalam 8 kelas standar
  const groupedByClass = useMemo(() => {
    const groups = new Map<FeedClassCode, Ingredient[]>();
    for (const fc of FEED_CLASSES) groups.set(fc.code, []);
    for (const ing of filtered) {
      const code = resolveFeedClass(ing);
      groups.get(code)?.push(ing);
    }
    return FEED_CLASSES.map((fc) => ({
      meta: fc,
      items: groups.get(fc.code) ?? [],
    })).filter((g) => classFilter === "all" || g.meta.code === classFilter);
  }, [filtered, classFilter]);

  const toggleGroupCollapse = (code: FeedClassCode) => {
    setCollapsedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleExportPdf = () => {
    const bytes = generateIngredientDatabasePdf({
      ingredients: filtered,
      title:
        classFilter === "all"
          ? "DATABASE BAHAN PAKAN (8 KLASIFIKASI STANDAR)"
          : `DATABASE BAHAN PAKAN - ${getFeedClassLabel("id", classFilter).toUpperCase()}`,
    });
    const filename =
      classFilter === "all"
        ? "open-formulasi-database-pakan.pdf"
        : `open-formulasi-kelas-${classFilter}.pdf`;
    downloadBinaryFile(bytes, filename, "application/pdf");
    setExportNotice(
      pickLang(
        language,
        `Dokumen PDF "${filename}" (${filtered.length} bahan) berhasil diunduh.`,
        `PDF "${filename}" (${filtered.length} feeds) downloaded.`,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            {pickLang(language, "Database Kandungan Bahan Pakan", "Feed Ingredient Database")}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Dikelompokkan berdasarkan 8 klasifikasi bahan pakan standar internasional. Nilai kosong ditampilkan N/A.",
              "Grouped into the 8 standard international feed classes. Missing lab data is marked N/A.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportPdf}>
            <FileText className="h-3.5 w-3.5 text-[var(--status-success)]" />
            <span>{pickLang(language, "Ekspor PDF", "Export PDF")}</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenAdd}>
            <Plus className="h-3.5 w-3.5" />
            <span>{pickLang(language, "Tambah Bahan", "Add Feed")}</span>
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--status-success-border)] bg-[var(--status-success-soft)] px-3.5 py-2 text-xs font-medium text-[var(--status-success)]"
        >
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="cursor-pointer text-[11px] font-bold underline"
          >
            {pickLang(language, "Tutup", "Close")}
          </button>
        </div>
      )}

      {/* Pencarian & Filter 8 Kelas Bahan Pakan */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pickLang(
              language,
              "Cari nama bahan, kelas pakan, atau sumber (Hartadi, NRC, Feedipedia)…",
              "Search feed name, feed class, or source (Hartadi, NRC, Feedipedia)…",
            )}
            className="pl-10"
          />
        </div>

        <div
          role="tablist"
          aria-label={pickLang(
            language,
            "Filter 8 klasifikasi bahan pakan",
            "Filter 8 standard feed classes",
          )}
          className="flex flex-wrap gap-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={classFilter === "all"}
            onClick={() => setClassFilter("all")}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
              classFilter === "all"
                ? "border-transparent bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
            )}
          >
            <span>{pickLang(language, "Semua 8 Kelas", "All 8 Classes")}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.2 text-[10px] tabular-nums",
                classFilter === "all"
                  ? "bg-black/15 text-[var(--text-on-primary)]"
                  : "bg-[var(--bg-sunken)] text-[var(--text-secondary)]",
              )}
            >
              {ingredients.length}
            </span>
          </button>

          {FEED_CLASSES.map((fc) => {
            const active = classFilter === fc.code;
            const count = classCounts.get(fc.code) ?? 0;
            return (
              <button
                key={fc.code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setClassFilter(fc.code)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                  active
                    ? "border-transparent bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
                )}
              >
                <span>
                  {fc.code}. {language === "id" ? fc.shortId : fc.shortEn}
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] tabular-nums",
                    active
                      ? "bg-black/15 text-[var(--text-on-primary)]"
                      : "bg-[var(--bg-sunken)] text-[var(--text-secondary)]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daftar Kelompok 8 Klasifikasi Bahan Pakan */}
      <div className="space-y-3">
        {groupedByClass.map(({ meta, items }) => {
          const isCollapsed = collapsedClasses.has(meta.code);
          return (
            <Card key={meta.code} interactive={false} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroupCollapse(meta.code)}
                aria-expanded={!isCollapsed}
                className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface)]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[var(--status-success)]" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-[var(--text-primary)]">
                        {getFeedClassLabel(language, meta.code)}
                      </h2>
                      <Badge tone={items.length > 0 ? "emerald" : "neutral"}>
                        {items.length} {pickLang(language, "bahan", "feeds")}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                      {language === "id" ? meta.descriptionId : meta.descriptionEn}
                    </p>
                  </div>
                </div>
              </button>

              {!isCollapsed &&
                (items.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      language,
                      "Belum ada bahan pada kelas ini untuk filter pencarian saat ini.",
                      "No ingredients in this class match the current filter.",
                    )}
                  </p>
                ) : (
                  <div className="custom-scrollbar max-h-[340px] overflow-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-[var(--bg-sunken)] text-[11px] font-bold text-[var(--text-secondary)]">
                        <tr>
                          <th className="w-16 border-b border-[var(--border-subtle)] px-3 py-2 text-center">
                            {pickLang(language, "Pakai", "Use")}
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-3 py-2">
                            {pickLang(language, "Nama Bahan", "Ingredient")}
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-center">
                            Basis
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                            {pickLang(language, "Harga/kg", "Price/kg")}
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                            {pickLang(language, "BK%", "DM%")}
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                            {pickLang(language, "PK%", "CP%")}
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                            EM / TDN
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                            {pickLang(language, "SK%", "CF%")}
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                            Ca%
                          </th>
                          <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right">
                            P%
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {items.map((ing) => {
                          const isActive = ing.isActive !== false;
                          const displayName =
                            language === "id" ? ing.name : (ing.nameEn ?? ing.name);
                          const cp = ing.nutrients.cp;
                          const me = ing.nutrients.me_poultry;
                          const tdn = ing.nutrients.tdn;
                          const cf = ing.nutrients.cf;
                          const ca = ing.nutrients.ca;
                          const p = ing.nutrients.p;

                          return (
                            <tr
                              key={ing.id}
                              className={cn(
                                "transition-colors hover:bg-[var(--bg-sunken)]",
                                isActive && "bg-[var(--status-success-soft)]",
                              )}
                            >
                              <td className="px-3 py-1.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  aria-label={`${pickLang(language, "Pakai", "Use")} ${displayName}`}
                                  onChange={(e) => onToggleActive(ing.id, e.target.checked)}
                                  className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                                />
                              </td>
                              <td className="max-w-72 px-3 py-1.5">
                                <div className="truncate font-semibold text-[var(--text-primary)]">
                                  {displayName}
                                </div>
                                <div className="truncate text-[10px] text-[var(--text-muted)]">
                                  {ing.source}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <Badge tone={ing.basis === "as_fed" ? "sky" : "emerald"}>
                                  {ing.basis === "as_fed" ? "AF" : "BK"}
                                </Badge>
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-primary)]">
                                {formatCurrencyIdr(ing.priceOverride ?? ing.pricePerKg)}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                                {formatNumberLocale(ing.dryMatter, 1)}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-primary)]">
                                {cp !== null && cp !== undefined
                                  ? formatNumberLocale(cp, 1)
                                  : "N/A"}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                                {me !== null && me !== undefined
                                  ? `${formatNumberLocale(me, 0)} kcal`
                                  : tdn !== null && tdn !== undefined
                                    ? `${formatNumberLocale(tdn, 1)}% TDN`
                                    : "N/A"}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                                {cf !== null && cf !== undefined
                                  ? formatNumberLocale(cf, 1)
                                  : "N/A"}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                                {ca !== null && ca !== undefined
                                  ? formatNumberLocale(ca, 2)
                                  : "N/A"}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                                {p !== null && p !== undefined ? formatNumberLocale(p, 2) : "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
});
