import { memo, useRef, useState, type ChangeEvent } from "react";
import { BookmarkCheck, Download, FileCode2, FolderOpen, Plus, Trash2, Upload } from "lucide-react";
import { pickLang } from "../../i18n";
import {
  FEED_FILE_EXTENSION,
  FEED_JSON_MIME,
  sanitizeFilenameSlug,
  serializeRecipeToFeedJson,
} from "../../storage";
import type { AppLanguage, Recipe } from "../../types";
import { downloadTextFile } from "../../utils/download";
import type { ValidationResult } from "../../utils/validators";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";

export interface SavedRecipesPageProps {
  readonly recipes: readonly Recipe[];
  readonly language: AppLanguage;
  readonly onLoadRecipe: (id: string) => void;
  readonly onOpenSaveCurrent: () => void;
  readonly onOpenExport: () => void;
  readonly onImportFeedJson?: (
    rawText: string,
  ) => ValidationResult<{ readonly recipe: Recipe; readonly wasIdRenamed: boolean }>;
  readonly onDeleteRecipe?: (id: string) => void;
}

export const SavedRecipesPage = memo(function SavedRecipesPage({
  recipes,
  language,
  onLoadRecipe,
  onOpenSaveCurrent,
  onOpenExport,
  onImportFeedJson,
  onDeleteRecipe,
}: SavedRecipesPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importFeedback, setImportFeedback] = useState<{
    readonly tone: "success" | "error";
    readonly lines: readonly string[];
  } | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onImportFeedJson) return;

    try {
      const text = await file.text();
      const outcome = onImportFeedJson(text);
      if (!outcome.ok) {
        setImportFeedback({
          tone: "error",
          lines: outcome.errors,
        });
        return;
      }

      const renameNote = outcome.data.wasIdRenamed
        ? pickLang(
            language,
            " (ID otomatis dibuat unik agar resep lama tidak tertimpa)",
            " (ID auto-uniqued so existing recipe is preserved)",
          )
        : "";
      setImportFeedback({
        tone: "success",
        lines: [
          pickLang(
            language,
            `Resep "${outcome.data.recipe.name}" berhasil diimpor${renameNote}.`,
            `Recipe "${outcome.data.recipe.name}" imported${renameNote}.`,
          ),
        ],
      });
    } catch {
      setImportFeedback({
        tone: "error",
        lines: [
          pickLang(
            language,
            "Gagal membaca berkas .feed.json dari perangkat.",
            "Failed to read .feed.json file from device.",
          ),
        ],
      });
    }
  };

  const handleDownloadCard = (recipe: Recipe) => {
    const json = serializeRecipeToFeedJson(recipe);
    const filename = `${sanitizeFilenameSlug(recipe.name)}${FEED_FILE_EXTENSION}`;
    downloadTextFile(json, filename, FEED_JSON_MIME);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#54707E] dark:text-slate-400">
            {pickLang(language, "Arsip & Templat", "Recipes & Templates")}
          </p>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[#122B36] dark:text-slate-100">
            {pickLang(language, "Proyek & Resep Tersimpan", "Saved Recipes & Templates")}
          </h1>
          <p className="mt-0.5 text-xs text-[#54707E] dark:text-slate-400">
            {pickLang(
              language,
              "Simpan, impor, dan bagikan racikan serta batasan nutrien sebagai berkas portabel (`.feed.json`).",
              "Save, import, and share formulations and nutrient bounds as portable `.feed.json` files.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onImportFeedJson && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.feed.json,application/json"
                aria-label={pickLang(
                  language,
                  "Unggah berkas .feed.json",
                  "Upload .feed.json file",
                )}
                onChange={(e) => void handleFileChange(e)}
                className="sr-only"
              />
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                <span>{pickLang(language, "Impor .feed.json", "Import .feed.json")}</span>
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={onOpenExport}>
            <Download className="h-3.5 w-3.5" />
            <span>{pickLang(language, "Ekspor Lembar Kerja", "Export Workbench")}</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenSaveCurrent}>
            <Plus className="h-3.5 w-3.5" />
            <span>{pickLang(language, "Simpan Sesi Saat Ini", "Save Current Session")}</span>
          </Button>
        </div>
      </div>

      {importFeedback && (
        <div
          role={importFeedback.tone === "error" ? "alert" : "status"}
          className={
            importFeedback.tone === "success"
              ? "glass-card glass-card-emerald rounded-2xl bg-emerald-50/85 p-3.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-200"
              : "glass-card glass-card-coral rounded-2xl bg-rose-50/90 p-3.5 text-xs font-medium text-rose-900 dark:bg-rose-950/45 dark:text-rose-200"
          }
        >
          {importFeedback.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      {recipes.length === 0 ? (
        <Card
          interactive={false}
          className="p-8 text-center text-xs text-[#54707E] dark:text-slate-400"
        >
          {pickLang(
            language,
            'Belum ada resep tersimpan. Klik "Simpan Sesi Saat Ini" atau impor berkas `.feed.json`.',
            'No saved recipes yet. Click "Save Current Session" or import a `.feed.json` file.',
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {recipes.map((r) => (
            <Card key={r.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <GlossySquircleIcon
                    tone="petrol"
                    size="sm"
                    icon={<BookmarkCheck className="h-4 w-4" />}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-sm font-bold tracking-[-0.015em] text-[#122B36] dark:text-slate-100">
                        {r.name}
                      </h2>
                      <Badge tone="sky">v{r.schemaVersion}</Badge>
                    </div>
                    <p className="mt-1 text-xs font-medium text-[#2A4957] dark:text-slate-300">
                      {language === "id"
                        ? r.requirement.name
                        : (r.requirement.nameEn ?? r.requirement.name)}
                    </p>
                    {r.notes && (
                      <p className="mt-1 text-[11px] text-[#54707E] dark:text-slate-400">
                        {r.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="neu-well mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2 text-[11px] font-medium text-[#54707E] dark:text-slate-400">
                <span>
                  {r.ingredients.filter((i) => i.isActive !== false).length}{" "}
                  {pickLang(language, "bahan aktif", "active ingredients")}
                </span>
                <span>
                  Basis:{" "}
                  {r.config?.activeBasis === "dry_matter"
                    ? pickLang(language, "BK (DM)", "DM")
                    : "As-Fed"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleDownloadCard(r)}>
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span>{pickLang(language, "Unduh .feed.json", "Download .feed.json")}</span>
                </Button>
                {onDeleteRecipe && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${pickLang(language, "Hapus resep", "Delete recipe")} ${r.name}`}
                    onClick={() => onDeleteRecipe(r.id)}
                    className="text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{pickLang(language, "Hapus", "Delete")}</span>
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => onLoadRecipe(r.id)}>
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>{pickLang(language, "Muat", "Load")}</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});
