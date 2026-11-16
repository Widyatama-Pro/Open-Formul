import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import {
  FEED_FILE_EXTENSION,
  FEED_JSON_MIME,
  generateFormulationCsv,
  generateFormulationPdf,
  generateFormulationXlsx,
  sanitizeFilenameSlug,
  serializeRecipeToFeedJson,
} from "../../storage";
import type {
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  Recipe,
  Requirement,
} from "../../types";
import { downloadBinaryFile, downloadTextFile } from "../../utils/download";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
import { SheetDialog } from "../ui/SheetDialog";

export interface ExportDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly ingredients: readonly Ingredient[];
  readonly nutrientsCatalog?: readonly Nutrient[];
  readonly requirement: Requirement;
  readonly config: FormulationConfig;
  readonly result: FormulationResult;
  readonly recipeName?: string;
}

export function ExportDialog({
  open,
  onClose,
  ingredients,
  nutrientsCatalog = MOCK_NUTRIENTS,
  requirement,
  config,
  result,
  recipeName,
}: ExportDialogProps) {
  const [notice, setNotice] = useState<{
    readonly tone: "success" | "error";
    readonly text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const effectiveTitle = (
    recipeName?.trim() || `${requirement.name} (${config.activeBasis})`
  ).trim();
  const slug = sanitizeFilenameSlug(effectiveTitle);

  const isInfeasibleOrEmpty =
    result.status === "infeasible" || result.status === "error" || result.composition.length === 0;
  const isNearFeasible = result.status === "near_feasible";
  const isOptimal = result.status === "optimal" && result.composition.length > 0;

  const buildCurrentRecipe = (): Recipe => {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      id: `recipe-export-${slug}`,
      name: effectiveTitle,
      notes: `Diekspor dari OpenFormul (${config.activeBasis}, batch ${config.batchSizeKg} kg).`,
      ingredients,
      requirement,
      config,
      result,
      createdAt: now,
      updatedAt: now,
    };
  };

  const feedJsonText = serializeRecipeToFeedJson(buildCurrentRecipe());

  const handleDownloadFeedJson = () => {
    downloadTextFile(feedJsonText, `${slug}${FEED_FILE_EXTENSION}`, FEED_JSON_MIME);
    setNotice({
      tone: "success",
      text: `Berkas ${slug}${FEED_FILE_EXTENSION} berhasil diunduh.`,
    });
  };

  const handleCopyJson = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(feedJsonText);
        setCopied(true);
        setNotice({
          tone: "success",
          text: "Skema .feed.json disalin ke papan klip.",
        });
        setTimeout(() => setCopied(false), 1800);
        return;
      }
      setNotice({
        tone: "error",
        text: "Clipboard browser tidak tersedia; gunakan tombol Unduh .feed.json.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Gagal menyalin ke papan klip browser.",
      });
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csv = generateFormulationCsv({
        recipeName: effectiveTitle,
        ingredients,
        nutrientsCatalog,
        requirement,
        result,
      });
      downloadTextFile(csv, `${slug}.csv`, "text/csv;charset=utf-8");
      setNotice({
        tone: "success",
        text: `Berkas spreadsheet ${slug}.csv berhasil diunduh.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat CSV.",
      });
    }
  };

  const handleDownloadXlsx = () => {
    try {
      const bytes = generateFormulationXlsx({
        recipeName: effectiveTitle,
        ingredients,
        nutrientsCatalog,
        requirement,
        result,
      });
      downloadBinaryFile(
        bytes,
        `${slug}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      setNotice({
        tone: "success",
        text: `Workbook multi-sheet ${slug}.xlsx berhasil diunduh.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat .xlsx.",
      });
    }
  };

  const handleDownloadPdfFull = () => {
    try {
      const bytes = generateFormulationPdf({
        recipeName: effectiveTitle,
        mode: "full",
        ingredients,
        nutrientsCatalog,
        requirement,
        result,
      });
      downloadBinaryFile(bytes, `${slug}-lengkap.pdf`, "application/pdf");
      setNotice({
        tone: "success",
        text: `Laporan PDF ${slug}-lengkap.pdf berhasil diunduh.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat PDF Lengkap.",
      });
    }
  };

  const handleDownloadPdfBatch = () => {
    try {
      const bytes = generateFormulationPdf({
        recipeName: effectiveTitle,
        mode: "batch_only",
        ingredients,
        nutrientsCatalog,
        requirement,
        result,
      });
      downloadBinaryFile(bytes, `${slug}-batch.pdf`, "application/pdf");
      setNotice({
        tone: "success",
        text: `Lembar Timbang Gudang ${slug}-batch.pdf berhasil diunduh.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat PDF Batch Only.",
      });
    }
  };

  return (
    <SheetDialog
      open={open}
      onClose={() => {
        setNotice(null);
        onClose();
      }}
      title="Ekspor Resep & Lembar Kerja"
      subtitle="Unduh dokumen siap cetak gudang, spreadsheet multi-sheet, atau resep portabel offline."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined" && typeof window.print === "function") {
                window.print();
              }
            }}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Browser</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setNotice(null);
              onClose();
            }}
          >
            Tutup
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {isNearFeasible && (
          <div
            role="status"
            className="glass-card flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-3 font-medium text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/45 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="font-bold">
                Mode Relaksasi Elastik — dokumen bertanda kompromi nutrisi
              </p>
              <p className="mt-0.5 text-[11px] opacity-90">
                CSV, .xlsx, dan PDF Lengkap menyertakan penanda kompromi nutrisi. PDF Print Batch
                Only dinonaktifkan hingga formula mencapai status Optimal penuh.
              </p>
            </div>
          </div>
        )}

        {isInfeasibleOrEmpty && (
          <div
            role="status"
            className="glass-card glass-card-coral flex items-start gap-2.5 rounded-2xl bg-rose-50/90 p-3 font-medium text-rose-950 dark:bg-rose-950/45 dark:text-rose-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" />
            <div>
              <p className="font-bold">
                Ekspor hasil produksi diblokir (Status Infeasible / Kosong)
              </p>
              <p className="mt-0.5 text-[11px] opacity-90">
                Anda tetap dapat mengunduh <strong>.feed.json</strong> untuk berbagi atau debugging
                target kendala bersama konsultan.
              </p>
            </div>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className={
              notice.tone === "success"
                ? "glass-card glass-card-emerald rounded-2xl bg-emerald-50/85 p-3 font-medium text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-200"
                : "glass-card glass-card-coral rounded-2xl bg-rose-50/90 p-3 font-medium text-rose-900 dark:bg-rose-950/45 dark:text-rose-200"
            }
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleDownloadFeedJson}
            className="glass-card glass-card-interactive flex min-h-16 cursor-pointer items-start gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E7F]/40"
          >
            <GlossySquircleIcon tone="mint" size="sm" icon={<FileCode2 className="h-4 w-4" />} />
            <div>
              <p className="font-bold text-[#122B36] dark:text-slate-100">
                Resep Portabel (.feed.json)
              </p>
              <p className="mt-0.5 text-[11px] text-[#54707E] dark:text-slate-400">
                Simpan bahan, harga custom &amp; batasan untuk reproduksi 100% identik offline.
              </p>
            </div>
          </button>

          <div className="glass-card flex flex-col justify-between gap-2.5 p-3.5">
            <div className="flex items-start gap-3">
              <GlossySquircleIcon
                tone="sky"
                size="sm"
                icon={<FileSpreadsheet className="h-4 w-4" />}
              />
              <div>
                <p className="font-bold text-[#122B36] dark:text-slate-100">
                  Spreadsheet (CSV &amp; Excel)
                </p>
                <p className="mt-0.5 text-[11px] text-[#54707E] dark:text-slate-400">
                  Komposisi As-Fed, bobot batch, profil nutrien &amp; analisis sensitivitas.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={isInfeasibleOrEmpty}
                onClick={handleDownloadCsv}
                className="min-h-10 flex-1"
              >
                Unduh CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isInfeasibleOrEmpty}
                onClick={handleDownloadXlsx}
                className="min-h-10 flex-1"
              >
                Unduh Excel (.xlsx)
              </Button>
            </div>
          </div>

          <button
            type="button"
            disabled={isInfeasibleOrEmpty}
            onClick={handleDownloadPdfFull}
            className="glass-card glass-card-interactive flex min-h-16 cursor-pointer items-start gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E7F]/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <GlossySquircleIcon tone="petrol" size="sm" icon={<FileText className="h-4 w-4" />} />
            <div>
              <p className="font-bold text-[#122B36] dark:text-slate-100">
                PDF Lembar Formula Lengkap
              </p>
              <p className="mt-0.5 text-[11px] text-[#54707E] dark:text-slate-400">
                Laporan nutrisiwan, biaya batch, capaian nutrien &amp; shadow price.
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={!isOptimal}
            onClick={handleDownloadPdfBatch}
            title={
              isOptimal
                ? "Unduh PDF instruksi penimbangan gudang tanpa harga & rahasia nutrisi"
                : "Khusus status Optimal"
            }
            className="glass-card glass-card-interactive flex min-h-16 cursor-pointer items-start gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E7F]/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <GlossySquircleIcon tone="amber" size="sm" icon={<Printer className="h-4 w-4" />} />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-bold text-[#122B36] dark:text-slate-100">PDF Print Batch Only</p>
                <Badge tone="amber">Gudang</Badge>
              </div>
              <p className="mt-0.5 text-[11px] text-[#54707E] dark:text-slate-400">
                {isOptimal
                  ? "Menyembunyikan harga & target nutrisi dari operator mixer."
                  : "Terkunci — hanya tersedia bila status solver Optimal penuh."}
              </p>
            </div>
          </button>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-[#54707E] dark:text-slate-400">
              Pratinjau Skema Kanonik (.feed.json):
            </p>
            <Button variant="ghost" size="sm" onClick={() => void handleCopyJson()}>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? "Tersalin" : "Salin JSON"}</span>
            </Button>
          </div>
          <pre className="max-h-44 overflow-auto rounded-2xl border border-cyan-300/20 bg-[#0A2530] p-3.5 font-mono text-[11px] text-cyan-50 shadow-[inset_0_2px_8px_rgba(3,14,19,0.55)]">
            {feedJsonText}
          </pre>
        </div>
      </div>
    </SheetDialog>
  );
}
