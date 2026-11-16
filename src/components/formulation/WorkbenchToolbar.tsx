import { memo } from "react";
import {
  BookmarkPlus,
  Download,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
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
  readonly demoScenario: "auto" | "optimal" | "near_feasible" | "infeasible";
  readonly inspectorOpen: boolean;
  readonly onToggleInspector: () => void;
  readonly onSelectPreset: (id: string) => void;
  readonly onSetBasis: (basis: Basis) => void;
  readonly onSetMode: (mode: OptimizationMode) => void;
  readonly onToggleAdvance: (enabled: boolean) => void;
  readonly onToggleZeroInclusion: (enabled: boolean, minPct?: number) => void;
  readonly onToggleElastic: (enabled: boolean) => void;
  readonly onSetDemoScenario: (s: "auto" | "optimal" | "near_feasible" | "infeasible") => void;
  readonly onOpenSaveDialog: () => void;
  readonly onOpenExportDialog: () => void;
  readonly onResetMock: () => void;
}

/**
 * Toolbar & KPI strip ringkas (height: 76px di desktop) agar ruang vertikal above-the-fold
 * langsung memprioritaskan tabel formulasi ransum utama.
 */
export const WorkbenchToolbar = memo(function WorkbenchToolbar({
  requirements,
  activeRequirement,
  config,
  result,
  language,
  demoScenario,
  inspectorOpen,
  onToggleInspector,
  onSelectPreset,
  onSetBasis,
  onSetMode,
  onToggleAdvance,
  onToggleZeroInclusion,
  onToggleElastic,
  onSetDemoScenario,
  onOpenSaveDialog,
  onOpenExportDialog,
  onResetMock,
}: WorkbenchToolbarProps) {
  const statusBadge =
    result.status === "optimal" ? (
      <Badge tone="emerald">Optimal</Badge>
    ) : result.status === "near_feasible" ? (
      <Badge tone="amber">Near-Feasible (Elastik)</Badge>
    ) : (
      <Badge tone="rose">Infeasible</Badge>
    );

  return (
    <section
      aria-label="Kontrol utama formulasi"
      className="flex min-h-[76px] shrink-0 flex-col justify-center gap-1.5 border-b border-[#E2E8F0] bg-white px-3.5 py-1.5 lg:h-[76px] lg:gap-1 lg:px-5 lg:py-1 dark:border-[#1E333D] dark:bg-[#111F26]"
    >
      {/* Baris 1: Judul ringkas + KPI biaya ransum tipis + Aksi utama */}
      <div className="flex flex-wrap items-center justify-between gap-2 lg:h-8 lg:flex-nowrap">
        <div className="no-scrollbar flex min-w-0 items-center gap-3 overflow-x-auto">
          <h1 className="shrink-0 text-sm font-bold tracking-tight text-[#0F172A] dark:text-white">
            {language === "id" ? "Formulasi Ransum" : "Ration Formulation"}
          </h1>

          <div className="flex shrink-0 items-center gap-3 border-l border-[#E2E8F0] pl-3 dark:border-[#1E333D]">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-medium text-[#475569] dark:text-slate-400">
                Biaya / kg ({result.basis === "as_fed" ? "As-Fed" : "BK"})
              </span>
              <span className="text-sm font-bold tabular-nums text-[#D97706] dark:text-amber-400">
                {result.costPerKg !== null ? formatCurrencyIdr(result.costPerKg) : "—"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 border-l border-[#E2E8F0] pl-3 dark:border-[#1E333D]">
              <span className="text-[11px] font-medium text-[#475569] dark:text-slate-400">
                Biaya / {config.batchSizeKg} kg
              </span>
              <span className="text-sm font-bold tabular-nums text-[#059669] dark:text-emerald-400">
                {result.batchTotalCost !== null && result.batchTotalCost !== undefined
                  ? formatCurrencyIdr(result.batchTotalCost)
                  : "—"}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-3 dark:border-[#1E333D]">
              {statusBadge}
              <label className="hidden cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#475569] sm:inline-flex dark:text-slate-300">
                <Switch
                  checked={config.enableElasticFallback}
                  onCheckedChange={onToggleElastic}
                  label="Aktifkan mode toleransi elastik saat target mustahil"
                />
                <span>Elastik</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Select
            aria-label="Simulasi kondisi hasil prototipe"
            value={demoScenario}
            onChange={(e) =>
              onSetDemoScenario(
                e.target.value as "auto" | "optimal" | "near_feasible" | "infeasible",
              )
            }
            className="h-7 min-h-7 w-auto py-0 text-[11px]"
          >
            <option value="auto">Solver HiGHS (Live)</option>
            <option value="optimal">Demo: Optimal 100%</option>
            <option value="near_feasible">Demo: Near-Feasible (Elastik)</option>
            <option value="infeasible">Demo: Infeasible (Konflik)</option>
          </Select>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenExportDialog}
            className="min-h-7 px-2.5 text-[11px] md:min-h-7"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{language === "id" ? "Ekspor" : "Export"}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenSaveDialog}
            className="min-h-7 px-2.5 text-[11px] md:min-h-7"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>{language === "id" ? "Simpan" : "Save"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetMock}
            aria-label="Reset data prototipe"
            title="Reset data prototipe"
            className="neu-pill-btn min-h-7 w-7 rounded-lg p-0 md:min-h-7"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleInspector}
            aria-expanded={inspectorOpen}
            aria-label={
              inspectorOpen ? "Sembunyikan panel target nutrien" : "Tampilkan panel target nutrien"
            }
            title={
              inspectorOpen ? "Sembunyikan panel target nutrien" : "Tampilkan panel target nutrien"
            }
            className="hidden min-h-7 px-2 text-[11px] lg:inline-flex"
          >
            {inspectorOpen ? (
              <PanelRightClose className="h-3.5 w-3.5 text-[#0F3D3E] dark:text-emerald-400" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5 text-[#059669] dark:text-emerald-400" />
            )}
            <span>{inspectorOpen ? "Tutup Target" : "Target Nutrien"}</span>
          </Button>
        </div>
      </div>

      {/* Baris 2: Parameter formulasi dalam strip horizontal tanpa scrollbar */}
      <div className="no-scrollbar flex items-center gap-3 overflow-x-auto lg:h-8">
        <div className="flex shrink-0 items-center gap-1.5">
          <label
            htmlFor="preset-select"
            className="text-[11px] font-semibold whitespace-nowrap text-[#475569] dark:text-slate-300"
          >
            {language === "id" ? "Standar Ternak" : "Livestock Preset"}
          </label>
          <Select
            id="preset-select"
            value={activeRequirement.id}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="h-7 min-h-7 w-auto max-w-52 py-0 text-[11px]"
          >
            {requirements.map((req) => (
              <option key={req.id} value={req.id}>
                {language === "id" ? req.name : (req.nameEn ?? req.name)}
              </option>
            ))}
          </Select>
        </div>

        <div
          role="group"
          aria-label="Pilih basis As-Fed atau Bahan Kering"
          className="inline-flex h-7 shrink-0 items-center rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-0.5 dark:border-[#1E333D] dark:bg-[#0B1519]"
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
                    ? "bg-white text-[#0F172A] shadow-2xs dark:bg-[#111F26] dark:text-white"
                    : "text-[#475569] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white",
                )}
              >
                {basis === "as_fed" ? "As-Fed" : "BK (DM)"}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] font-semibold whitespace-nowrap text-[#475569] dark:text-slate-300">
            {language === "id" ? "Mode" : "Mode"}
          </span>
          <OptimizationModeSelector
            value={config.optimizationMode}
            onChange={onSetMode}
            language={language}
          />
        </div>

        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap text-[#0F172A] dark:text-slate-200">
          <Switch
            checked={config.enableAdvanceNutrients}
            onCheckedChange={onToggleAdvance}
            label="Aktifkan Mode Presisi Tinggi Advance"
          />
          <span className="inline-flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3 text-[#059669] dark:text-emerald-400" />
            Advance (AA/NDF/ANF)
          </span>
        </label>

        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap text-[#0F172A] dark:text-slate-200">
          <Switch
            checked={config.globalZeroInclusion.enforceNonZero}
            onCheckedChange={(checked) =>
              onToggleZeroInclusion(checked, config.globalZeroInclusion.minIfSelected ?? 1)
            }
            label="Aktifkan Aturan Anti-Nol Global"
          />
          <span>Anti-Nol ({config.globalZeroInclusion.minIfSelected ?? 1}%)</span>
        </label>
      </div>
    </section>
  );
});
