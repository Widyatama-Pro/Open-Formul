import { useState } from "react";
import { AlertTriangle, FileText, Printer } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { pickLang } from "../../i18n";
import { generateFormulationPdf, sanitizeFilenameSlug } from "../../storage";
import type {
  AppLanguage,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  Requirement,
} from "../../types";
import { downloadBinaryFile } from "../../utils/download";
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
  readonly language?: AppLanguage;
}

/**
 * Dialog Ekspor khusus PDF rapi untuk peternak (Laporan Formula Lengkap & Lembar Timbang Gudang).
 */
export function ExportDialog({
  open,
  onClose,
  ingredients,
  nutrientsCatalog = MOCK_NUTRIENTS,
  requirement,
  config,
  result,
  recipeName,
  language = "id",
}: ExportDialogProps) {
  const [notice, setNotice] = useState<{
    readonly tone: "success" | "error";
    readonly text: string;
  } | null>(null);

  const effectiveTitle = (
    recipeName?.trim() ||
    `${requirement.name} (${config.activeBasis === "dry_matter" ? "BK" : "As-Fed"})`
  ).trim();
  const slug = sanitizeFilenameSlug(effectiveTitle);

  const isInfeasibleOrEmpty =
    result.status === "infeasible" || result.status === "error" || result.composition.length === 0;
  const isNearFeasible = result.status === "near_feasible";
  const isOptimal = result.status === "optimal" && result.composition.length > 0;

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
        text: pickLang(
          language,
          `Laporan PDF ${slug}-lengkap.pdf berhasil diunduh.`,
          `PDF report ${slug}-lengkap.pdf downloaded.`,
        ),
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
        text: pickLang(
          language,
          `Lembar Timbang Gudang ${slug}-batch.pdf berhasil diunduh.`,
          `Mill Batch Sheet ${slug}-batch.pdf downloaded.`,
        ),
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat PDF Lembar Timbang.",
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
      title={pickLang(language, "Ekspor Laporan PDF", "Export PDF Report")}
      subtitle={pickLang(
        language,
        "Unduh dokumen PDF siap cetak yang rapi untuk arsip peternak atau operator gudang pakan. Dokumen PDF & cetak selalu memakai latar terang agar mudah dibaca.",
        "Download neat print-ready PDF documents for farm archives or feed mixing operators. PDF & print pages always use a high-contrast light paper layout.",
      )}
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
            <span>{pickLang(language, "Cetak Langsung", "Print Page")}</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setNotice(null);
              onClose();
            }}
          >
            {pickLang(language, "Tutup", "Close")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {isNearFeasible && (
          <div
            role="status"
            className="glass-card flex items-start gap-2.5 rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] p-3 font-medium text-[var(--text-primary)]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
            <div>
              <p className="font-bold">
                {pickLang(
                  language,
                  "Mode Relaksasi Elastik — dokumen bertanda kompromi nutrisi",
                  "Elastic Relaxation Mode — documents carry nutrient compromise notice",
                )}
              </p>
              <p className="mt-0.5 text-[11px] opacity-90">
                {pickLang(
                  language,
                  "PDF Lengkap menyertakan penanda kompromi nutrisi. PDF Lembar Timbang Gudang dikunci hingga formula mencapai status Optimal penuh.",
                  "Full PDF includes compromise warnings. Batch-Only PDF is locked until status is fully Optimal.",
                )}
              </p>
            </div>
          </div>
        )}

        {isInfeasibleOrEmpty && (
          <div
            role="status"
            className="glass-card glass-card-coral flex items-start gap-2.5 rounded-2xl border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3 font-medium text-[var(--text-primary)]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-danger)]" />
            <div>
              <p className="font-bold">
                {pickLang(
                  language,
                  "Ekspor PDF diblokir (Formula belum valid / Infeasible)",
                  "PDF export blocked (Infeasible / Empty status)",
                )}
              </p>
              <p className="mt-0.5 text-[11px] opacity-90">
                {pickLang(
                  language,
                  "Sesuaikan bahan atau target nutrien hingga formula mencapai status Optimal atau Near-Feasible.",
                  "Adjust ingredients or nutrient bounds until a valid solution is reached.",
                )}
              </p>
            </div>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className={
              notice.tone === "success"
                ? "glass-card glass-card-emerald rounded-2xl border border-[var(--status-success-border)] bg-[var(--status-success-soft)] p-3 font-medium text-[var(--text-primary)]"
                : "glass-card glass-card-coral rounded-2xl border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3 font-medium text-[var(--text-primary)]"
            }
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isInfeasibleOrEmpty}
            onClick={handleDownloadPdfFull}
            className="glass-card glass-card-interactive flex min-h-20 cursor-pointer items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50"
          >
            <GlossySquircleIcon tone="petrol" size="sm" icon={<FileText className="h-4 w-4" />} />
            <div>
              <p className="font-bold text-[var(--text-primary)]">
                {pickLang(language, "PDF Lembar Formula Lengkap", "PDF Full Formula Sheet")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {pickLang(
                  language,
                  "Berisi tabel komposisi, berat timbang, biaya per kg & batch, profil nutrien, dan harga bayangan.",
                  "Includes composition table, batch weights, costs, nutrient profile & shadow prices.",
                )}
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={!isOptimal}
            onClick={handleDownloadPdfBatch}
            title={
              isOptimal
                ? pickLang(
                    language,
                    "Unduh PDF instruksi penimbangan gudang tanpa harga & rahasia nutrisi",
                    "Download warehouse weighing PDF without prices or nutrient secrets",
                  )
                : pickLang(language, "Khusus status Optimal", "Optimal status only")
            }
            className="glass-card glass-card-interactive flex min-h-20 cursor-pointer items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50"
          >
            <GlossySquircleIcon tone="amber" size="sm" icon={<Printer className="h-4 w-4" />} />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-bold text-[var(--text-primary)]">
                  {pickLang(language, "PDF Lembar Timbang Gudang", "PDF Print Batch Only")}
                </p>
                <Badge tone="amber">{pickLang(language, "Operator", "Mill")}</Badge>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {isOptimal
                  ? pickLang(
                      language,
                      "Khusus operator adukan: menampilkan daftar bahan, berat kg, dan kotak centang tanpa harga.",
                      "For mixer operators: lists feeds, kg weights, and checkboxes without prices.",
                    )
                  : pickLang(
                      language,
                      "Terkunci — hanya tersedia bila status formulasi Optimal penuh.",
                      "Locked — available only when formulation status is fully Optimal.",
                    )}
              </p>
            </div>
          </button>
        </div>
      </div>
    </SheetDialog>
  );
}
