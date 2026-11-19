import { memo, useMemo } from "react";
import { BookmarkPlus, ChevronsLeft, ChevronsRight, Download, RotateCcw } from "lucide-react";
import { getFormulationStatusLabel, pickLang } from "../../i18n";
import type {
  AppLanguage,
  Basis,
  FormulationConfig,
  FormulationResult,
  OptimizationMode,
  Requirement,
} from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { OptimizationModeSelector } from "./OptimizationModeSelector";

export interface WorkbenchToolbarProps {
  readonly requirements: readonly Requirement[];
  readonly activeRequirement: Requirement;
  readonly config: FormulationConfig;
  readonly result: FormulationResult;
  readonly language: AppLanguage;
  readonly simpleMode: boolean;
  readonly inspectorOpen: boolean;
  readonly onToggleInspector: () => void;
  readonly onSelectPreset: (id: string) => void;
  readonly onSetBasis: (basis: Basis) => void;
  readonly onSetMode: (mode: OptimizationMode) => void;
  readonly onToggleAdvance: (enabled: boolean) => void;
  readonly onToggleElastic: (enabled: boolean) => void;
  readonly onOpenSaveDialog: () => void;
  readonly onOpenExportDialog: () => void;
  readonly onResetMock: () => void;
}

interface RequirementGroups {
  readonly quick: readonly Requirement[];
  readonly sniPoultry: readonly Requirement[];
  readonly sniRuminant: readonly Requirement[];
  readonly kearl: readonly Requirement[];
  readonly nrcDairy: readonly Requirement[];
  readonly custom: readonly Requirement[];
}

function groupRequirements(requirements: readonly Requirement[]): RequirementGroups {
  const quick: Requirement[] = [];
  const sniPoultry: Requirement[] = [];
  const sniRuminant: Requirement[] = [];
  const kearl: Requirement[] = [];
  const nrcDairy: Requirement[] = [];
  const custom: Requirement[] = [];

  for (const req of requirements) {
    if (req.id === "broiler-starter" || req.id === "layer-peak" || req.id === "beef-fattening") {
      quick.push(req);
    } else if (req.id.startsWith("sni-")) {
      if (req.basis === "dry_matter") {
        sniRuminant.push(req);
      } else {
        sniPoultry.push(req);
      }
    } else if (req.id.startsWith("kearl")) {
      kearl.push(req);
    } else if (req.id.startsWith("nrc88-")) {
      nrcDairy.push(req);
    } else {
      custom.push(req);
    }
  }

  return { quick, sniPoultry, sniRuminant, kearl, nrcDairy, custom };
}

/**
 * Toolbar & KPI strip ringkas untuk Workbench Formulasi Desktop.
 * Opsi lanjutan (Anti-Nol otomatis & Presisi LP) dipindah ke menu Pengaturan agar area utama bersih.
 */
export const WorkbenchToolbar = memo(function WorkbenchToolbar({
  requirements,
  activeRequirement,
  config,
  result,
  language,
  simpleMode,
  inspectorOpen,
  onToggleInspector,
  onSelectPreset,
  onSetBasis,
  onSetMode,
  onToggleAdvance,
  onToggleElastic,
  onOpenSaveDialog,
  onOpenExportDialog,
  onResetMock,
}: WorkbenchToolbarProps) {
  const groupedReqs = useMemo(() => groupRequirements(requirements), [requirements]);

  const statusBadge =
    result.status === "optimal" ? (
      <Badge tone="emerald">{getFormulationStatusLabel(language, "optimal")}</Badge>
    ) : result.status === "near_feasible" ? (
      <Badge tone="amber">{getFormulationStatusLabel(language, "near_feasible")}</Badge>
    ) : (
      <Badge tone="rose">{getFormulationStatusLabel(language, result.status)}</Badge>
    );

  return (
    <section
      aria-label={pickLang(language, "Kontrol utama formulasi", "Main formulation controls")}
      className="flex min-h-[76px] shrink-0 flex-col justify-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 lg:gap-1.5 lg:px-5"
    >
      {/* Baris 1: Judul ringkas + KPI biaya + Status & Elastik + Aksi utama */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="shrink-0 text-sm font-bold tracking-tight text-[var(--text-primary)]">
            {pickLang(language, "Formulasi Ransum", "Ration Formulation")}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:border-l sm:border-[var(--border-subtle)] sm:pl-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {pickLang(language, "Biaya / kg", "Cost / kg")} (
                {result.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")})
              </span>
              <span className="text-sm font-bold tabular-nums text-[var(--status-warning)]">
                {result.costPerKg !== null ? formatCurrencyIdr(result.costPerKg) : "—"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 sm:border-l sm:border-[var(--border-subtle)] sm:pl-3">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {pickLang(language, "Biaya", "Cost")} / {config.batchSizeKg} kg
              </span>
              <span className="text-sm font-bold tabular-nums text-[var(--status-success)]">
                {result.batchTotalCost !== null && result.batchTotalCost !== undefined
                  ? formatCurrencyIdr(result.batchTotalCost)
                  : "—"}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-[var(--border-subtle)] pl-3">
              {statusBadge}
              <label
                title={pickLang(
                  language,
                  "Jika target nutrisi terlalu ketat, mode Elastik melonggarkan sedikit batas agar tetap menghasilkan racikan terdekat.",
                  "When targets are too tight, Elastic mode slightly relaxes bounds to still produce the closest feasible diet.",
                )}
                className="hidden cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] sm:inline-flex"
              >
                <Switch
                  checked={config.enableElasticFallback}
                  onCheckedChange={onToggleElastic}
                  label={pickLang(
                    language,
                    "Aktifkan mode toleransi elastik saat target mustahil",
                    "Enable elastic relaxation mode when target is infeasible",
                  )}
                />
                <span>{pickLang(language, "Elastik", "Elastic")}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-1.5 lg:shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenExportDialog}
            className="min-h-7 px-2.5 text-[11px] md:min-h-7"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>{pickLang(language, "Ekspor PDF", "Export PDF")}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenSaveDialog}
            className="min-h-7 px-2.5 text-[11px] md:min-h-7"
          >
            <BookmarkPlus className="h-3.5 w-3.5 shrink-0" />
            <span>{pickLang(language, "Simpan", "Save")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetMock}
            aria-label={pickLang(language, "Reset data prototipe", "Reset sample data")}
            title={pickLang(language, "Reset ke data awal", "Reset to initial data")}
            className="neu-pill-btn min-h-7 rounded-lg px-2 md:min-h-7"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleInspector}
            aria-expanded={inspectorOpen}
            aria-label={
              inspectorOpen
                ? pickLang(
                    language,
                    "Sembunyikan panel target nutrien",
                    "Hide nutrient targets panel",
                  )
                : pickLang(
                    language,
                    "Tampilkan panel target nutrien",
                    "Show nutrient targets panel",
                  )
            }
            title={
              inspectorOpen
                ? pickLang(
                    language,
                    "Sembunyikan panel target nutrien",
                    "Hide nutrient targets panel",
                  )
                : pickLang(
                    language,
                    "Tampilkan panel target nutrien",
                    "Show nutrient targets panel",
                  )
            }
            className="hidden min-h-7 px-2.5 text-[11px] lg:inline-flex"
          >
            {inspectorOpen ? (
              <>
                <span>{pickLang(language, "Tutup Target", "Hide Targets")}</span>
                <ChevronsRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
              </>
            ) : (
              <>
                <ChevronsLeft className="h-3.5 w-3.5 shrink-0 text-[var(--status-success)]" />
                <span>{pickLang(language, "Target Nutrien", "Nutrient Targets")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Baris 2: Standar Ternak (SNI + Kearl + NRC), Basis, Mode Optimasi, dan Mode Simpel/Lanjutan */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex shrink-0 items-center gap-1.5">
          <label
            htmlFor="preset-select"
            className="text-[11px] font-semibold whitespace-nowrap text-[var(--text-secondary)]"
          >
            {pickLang(language, "Standar Ternak", "Livestock Preset")}
          </label>
          <Select
            id="preset-select"
            value={activeRequirement.id}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="h-7 min-h-7 w-auto max-w-68 py-0 text-[11px]"
          >
            {groupedReqs.custom.length > 0 && (
              <optgroup label={pickLang(language, "Profil Kustom Anda", "Your Custom Profiles")}>
                {groupedReqs.custom.map((req) => (
                  <option key={req.id} value={req.id}>
                    {language === "id" ? req.name : (req.nameEn ?? req.name)}
                  </option>
                ))}
              </optgroup>
            )}
            {groupedReqs.quick.length > 0 && (
              <optgroup label={pickLang(language, "Standar Cepat", "Quick Presets")}>
                {groupedReqs.quick.map((req) => (
                  <option key={req.id} value={req.id}>
                    {language === "id" ? req.name : (req.nameEn ?? req.name)}
                  </option>
                ))}
              </optgroup>
            )}
            {groupedReqs.sniPoultry.length > 0 && (
              <optgroup
                label={pickLang(
                  language,
                  "Standar SNI Unggas (2013–2017)",
                  "SNI Poultry Standards (2013–2017)",
                )}
              >
                {groupedReqs.sniPoultry.map((req) => (
                  <option key={req.id} value={req.id}>
                    {language === "id" ? req.name : (req.nameEn ?? req.name)}
                  </option>
                ))}
              </optgroup>
            )}
            {groupedReqs.sniRuminant.length > 0 && (
              <optgroup
                label={pickLang(
                  language,
                  "Standar SNI Ruminansia (2017–2019)",
                  "SNI Ruminant Standards (2017–2019)",
                )}
              >
                {groupedReqs.sniRuminant.map((req) => (
                  <option key={req.id} value={req.id}>
                    {language === "id" ? req.name : (req.nameEn ?? req.name)}
                  </option>
                ))}
              </optgroup>
            )}
            {groupedReqs.kearl.length > 0 && (
              <optgroup
                label={pickLang(
                  language,
                  "Kearl (1982) — Ruminansia Tropis",
                  "Kearl (1982) — Tropical Ruminants",
                )}
              >
                {groupedReqs.kearl.map((req) => (
                  <option key={req.id} value={req.id}>
                    {language === "id" ? req.name : (req.nameEn ?? req.name)}
                  </option>
                ))}
              </optgroup>
            )}
            {groupedReqs.nrcDairy.length > 0 && (
              <optgroup label="NRC (1988) — Dairy Cattle">
                {groupedReqs.nrcDairy.map((req) => (
                  <option key={req.id} value={req.id}>
                    {language === "id" ? req.name : (req.nameEn ?? req.name)}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </div>

        <div
          role="group"
          aria-label={pickLang(
            language,
            "Pilih basis As-Fed atau Bahan Kering",
            "Select As-Fed or Dry Matter basis",
          )}
          className="neu-pressed inline-flex h-7 shrink-0 items-center rounded-lg p-0.5"
        >
          {(["as_fed", "dry_matter"] as const).map((basis) => {
            const active = config.activeBasis === basis;
            return (
              <button
                key={basis}
                type="button"
                aria-pressed={active}
                onClick={() => onSetBasis(basis)}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                  active
                    ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {basis === "as_fed" ? "As-Fed" : pickLang(language, "BK (DM)", "DM")}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] font-semibold whitespace-nowrap text-[var(--text-secondary)]">
            Mode
          </span>
          <OptimizationModeSelector
            value={config.optimizationMode}
            onChange={onSetMode}
            language={language}
          />
        </div>

        {/* Toggle Mode Simpel vs Mode Lanjutan (sinkron dengan menu Pengaturan) */}
        <div
          role="group"
          aria-label={pickLang(
            language,
            "Pilih Mode Simpel atau Mode Lanjutan",
            "Select Simple or Advanced Mode",
          )}
          className="neu-pressed inline-flex h-7 shrink-0 items-center rounded-lg p-0.5"
        >
          <button
            type="button"
            aria-pressed={simpleMode}
            onClick={() => onToggleAdvance(false)}
            title={pickLang(
              language,
              "Mode Simpel: singkatan nutrisi (PK, EM, TDN, LK, SK) dan kolom ringkas",
              "Simple Mode: abbreviated nutrient labels and compact columns",
            )}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
              simpleMode
                ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {pickLang(language, "Mode Simpel", "Simple Mode")}
          </button>
          <button
            type="button"
            aria-pressed={!simpleMode}
            onClick={() => onToggleAdvance(true)}
            title={pickLang(
              language,
              "Mode Lanjutan: nama nutrisi lengkap termasuk Asam Amino, NDF/ADF, dan ANF",
              "Advanced Mode: full nutrient names including Amino Acids, NDF/ADF, and ANF",
            )}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
              !simpleMode
                ? "bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {pickLang(language, "Mode Lanjutan", "Advanced Mode")}
          </button>
        </div>
      </div>
    </section>
  );
});
