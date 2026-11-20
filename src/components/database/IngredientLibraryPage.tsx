import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type WheelEvent,
} from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileText,
  Plus,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import { FEED_CLASSES, getFeedClassLabel, resolveFeedClass } from "../../data/feed-classes";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getNutrientDisplayName, getNutrientFullName, pickLang } from "../../i18n";
import { generateIngredientDatabasePdf } from "../../storage";
import { useOptionalThemeContext } from "../../theme";
import type {
  AppLanguage,
  FeedClassCode,
  Ingredient,
  Nutrient,
  NutrientTier,
  TableViewTier,
} from "../../types";
import { cn } from "../../utils/cn";
import { downloadBinaryFile } from "../../utils/download";
import { isDerivedNutrient, resolveNutrientValue } from "../../utils/equations";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FeedClassIcon } from "../ui/FeedClassIcon";
import { Input } from "../ui/Input";

export interface IngredientLibraryPageProps {
  readonly ingredients: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[] | undefined;
  readonly customNutrients?: readonly Nutrient[] | undefined;
  readonly language: AppLanguage;
  readonly decimalPlaces?: 0 | 1 | 2 | undefined;
  readonly simpleMode?: boolean | undefined;
  readonly tableViewTier?: TableViewTier | undefined;
  readonly onChangeTableViewTier?: ((tier: TableViewTier) => void) | undefined;
  readonly showNdf?: boolean | undefined;
  readonly showBetn?: boolean | undefined;
  readonly onToggleActive: (id: string, active: boolean) => void;
  readonly onOpenAdd: () => void;
  readonly onImportIngredients?: (nextIngredients: readonly Ingredient[]) => void;
}

const BASIC_NUTRIENT_IDS = new Set(["cp", "me_poultry", "tdn", "ee", "cf", "ca", "p"]);
const STANDARD_EXTRA_IDS = new Set(["ndf", "adf", "betn"]);

const TIER_GROUP_LABEL: Record<
  NutrientTier | "custom",
  { readonly id: string; readonly en: string }
> = {
  basic: { id: "Makro & Energi", en: "Macro & Energy" },
  mineral_electrolyte: { id: "Mineral & Elektrolit", en: "Minerals & Electrolytes" },
  amino_acid: { id: "Asam Amino", en: "Amino Acids" },
  fiber_carb: { id: "Serat & BETN", en: "Fiber & NFE" },
  anf_physical: { id: "ANF & Fisik", en: "ANF & Physical" },
  custom: { id: "Nutrien Kustom", en: "Custom Nutrients" },
};

/**
 * Database Bahan Pakan dikelompokkan berdasarkan 8 klasifikasi bahan pakan standar
 * (IFN / NRC / Hartadi 1980) dengan kontrol Tampilan Kolom (Dasar | Standar | Lanjutan),
 * Popover Kolom, tab horizontal scrollable, dan ekspor khusus PDF rapi untuk peternak.
 */
export const IngredientLibraryPage = memo(function IngredientLibraryPage({
  ingredients,
  allNutrients,
  customNutrients,
  language,
  decimalPlaces = 0,
  simpleMode = true,
  tableViewTier,
  onChangeTableViewTier,
  showNdf = false,
  showBetn = false,
  onToggleActive,
  onOpenAdd,
}: IngredientLibraryPageProps) {
  const themeCtx = useOptionalThemeContext();
  const useGpuFlip = (themeCtx?.motionEngine ?? "gpu_flip") === "gpu_flip";
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | FeedClassCode>("all");
  const [collapsedClasses, setCollapsedClasses] = useState<ReadonlySet<FeedClassCode>>(
    () => new Set(),
  );
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [localTier, setLocalTier] = useState<TableViewTier>(tableViewTier ?? "basic");
  const activeTier: TableViewTier = tableViewTier ?? localTier;
  const [colOverrides, setColOverrides] = useState<Readonly<Record<string, boolean>>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const tabListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPopoverOpen(false);
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [popoverOpen]);

  const nutrientsCatalog = useMemo<readonly Nutrient[]>(() => {
    if (allNutrients && allNutrients.length > 0) return allNutrients;
    return [...MOCK_NUTRIENTS, ...(customNutrients ?? [])];
  }, [allNutrients, customNutrients]);

  const handleSelectTier = useCallback(
    (nextTier: TableViewTier) => {
      setLocalTier(nextTier);
      setColOverrides({});
      onChangeTableViewTier?.(nextTier);
    },
    [onChangeTableViewTier],
  );

  const isColVisibleByDefault = useCallback(
    (colId: string): boolean => {
      if (colId === "price" || colId === "basis") return true;
      if (colId === "dm") return activeTier !== "basic";
      if (colId === "bounds") return activeTier !== "basic";
      return true;
    },
    [activeTier],
  );

  const isColVisible = useCallback(
    (colId: string): boolean => {
      const override = colOverrides[colId];
      return override !== undefined ? override : isColVisibleByDefault(colId);
    },
    [colOverrides, isColVisibleByDefault],
  );

  const toggleColumn = useCallback(
    (colId: string) => {
      setColOverrides((prev) => {
        const current = prev[colId] ?? isColVisibleByDefault(colId);
        return { ...prev, [colId]: !current };
      });
    },
    [isColVisibleByDefault],
  );

  const candidateNutrients = useMemo(() => {
    return nutrientsCatalog.filter((n) => {
      if (BASIC_NUTRIENT_IDS.has(n.id) || n.isCustom === true) return true;
      if (activeTier === "standard" && STANDARD_EXTRA_IDS.has(n.id)) return true;
      if (showBetn && n.id === "betn") return true;
      if (showNdf && (n.id === "ndf" || n.id === "adf")) return true;
      return activeTier === "advanced";
    });
  }, [nutrientsCatalog, activeTier, showBetn, showNdf]);

  const visibleNutrients = useMemo(
    () => candidateNutrients.filter((n) => isColVisible(n.id)),
    [candidateNutrients, isColVisible],
  );

  const coreCols = useMemo(
    () => ({
      basis: isColVisible("basis"),
      price: isColVisible("price"),
      dm: isColVisible("dm"),
      bounds: isColVisible("bounds"),
    }),
    [isColVisible],
  );

  const coreToggleItems: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
    { id: "basis", label: "Basis" },
    { id: "price", label: pickLang(language, "Harga", "Price") },
    { id: "dm", label: pickLang(language, "BK", "DM") },
    { id: "bounds", label: "Min/Max" },
  ];

  const groupedNutrients = useMemo(() => {
    const groups = new Map<string, Nutrient[]>();
    for (const nut of candidateNutrients) {
      const key = nut.isCustom ? "custom" : (nut.tier ?? "basic");
      const list = groups.get(key) ?? [];
      list.push(nut);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [candidateNutrients]);

  const totalColCount = coreToggleItems.length + candidateNutrients.length;
  const visibleColCount =
    coreToggleItems.filter((c) => isColVisible(c.id)).length + visibleNutrients.length;
  const hasCustomOverrides = Object.keys(colOverrides).length > 0;

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

  // Kelompokkan hasil filter ke dalam 8 kelas standar:
  // Saat filter "Semua 8 Kelas" aktif, sembunyikan otomatis kelas yang jumlah bahannya 0.
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
    })).filter((g) => (classFilter === "all" ? g.items.length > 0 : g.meta.code === classFilter));
  }, [filtered, classFilter]);

  const toggleGroupCollapse = (code: FeedClassCode) => {
    setCollapsedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleTabWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const el = tabListRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      el.scrollLeft += event.deltaY;
    }
  }, []);

  const scrollTabsBy = useCallback((deltaPx: number) => {
    const el = tabListRef.current;
    if (!el) return;
    if (typeof el.scrollBy === "function") {
      el.scrollBy({ left: deltaPx, behavior: "smooth" });
    } else {
      el.scrollLeft += deltaPx;
    }
  }, []);

  const allTabKeys: ReadonlyArray<"all" | FeedClassCode> = useMemo(
    () => ["all", ...FEED_CLASSES.map((fc) => fc.code)],
    [],
  );

  const handleTabKeyDown = useCallback(
    (idx: number, event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const nextIdx = (idx + delta + allTabKeys.length) % allTabKeys.length;
        const nextKey = allTabKeys[nextIdx];
        if (nextKey !== undefined) {
          setClassFilter(nextKey);
          const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
          const nextBtn = buttons?.[nextIdx];
          nextBtn?.focus();
          if (typeof nextBtn?.scrollIntoView === "function") {
            nextBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
        }
      }
    },
    [allTabKeys],
  );

  const handleExportPdf = () => {
    const bytes = generateIngredientDatabasePdf({
      ingredients: filtered,
      title:
        classFilter === "all"
          ? "DATABASE BAHAN PAKAN (8 KLASIFIKASI STANDAR)"
          : `DATABASE BAHAN PAKAN - ${getFeedClassLabel("id", classFilter).toUpperCase()}`,
      decimalPlaces,
    });
    const filename =
      classFilter === "all"
        ? "openformul-database-pakan.pdf"
        : `openformul-kelas-${classFilter}.pdf`;
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

      {/* Pencarian, Baris Tab 8 Kelas yang Bisa Digulir, & Kontrol Tampilan Kolom (Dasar/Standar/Lanjutan) */}
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

        {/* Baris Tab 8 Kelas Bahan Pakan dengan Horizontal Wheel Scroll & Tombol Geser */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollTabsBy(-200)}
            aria-label={pickLang(language, "Geser tab kelas ke kiri", "Scroll class tabs left")}
            title={pickLang(language, "Geser tab ke kiri", "Scroll tabs left")}
            className="neu-pill-btn inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={tabListRef}
            role="tablist"
            onWheel={handleTabWheel}
            aria-label={pickLang(
              language,
              "Filter 8 klasifikasi bahan pakan",
              "Filter 8 standard feed classes",
            )}
            className="custom-scrollbar flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto py-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={classFilter === "all"}
              onKeyDown={(e) => handleTabKeyDown(0, e)}
              onClick={(e) => {
                setClassFilter("all");
                if (typeof e.currentTarget.scrollIntoView === "function") {
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }
              }}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
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

            {FEED_CLASSES.map((fc, idx) => {
              const active = classFilter === fc.code;
              const count = classCounts.get(fc.code) ?? 0;
              return (
                <button
                  key={fc.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onKeyDown={(e) => handleTabKeyDown(idx + 1, e)}
                  onClick={(e) => {
                    setClassFilter(fc.code);
                    if (typeof e.currentTarget.scrollIntoView === "function") {
                      e.currentTarget.scrollIntoView({
                        behavior: "smooth",
                        inline: "center",
                        block: "nearest",
                      });
                    }
                  }}
                  className={cn(
                    "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
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

          <button
            type="button"
            onClick={() => scrollTabsBy(200)}
            aria-label={pickLang(language, "Geser tab kelas ke kanan", "Scroll class tabs right")}
            title={pickLang(language, "Geser tab ke kanan", "Scroll tabs right")}
            className="neu-pill-btn inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Kontrol 1 Baris Ringkas: Segmented Tier (Dasar / Standar / Lanjutan) + Popover Kolom */}
        <div className="acrylic-subcard flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--text-secondary)]">
              {pickLang(language, "Tampilan Kolom:", "Column View:")}
            </span>
            <div
              role="group"
              aria-label={pickLang(language, "Tingkat tampilan kolom tabel", "Table column tier")}
              className="inline-flex rounded-xl border border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--bg-sunken)]/70 p-0.5"
            >
              {(
                [
                  {
                    id: "basic",
                    label: pickLang(language, "Dasar", "Basic"),
                    hint: pickLang(
                      language,
                      "Tampilkan nutrien dasar utama (PK, EM, TDN, LK, SK, Ca, P)",
                      "Show primary basic nutrients (CP, ME, TDN, EE, CF, Ca, P)",
                    ),
                  },
                  {
                    id: "standard",
                    label: pickLang(language, "Standar", "Standard"),
                    hint: pickLang(
                      language,
                      "Tampilkan BK %, Min/Max %, NDF, ADF, dan BETN",
                      "Show DM %, Min/Max %, NDF, ADF, and NFE",
                    ),
                  },
                  {
                    id: "advanced",
                    label: pickLang(language, "Lanjutan", "Advanced"),
                    hint: pickLang(
                      language,
                      "Tampilkan seluruh nutrien lanjutan (Asam Amino, Elektrolit, Serat, ANF)",
                      "Show all advanced nutrients (Amino Acids, Electrolytes, Fiber, ANF)",
                    ),
                  },
                ] as const
              ).map((t) => {
                const active = activeTier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    title={t.hint}
                    onClick={() => handleSelectTier(t.id)}
                    className={cn(
                      "elastic-size-box relative cursor-pointer rounded-lg px-2.5 py-0.5 text-[11px] font-semibold transition-[transform,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                      active
                        ? t.id === "advanced"
                          ? "text-[var(--text-on-primary)]"
                          : "text-[var(--status-success)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {active &&
                      (useGpuFlip ? (
                        <motion.span
                          layoutId="db-table-tier-pill"
                          transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.75 }}
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-0 rounded-lg",
                            t.id === "advanced"
                              ? "bg-[var(--color-primary)] shadow-[0_2px_10px_-2px_var(--glow-primary-soft,rgba(0,0,0,0.18))]"
                              : "glow-pill-emerald border border-[var(--status-success-border)]",
                          )}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-0 rounded-lg",
                            t.id === "advanced"
                              ? "bg-[var(--color-primary)] shadow-[var(--shadow-neu-flat)]"
                              : "bg-[var(--bg-surface-elevated)] shadow-[var(--shadow-neu-flat)]",
                          )}
                        />
                      ))}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tombol Popover Kolom Terkelompok */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              aria-expanded={popoverOpen}
              aria-haspopup="dialog"
              onClick={() => setPopoverOpen((prev) => !prev)}
              className={cn(
                "neu-pill-btn inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)]",
                popoverOpen && "border-[var(--color-primary)] bg-[var(--bg-surface-elevated)]",
              )}
            >
              <Columns3 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <span>
                {pickLang(language, "Kolom", "Columns")} ({visibleColCount}/{totalColCount})
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-[var(--text-muted)] transition-transform duration-150",
                  popoverOpen && "rotate-180",
                )}
              />
            </button>

            {popoverOpen && (
              <div
                role="dialog"
                aria-label={pickLang(
                  language,
                  "Pilih kolom database yang ditampilkan",
                  "Toggle database columns",
                )}
                className="absolute right-0 z-40 mt-1.5 w-72 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 text-xs shadow-[0_14px_34px_-10px_rgba(0,0,0,0.28)] sm:w-80"
              >
                <div className="mb-2 flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
                  <span className="font-bold text-[var(--text-primary)]">
                    {pickLang(language, "Atur Kolom Database", "Customize Database Columns")}
                  </span>
                  {hasCustomOverrides && (
                    <button
                      type="button"
                      onClick={() => setColOverrides({})}
                      className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--status-success)] hover:bg-[var(--status-success-soft)]"
                    >
                      {pickLang(language, "Reset", "Reset")}
                    </button>
                  )}
                </div>

                <div className="custom-scrollbar max-h-64 space-y-2.5 overflow-y-auto pr-1">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      {pickLang(language, "Inti & Batasan", "Core & Bounds")}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {coreToggleItems.map((col) => {
                        const checked = isColVisible(col.id);
                        return (
                          <label
                            key={col.id}
                            className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)] select-none"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleColumn(col.id)}
                              className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                            />
                            <span>{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {groupedNutrients.map(([groupKey, nuts]) => {
                    const groupMeta =
                      TIER_GROUP_LABEL[groupKey as NutrientTier | "custom"] ??
                      TIER_GROUP_LABEL.basic;
                    return (
                      <div key={groupKey} className="border-t border-[var(--border-subtle)] pt-2">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                          {language === "id" ? groupMeta.id : groupMeta.en}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {nuts.map((nut) => {
                            const checked = isColVisible(nut.id);
                            const shortLabel = getNutrientDisplayName(nut, language, simpleMode);
                            const fullName = getNutrientFullName(nut, language);
                            return (
                              <label
                                key={nut.id}
                                title={fullName}
                                className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)] select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleColumn(nut.id)}
                                  className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                                />
                                <span className="truncate">{shortLabel}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Kelompok 8 Klasifikasi Bahan Pakan */}
      <div className="selectable-panel space-y-3">
        {groupedByClass.length === 0 && (
          <Card interactive={false} className="p-6 text-center">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              {pickLang(
                language,
                `Tidak ada bahan pakan yang cocok dengan pencarian “${query}”.`,
                `No feed ingredients match “${query}”.`,
              )}
            </p>
            {query.trim() !== "" && (
              <Button variant="secondary" size="sm" onClick={() => setQuery("")} className="mt-3">
                {pickLang(language, "Reset Pencarian", "Reset Search")}
              </Button>
            )}
          </Card>
        )}
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
                  <div
                    style={{ touchAction: "pan-x pan-y" }}
                    className="custom-scrollbar max-h-[360px] overflow-auto"
                  >
                    <table className="w-max min-w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-[var(--bg-sunken)] text-[11px] font-bold text-[var(--text-secondary)]">
                        <tr>
                          <th className="w-11 border-r border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2 py-2 text-center md:sticky md:left-0 md:z-20 md:w-14 md:px-3">
                            {pickLang(language, "Pakai", "Use")}
                          </th>
                          <th className="w-40 min-w-40 max-w-48 border-r border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2 py-2 md:sticky md:left-14 md:z-20 md:w-auto md:min-w-56 md:max-w-72 md:px-3">
                            {pickLang(language, "Nama Bahan", "Ingredient")}
                          </th>
                          {coreCols.basis && (
                            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-center">
                              Basis
                            </th>
                          )}
                          {coreCols.price && (
                            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap">
                              {pickLang(language, "Harga/kg", "Price/kg")}
                            </th>
                          )}
                          {coreCols.dm && (
                            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap">
                              {pickLang(language, "BK %", "DM %")}
                            </th>
                          )}
                          {coreCols.bounds && (
                            <>
                              <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap">
                                Min %
                              </th>
                              <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap">
                                Max %
                              </th>
                            </>
                          )}
                          {visibleNutrients.map((nut) => {
                            const headerLabel = getNutrientDisplayName(nut, language, simpleMode);
                            const fullLabel = getNutrientFullName(nut, language);
                            return (
                              <th
                                key={nut.id}
                                title={`${fullLabel} (${nut.unit})`}
                                className="border-b border-[var(--border-subtle)] px-2.5 py-2 text-right whitespace-nowrap"
                              >
                                <div className="text-[var(--text-primary)]">{headerLabel}</div>
                                <div className="text-[10px] font-medium lowercase text-[var(--text-muted)]">
                                  {nut.unit}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {items.map((ing) => {
                          const isActive = ing.isActive !== false;
                          const displayName =
                            language === "id" ? ing.name : (ing.nameEn ?? ing.name);
                          const minInc = ing.inclusion?.min ?? 0;
                          const maxInc = ing.inclusion?.max ?? 100;

                          return (
                            <tr
                              key={ing.id}
                              className={cn(
                                "transition-colors hover:bg-[var(--bg-sunken)]",
                                isActive && "bg-[var(--status-success-soft)]",
                              )}
                            >
                              <td className="w-11 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-center md:sticky md:left-0 md:z-10 md:w-14 md:px-3">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  aria-label={`${pickLang(language, "Pakai", "Use")} ${displayName}`}
                                  onChange={(e) => onToggleActive(ing.id, e.target.checked)}
                                  className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                                />
                              </td>
                              <td className="w-40 min-w-40 max-w-48 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 md:sticky md:left-14 md:z-10 md:w-auto md:min-w-56 md:max-w-72 md:px-3">
                                <div className="flex items-center gap-2">
                                  <FeedClassIcon code={meta.code} language={language} />
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold text-[var(--text-primary)]">
                                      {displayName}
                                    </div>
                                    <div className="truncate text-[10px] text-[var(--text-muted)]">
                                      {ing.source}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {coreCols.basis && (
                                <td className="px-2 py-1.5 text-center">
                                  <Badge tone={ing.basis === "as_fed" ? "sky" : "emerald"}>
                                    {ing.basis === "as_fed" ? "AF" : "BK"}
                                  </Badge>
                                </td>
                              )}
                              {coreCols.price && (
                                <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-[var(--text-primary)]">
                                  {formatCurrencyIdr(ing.priceOverride ?? ing.pricePerKg)}
                                </td>
                              )}
                              {coreCols.dm && (
                                <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                                  {formatNumberLocale(
                                    ing.dryMatter,
                                    resolveDisplayDigits("%", "dm", decimalPlaces, ing.dryMatter),
                                  )}
                                </td>
                              )}
                              {coreCols.bounds && (
                                <>
                                  <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                                    {formatNumberLocale(
                                      minInc,
                                      resolveDisplayDigits("%", "min", decimalPlaces, minInc),
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                                    {formatNumberLocale(
                                      maxInc,
                                      resolveDisplayDigits("%", "max", decimalPlaces, maxInc),
                                    )}
                                  </td>
                                </>
                              )}
                              {visibleNutrients.map((nut) => {
                                const rawVal = isDerivedNutrient(nut.id)
                                  ? resolveNutrientValue(ing, nut.id)
                                  : ing.nutrients[nut.id];
                                const hasVal = rawVal !== null && rawVal !== undefined;
                                const digits = resolveDisplayDigits(
                                  nut.unit,
                                  nut.id,
                                  decimalPlaces,
                                  rawVal,
                                );
                                return (
                                  <td
                                    key={nut.id}
                                    className={cn(
                                      "px-2.5 py-1.5 text-right whitespace-nowrap tabular-nums",
                                      hasVal
                                        ? "text-[var(--text-primary)]"
                                        : "text-[var(--text-muted)]",
                                    )}
                                  >
                                    {hasVal ? formatNumberLocale(rawVal, digits) : "N/A"}
                                  </td>
                                );
                              })}
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
