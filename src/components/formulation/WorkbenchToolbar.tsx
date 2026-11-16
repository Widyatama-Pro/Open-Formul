import { BookmarkPlus, Download, RotateCcw, SlidersHorizontal } from "lucide-react";
import type {
  AppLanguage,
  Basis,
  FormulationConfig,
  OptimizationMode,
  Requirement,
} from "../../types";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { OptimizationModeSelector } from "./OptimizationModeSelector";

export interface WorkbenchToolbarProps {
  readonly requirements: readonly Requirement[];
  readonly activeRequirement: Requirement;
  readonly config: FormulationConfig;
  readonly language: AppLanguage;
  readonly demoScenario: "auto" | "optimal" | "near_feasible" | "infeasible";
  readonly onSelectPreset: (id: string) => void;
  readonly onSetBasis: (basis: Basis) => void;
  readonly onSetMode: (mode: OptimizationMode) => void;
  readonly onToggleAdvance: (enabled: boolean) => void;
  readonly onToggleZeroInclusion: (enabled: boolean, minPct?: number) => void;
  readonly onSetDemoScenario: (s: "auto" | "optimal" | "near_feasible" | "infeasible") => void;
  readonly onOpenSaveDialog: () => void;
  readonly onOpenExportDialog: () => void;
  readonly onResetMock: () => void;
}

export function WorkbenchToolbar({
  requirements,
  activeRequirement,
  config,
  language,
  demoScenario,
  onSelectPreset,
  onSetBasis,
  onSetMode,
  onToggleAdvance,
  onToggleZeroInclusion,
  onSetDemoScenario,
  onOpenSaveDialog,
  onOpenExportDialog,
  onResetMock,
}: WorkbenchToolbarProps) {
  return (
    <section
      aria-label="Kontrol utama formulasi"
      className="border-b border-white/65 bg-white/45 px-4 py-3 backdrop-blur-md lg:px-6 dark:border-cyan-200/10 dark:bg-[#0A2530]/55"
    >
      {/* Baris judul bergaya referensi + tombol aksi utama */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#5B7684] dark:text-cyan-200/75">
            {language === "id" ? "Workspace Formulasi" : "Formulation Workspace"}
          </p>
          <h1 className="truncate text-xl font-bold tracking-[-0.025em] text-[#122B36] dark:text-white">
            {language === "id" ? "Formulasi Ransum" : "Ration Formulation"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Simulasi kondisi hasil prototipe"
            value={demoScenario}
            onChange={(e) =>
              onSetDemoScenario(
                e.target.value as "auto" | "optimal" | "near_feasible" | "infeasible",
              )
            }
            className="w-auto text-xs"
          >
            <option value="auto">Solver HiGHS (Live)</option>
            <option value="optimal">Demo: Optimal 100%</option>
            <option value="near_feasible">Demo: Near-Feasible (Elastik)</option>
            <option value="infeasible">Demo: Infeasible (Konflik)</option>
          </Select>

          <Button variant="secondary" size="sm" onClick={onOpenExportDialog}>
            <Download className="h-3.5 w-3.5" />
            <span>{language === "id" ? "Ekspor" : "Export"}</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenSaveDialog}>
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>{language === "id" ? "Simpan" : "Save"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetMock}
            aria-label="Reset data prototipe"
            title="Reset data prototipe"
            className="neu-pill-btn rounded-full px-2.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Bar kontrol input formulasi */}
      <div className="glass-card rounded-2xl px-3.5 py-2.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-start lg:gap-4">
          {/* Preset Standar Ternak */}
          <div className="min-w-0 sm:min-w-52">
            <label
              htmlFor="preset-select"
              className="mb-1 block text-[11px] font-semibold text-[#54707E] dark:text-slate-300"
            >
              {language === "id" ? "Standar Ternak" : "Livestock Preset"}
            </label>
            <Select
              id="preset-select"
              value={activeRequirement.id}
              onChange={(e) => onSelectPreset(e.target.value)}
            >
              {requirements.map((req) => (
                <option key={req.id} value={req.id}>
                  {language === "id" ? req.name : (req.nameEn ?? req.name)}
                </option>
              ))}
            </Select>
          </div>

          {/* Toggle Basis As-Fed vs BK */}
          <div>
            <span className="mb-1 block text-[11px] font-semibold text-[#54707E] dark:text-slate-300">
              {language === "id" ? "Basis Hitung" : "Basis"}
            </span>
            <div
              role="group"
              aria-label="Pilih basis As-Fed atau Bahan Kering"
              className="neu-well inline-flex min-h-11 w-full rounded-xl p-1 md:min-h-8 md:w-auto"
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
                      "flex-1 cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color,color] duration-150 active:scale-[0.97] md:flex-none motion-reduce:transform-none",
                      active
                        ? "bg-white text-[#0E4452] shadow-[-2px_-2px_5px_rgba(255,255,255,0.9),_2px_3px_8px_rgba(14,68,82,0.12)] dark:bg-[#134659] dark:text-white"
                        : "text-[#54707E] hover:text-[#122B36] dark:text-slate-300 dark:hover:text-white",
                    )}
                  >
                    {basis === "as_fed" ? "As-Fed" : "BK (DM)"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Mode Optimasi */}
          <div className="min-w-0">
            <span className="mb-1 block text-[11px] font-semibold text-[#54707E] dark:text-slate-300">
              {language === "id" ? "Mode Optimasi" : "Optimization Mode"}
            </span>
            <OptimizationModeSelector
              value={config.optimizationMode}
              onChange={onSetMode}
              language={language}
            />
          </div>

          {/* Mode Advance & Anti-Nol Global */}
          <div className="flex flex-wrap items-center gap-4 pt-1 sm:col-span-2 lg:col-span-1 lg:pt-5">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-[#234350] md:min-h-8 dark:text-slate-200">
              <Switch
                checked={config.enableAdvanceNutrients}
                onCheckedChange={onToggleAdvance}
                label="Aktifkan Mode Presisi Tinggi Advance"
              />
              <span className="inline-flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-300" />
                Advance (AA/NDF/ANF)
              </span>
            </label>

            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-[#234350] md:min-h-8 dark:text-slate-200">
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
        </div>
      </div>
    </section>
  );
}
