import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Beef,
  Download,
  FlaskConical,
  Gem,
  Plus,
  Search,
  Sparkles,
  Sprout,
  Upload,
  Wheat,
} from "lucide-react";
import type { AppLanguage, Ingredient, IngredientCategory, Nutrient } from "../../types";
import { downloadTextFile } from "../../utils/download";
import {
  exportIngredientsToCsv,
  parseAndMergeIngredientsCsv,
} from "../../utils/ingredientCsvImport";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { validateIngredientPackJson } from "../../utils/validators";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon, type SquircleTone } from "../ui/GlossySquircleIcon";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

const CATEGORY_VISUAL: Record<IngredientCategory, { tone: SquircleTone; icon: ReactNode }> = {
  energy: { tone: "amber", icon: <Wheat className="h-4 w-4" /> },
  protein: { tone: "coral", icon: <Beef className="h-4 w-4" /> },
  forage: { tone: "mint", icon: <Sprout className="h-4 w-4" /> },
  mineral: { tone: "sky", icon: <Gem className="h-4 w-4" /> },
  premix: { tone: "indigo", icon: <Sparkles className="h-4 w-4" /> },
  additive: { tone: "orchid", icon: <FlaskConical className="h-4 w-4" /> },
  enzyme: { tone: "petrol", icon: <FlaskConical className="h-4 w-4" /> },
};

export interface IngredientLibraryPageProps {
  readonly ingredients: readonly Ingredient[];
  readonly customNutrients?: readonly Nutrient[];
  readonly language: AppLanguage;
  readonly onToggleActive: (id: string, active: boolean) => void;
  readonly onOpenAdd: () => void;
  readonly onImportIngredients?: (nextIngredients: readonly Ingredient[]) => void;
}

export function IngredientLibraryPage({
  ingredients,
  customNutrients = [],
  language,
  onToggleActive,
  onOpenAdd,
  onImportIngredients,
}: IngredientLibraryPageProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | IngredientCategory>("all");
  const [showAll, setShowAll] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [defaultSource, setDefaultSource] = useState("");
  const [importReport, setImportReport] = useState<{
    readonly tone: "success" | "error";
    readonly headline: string;
    readonly details: readonly string[];
  } | null>(null);

  const filtered = useMemo(
    () =>
      ingredients.filter((ing) => {
        const matchesCat = categoryFilter === "all" || ing.category === categoryFilter;
        const q = query.trim().toLowerCase();
        const matchesQ =
          !q ||
          ing.name.toLowerCase().includes(q) ||
          ing.source.toLowerCase().includes(q) ||
          (ing.nameEn?.toLowerCase().includes(q) ?? false);
        return matchesCat && matchesQ;
      }),
    [ingredients, query, categoryFilter],
  );

  const isWindowed = query.trim() === "" && categoryFilter === "all" && filtered.length > 50;
  const displayed = isWindowed && !showAll ? filtered.slice(0, 48) : filtered;

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onImportIngredients) return;

    try {
      const rawText = await file.text();
      const trimmed = rawText.replace(/^\uFEFF/, "").trim();
      const sourceOverride = defaultSource.trim();

      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(trimmed);
        } catch {
          setImportReport({
            tone: "error",
            headline: "Berkas JSON tidak valid.",
            details: ["Periksa tanda koma/kurung kurawal pada file JSON bahan pakan."],
          });
          return;
        }
        const validated = validateIngredientPackJson(parsedJson);
        if (!validated.ok) {
          setImportReport({
            tone: "error",
            headline: "Validasi pack JSON gagal.",
            details: validated.errors.slice(0, 5),
          });
          return;
        }

        const byId = new Map<string, Ingredient>();
        for (const existing of ingredients) {
          byId.set(existing.id, existing);
        }
        let added = 0;
        let updated = 0;
        for (const item of validated.data) {
          const prev = byId.get(item.id);
          const mergedItem: Ingredient = prev
            ? {
                ...prev,
                ...item,
                nutrients: { ...prev.nutrients, ...item.nutrients },
                source: item.source || sourceOverride || prev.source,
              }
            : {
                ...item,
                source: item.source || sourceOverride || "Impor Pack JSON Pengguna",
              };
          if (prev) updated += 1;
          else added += 1;
          byId.set(item.id, mergedItem);
        }
        onImportIngredients(Array.from(byId.values()));
        setImportReport({
          tone: "success",
          headline: `${updated} bahan diperbarui, ${added} bahan ditambahkan dari JSON.`,
          details: [],
        });
        return;
      }

      const csvOutcome = parseAndMergeIngredientsCsv(trimmed, ingredients, customNutrients);
      if (csvOutcome.updatedCount === 0 && csvOutcome.addedCount === 0) {
        setImportReport({
          tone: "error",
          headline: "Tidak ada baris bahan valid yang dapat diimpor.",
          details: csvOutcome.errors.slice(0, 5).map((e) => `Baris ${e.row}: ${e.message}`),
        });
        return;
      }

      const finalIngredients = sourceOverride
        ? csvOutcome.ingredients.map((item) =>
            item.source === "Impor CSV Pengguna" ? { ...item, source: sourceOverride } : item,
          )
        : csvOutcome.ingredients;

      onImportIngredients(finalIngredients);
      setImportReport({
        tone: "success",
        headline: `${csvOutcome.updatedCount} bahan diperbarui, ${csvOutcome.addedCount} bahan ditambahkan.`,
        details: [
          ...csvOutcome.warnings,
          ...csvOutcome.errors.slice(0, 3).map((e) => `Baris ${e.row}: ${e.message}`),
        ],
      });
    } catch {
      setImportReport({
        tone: "error",
        headline: "Gagal membaca file impor.",
        details: ["Pastikan file bertipe .csv atau .json UTF-8."],
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#54707E] dark:text-slate-400">
            {language === "id" ? "Pustaka Pakan" : "Feed Library"}
          </p>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[#122B36] dark:text-slate-100">
            {language === "id" ? "Database Kandungan Bahan Pakan" : "Feed Ingredient Database"}
          </h1>
          <p className="mt-0.5 text-xs text-[#54707E] dark:text-slate-400">
            Modul terpisah dari Standar Kebutuhan Ternak. Membedakan tegas nilai 0 vs N/A (data
            belum tersedia).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const csv = exportIngredientsToCsv(ingredients, customNutrients);
              downloadTextFile(csv, "open-formul-bahan-pakan.csv", "text/csv;charset=utf-8");
            }}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!onImportIngredients}
            onClick={() => setImportOpen((prev) => !prev)}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Impor CSV / JSON</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenAdd}>
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Bahan</span>
          </Button>
        </div>
      </div>

      {importOpen && onImportIngredients && (
        <Card interactive={false} className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#122B36] dark:text-slate-100">
                Impor Bahan Pakan (CSV Excel Indonesia `,`/`;` atau JSON Pack)
              </h2>
              <p className="text-[11px] text-[#54707E] dark:text-slate-400">
                Merge non-destruktif: hanya kolom yang diisi akan memperbarui data lama (asam amino
                &amp; mineral lain aman). Sel kosong dibaca N/A (`null`), sedangkan `0` disimpan
                sebagai nol.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="default-import-source"
                className="mb-1 block text-xs font-medium text-[#122B36] dark:text-slate-200"
              >
                Sumber Default (opsional jika CSV belum punya kolom Sumber)
              </label>
              <Input
                id="default-import-source"
                value={defaultSource}
                onChange={(e) => setDefaultSource(e.target.value)}
                placeholder="Mis. Hasil Lab Proksimat 2026 / Hartadi UGM"
              />
            </div>

            <div>
              <label
                htmlFor="ingredient-import-file"
                className="mb-1 block text-xs font-medium text-[#122B36] dark:text-slate-200"
              >
                Pilih file CSV atau JSON bahan pakan
              </label>
              <input
                id="ingredient-import-file"
                type="file"
                accept=".csv,.txt,.json,text/csv,application/json"
                onChange={(e) => void handleFileImport(e)}
                className="block min-h-10 w-full cursor-pointer rounded-xl border border-cyan-900/15 bg-white/80 px-3 py-1.5 text-xs text-[#122B36] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#0E5E6F] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-[#0B4B59] dark:border-cyan-200/15 dark:bg-[#0A2530] dark:text-slate-100"
              />
            </div>
          </div>

          {importReport && (
            <div
              role={importReport.tone === "error" ? "alert" : "status"}
              className={
                importReport.tone === "success"
                  ? "rounded-2xl border border-emerald-300/70 bg-emerald-50/90 p-3 text-xs text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/45 dark:text-emerald-200"
                  : "rounded-2xl border border-rose-300/70 bg-rose-50/90 p-3 text-xs text-rose-950 dark:border-rose-700/60 dark:bg-rose-950/45 dark:text-rose-200"
              }
            >
              <p className="font-bold">{importReport.headline}</p>
              {importReport.details.map((msg) => (
                <p key={msg} className="mt-0.5 text-[11px]">
                  {msg}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#54707E] dark:text-slate-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama bahan atau sumber (NRC, Hartadi, Feedipedia)…"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Filter kategori bahan"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as "all" | IngredientCategory)}
          className="sm:w-52"
        >
          <option value="all">Semua Kategori</option>
          <option value="energy">Energi</option>
          <option value="protein">Protein</option>
          <option value="forage">Hijauan</option>
          <option value="mineral">Mineral</option>
          <option value="premix">Premix</option>
          <option value="additive">Aditif</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {displayed.map((ing) => {
          const isActive = ing.isActive !== false;
          const cp = ing.nutrients.cp;
          const me = ing.nutrients.me_poultry;
          const tdn = ing.nutrients.tdn;
          const trp = ing.nutrients.trp;
          const visual = CATEGORY_VISUAL[ing.category];

          return (
            <Card key={ing.id} highlight={isActive ? "none" : "coral"} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <GlossySquircleIcon
                    tone={visual.tone}
                    size="sm"
                    icon={visual.icon}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-sm font-bold tracking-[-0.015em] text-[#122B36] dark:text-slate-100">
                        {language === "id" ? ing.name : (ing.nameEn ?? ing.name)}
                      </h2>
                      <Badge tone="neutral">{ing.category}</Badge>
                      <Badge tone={ing.basis === "as_fed" ? "sky" : "emerald"}>
                        {ing.basis === "as_fed" ? "As-Fed" : "BK"}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[#54707E] dark:text-slate-400">
                      Sumber: {ing.source}
                    </p>
                  </div>
                </div>

                <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold text-[#122B36] shadow-[0_3px_8px_rgba(14,71,86,0.08)] transition-colors hover:bg-white dark:border-cyan-200/15 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => onToggleActive(ing.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0E5E6F] accent-[#0E5E6F]"
                  />
                  <span>Pakai</span>
                </label>
              </div>

              <div className="neu-well mt-3.5 grid grid-cols-2 gap-2.5 rounded-2xl p-3 text-xs tabular-nums sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                    Harga
                  </span>
                  <span className="font-semibold text-[#122B36] dark:text-slate-100">
                    {formatCurrencyIdr(ing.pricePerKg)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                    BK
                  </span>
                  <span className="font-semibold text-[#122B36] dark:text-slate-100">
                    {formatNumberLocale(ing.dryMatter, 0)}%
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                    PK
                  </span>
                  <span className="font-semibold text-[#122B36] dark:text-slate-100">
                    {cp !== null && cp !== undefined ? `${formatNumberLocale(cp, 1)}%` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                    {me !== null && me !== undefined ? "ME / Trp" : "TDN"}
                  </span>
                  <span className="font-semibold text-[#122B36] dark:text-slate-100">
                    {me !== null && me !== undefined
                      ? `${formatNumberLocale(me, 0)}${trp === null ? " · Trp N/A" : ""}`
                      : tdn !== null && tdn !== undefined
                        ? `${formatNumberLocale(tdn, 1)}%`
                        : "N/A"}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {isWindowed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/75 bg-white/55 px-4 py-3 text-xs text-[#54707E] dark:border-cyan-200/10 dark:bg-[#0D2E3B]/60 dark:text-slate-300">
          <span>
            Menampilkan {displayed.length} dari {filtered.length} bahan pakan dalam pustaka.
          </span>
          <Button variant="secondary" size="sm" onClick={() => setShowAll((prev) => !prev)}>
            {showAll ? "Ringkas Tampilan" : `Tampilkan Semua (${filtered.length} bahan)`}
          </Button>
        </div>
      )}
    </div>
  );
}
