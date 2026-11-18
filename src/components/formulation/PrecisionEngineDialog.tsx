import { FlaskConical, Gauge, RotateCcw, Sliders } from "lucide-react";
import type {
  AppLanguage,
  EnzymeConfig,
  FormulationConfig,
  Nutrient,
  NutrientId,
} from "../../types";
import { pickLang } from "../../i18n";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { SheetDialog } from "../ui/SheetDialog";
import { Switch } from "../ui/Switch";

export interface PrecisionEngineDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly config: FormulationConfig;
  readonly allNutrients: readonly Nutrient[];
  readonly stochasticIterations?: number | undefined;
  readonly language: AppLanguage;
  readonly onUpdatePrecision: (patch: {
    readonly fractionalObjective?: FormulationConfig["fractionalObjective"] | null;
    readonly enableStochasticSlp?: boolean;
    readonly stochasticMaxIter?: number;
    readonly stochasticDamping?: number;
    readonly stochasticTolerance?: number;
    readonly enzymes?: FormulationConfig["enzymes"] | null;
    readonly enzymeSubAdditiveCap?: number | null;
  }) => void;
}

const ENZYME_PRESETS: ReadonlyArray<{
  readonly id: string;
  readonly type: EnzymeConfig["type"];
  readonly labelId: string;
  readonly labelEn: string;
  readonly matrix: Readonly<Record<NutrientId, number>>;
  readonly substrateNutrientId?: NutrientId;
}> = [
  {
    id: "preset-phytase",
    type: "phytase",
    labelId: "Fitase (AvP +0,12% · Ca +0,10%)",
    labelEn: "Phytase (AvP +0.12% · Ca +0.10%)",
    matrix: { avp: 0.12, p: 0.1, ca: 0.1 },
    substrateNutrientId: "phytate_p",
  },
  {
    id: "preset-xylanase",
    type: "xylanase",
    labelId: "Xilanase (ME Unggas +80 kcal/kg)",
    labelEn: "Xylanase (Poultry ME +80 kcal/kg)",
    matrix: { me_poultry: 80, tdn: 1.5 },
  },
  {
    id: "preset-protease",
    type: "protease",
    labelId: "Protease (PK +0,80% · SID Lys +0,04%)",
    labelEn: "Protease (CP +0.80% · SID Lys +0.04%)",
    matrix: { cp: 0.8, sid_lys: 0.04, lys: 0.04 },
  },
];

export function PrecisionEngineDialog({
  open,
  onClose,
  config,
  allNutrients,
  stochasticIterations,
  language,
  onUpdatePrecision,
}: PrecisionEngineDialogProps) {
  const activeEnzymes = config.enzymes ?? [];
  const capPsi = config.enzymeSubAdditiveCap ?? 1;

  const toggleEnzymePreset = (preset: (typeof ENZYME_PRESETS)[number]) => {
    const exists = activeEnzymes.some((e) => e.id === preset.id);
    const next = exists
      ? activeEnzymes.filter((e) => e.id !== preset.id)
      : [
          ...activeEnzymes,
          {
            id: preset.id,
            type: preset.type,
            matrix: preset.matrix,
            thermalRetention: 0.85,
            inclusionFraction: 1,
            ...(preset.substrateNutrientId
              ? { substrateNutrientId: preset.substrateNutrientId }
              : {}),
          },
        ];
    onUpdatePrecision({ enzymes: next });
  };

  const updateEnzymeRetention = (id: string, thermalRetention: number) => {
    const clamped = Math.min(1, Math.max(0, thermalRetention));
    onUpdatePrecision({
      enzymes: activeEnzymes.map((e) => (e.id === id ? { ...e, thermalRetention: clamped } : e)),
    });
  };

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={pickLang(
        language,
        "Modul Presisi Solver (PR-03 · PR-04 · PR-05)",
        "Precision Solver Modules (PR-03 · PR-04 · PR-05)",
      )}
      subtitle={pickLang(
        language,
        "Berjalan 100% offline di Web Worker HiGHS WASM tanpa mengganggu kesederhanaan grid utama.",
        "Runs 100% offline inside the HiGHS WASM Web Worker.",
      )}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onUpdatePrecision({
                fractionalObjective: null,
                enableStochasticSlp: false,
                enzymes: null,
                enzymeSubAdditiveCap: null,
              })
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{pickLang(language, "Reset Modul Presisi", "Reset Precision Modules")}</span>
          </Button>
          <Button variant="primary" size="md" onClick={onClose}>
            {pickLang(language, "Selesai", "Done")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* PR-03: Fractional LP Objective */}
        <div className="glass-card rounded-2xl p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#0E7490] dark:text-cyan-300" />
              <h3 className="font-bold text-[#0F172A] dark:text-white">
                {pickLang(
                  language,
                  "PR-03 · Sasaran Objektif Fraksional (Charnes–Cooper)",
                  "PR-03 · Fractional Objective (Charnes–Cooper)",
                )}
              </h3>
            </div>
            <Badge tone={config.fractionalObjective ? "emerald" : "neutral"}>
              {config.fractionalObjective
                ? pickLang(language, "Aktif", "Active")
                : pickLang(language, "Standar Rp/kg", "Standard Cost/kg")}
            </Badge>
          </div>
          <p className="mb-2.5 text-[11px] text-[#475569] dark:text-slate-300">
            {pickLang(
              language,
              "Minimalkan biaya per unit energi atau asam amino (Rp/Mcal atau Rp/% nutrien) melalui iterasi Dinkelbach dengan pelindung penyebut 0/0.",
              "Minimize cost per unit of energy or amino acid using Dinkelbach iterations with 0/0 denominator protection.",
            )}
          </p>
          <Select
            aria-label={pickLang(
              language,
              "Sasaran objektif formulasi",
              "Formulation objective target",
            )}
            value={config.fractionalObjective?.nutrientId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onUpdatePrecision({
                fractionalObjective: val ? { mode: "cost_per_nutrient", nutrientId: val } : null,
              });
            }}
          >
            <option value="">
              {pickLang(
                language,
                "Least-Cost Standar (Biaya / kg pakan)",
                "Standard Least-Cost (Cost / kg feed)",
              )}
            </option>
            {allNutrients.map((nut) => (
              <option key={nut.id} value={nut.id}>
                {pickLang(language, "Biaya /", "Cost /")}{" "}
                {language === "id" ? nut.name : (nut.nameEn ?? nut.name)} ({nut.unit})
              </option>
            ))}
          </Select>
        </div>

        {/* PR-04: Stochastic SLP */}
        <div className="glass-card rounded-2xl p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#D97706] dark:text-amber-300" />
              <h3 className="font-bold text-[#0F172A] dark:text-white">
                {pickLang(
                  language,
                  "PR-04 · Formulasi Stokastik (Munford SLP & Cantelli)",
                  "PR-04 · Stochastic Formulation (Munford SLP & Cantelli)",
                )}
              </h3>
            </div>
            <Switch
              checked={config.enableStochasticSlp === true}
              onCheckedChange={(checked) => onUpdatePrecision({ enableStochasticSlp: checked })}
              label={pickLang(
                language,
                "Aktifkan formulasi stokastik SLP",
                "Enable stochastic SLP formulation",
              )}
            />
          </div>
          <p className="mb-2.5 text-[11px] text-[#475569] dark:text-slate-300">
            {pickLang(
              language,
              "Memperhitungkan simpangan baku nutrien bahan (σ di Detail Bahan) dan varians kebutuhan ternak (di panel Target Nutrien).",
              "Accounts for ingredient nutrient std-dev (σ in Ingredient Detail) and requirement variance (in Nutrient Targets).",
            )}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="stochastic-max-iter"
                className="mb-1 block text-[11px] font-semibold text-[#0F172A] dark:text-slate-200"
              >
                {pickLang(language, "Maks Iterasi SLP", "Max SLP Iterations")}
              </label>
              <Input
                id="stochastic-max-iter"
                type="number"
                min={1}
                max={40}
                value={config.stochasticMaxIter ?? 12}
                disabled={config.enableStochasticSlp !== true}
                onChange={(e) =>
                  onUpdatePrecision({
                    stochasticMaxIter: Math.max(1, Math.min(40, Number(e.target.value) || 12)),
                  })
                }
              />
            </div>
            <div>
              <label
                htmlFor="stochastic-damping"
                className="mb-1 block text-[11px] font-semibold text-[#0F172A] dark:text-slate-200"
              >
                {pickLang(language, "Redaman α (0,1–1,0)", "Damping α (0.1–1.0)")}
              </label>
              <Input
                id="stochastic-damping"
                type="number"
                step="0.1"
                min={0.1}
                max={1}
                value={config.stochasticDamping ?? 0.5}
                disabled={config.enableStochasticSlp !== true}
                onChange={(e) =>
                  onUpdatePrecision({
                    stochasticDamping: Math.min(1, Math.max(0.1, Number(e.target.value) || 0.5)),
                  })
                }
              />
            </div>
          </div>
          {config.enableStochasticSlp === true && stochasticIterations !== undefined && (
            <p className="mt-2 text-[11px] font-medium text-[#059669] dark:text-emerald-300">
              {pickLang(
                language,
                `Terakhir konvergen dalam ${stochasticIterations} iterasi SLP.`,
                `Last solved in ${stochasticIterations} SLP iterations.`,
              )}
            </p>
          )}
        </div>

        {/* PR-05: Multi-Enzyme Matrix */}
        <div className="glass-card rounded-2xl p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-[#059669] dark:text-emerald-300" />
              <h3 className="font-bold text-[#0F172A] dark:text-white">
                {pickLang(
                  language,
                  "PR-05 · Matriks Multi-Enzim Sub-Aditif",
                  "PR-05 · Sub-Additive Multi-Enzyme Matrix",
                )}
              </h3>
            </div>
            <Badge tone={activeEnzymes.length > 0 ? "emerald" : "neutral"}>
              {activeEnzymes.length} {pickLang(language, "enzim aktif", "active")}
            </Badge>
          </div>
          <p className="mb-2.5 text-[11px] text-[#475569] dark:text-slate-300">
            {pickLang(
              language,
              "Menambahkan uplift nutrien sesuai retensi termal peleting dan plafon anti hitung ganda ψ.",
              "Applies nutrient uplift scaled by pelleting thermal retention and anti-double-counting cap ψ.",
            )}
          </p>

          <div className="space-y-2">
            {ENZYME_PRESETS.map((preset) => {
              const active = activeEnzymes.find((e) => e.id === preset.id);
              return (
                <div
                  key={preset.id}
                  className="neu-well flex flex-wrap items-center justify-between gap-2 rounded-xl p-2.5"
                >
                  <label className="flex cursor-pointer items-center gap-2 font-semibold text-[#0F172A] dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={Boolean(active)}
                      onChange={() => toggleEnzymePreset(preset)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#059669]"
                    />
                    <span>{language === "id" ? preset.labelId : preset.labelEn}</span>
                  </label>

                  {active && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-[#475569] dark:text-slate-300">
                        {pickLang(language, "Retensi Termal:", "Thermal Ret.:")}
                      </span>
                      <Select
                        aria-label={`${preset.type} thermal retention`}
                        value={String(active.thermalRetention ?? 0.85)}
                        onChange={(e) => updateEnzymeRetention(preset.id, Number(e.target.value))}
                        className="h-7 min-h-7 w-28 py-0 text-[11px]"
                      >
                        <option value="1">100% (Mash)</option>
                        <option value="0.85">85% (Pellet 80°C)</option>
                        <option value="0.7">70% (Pellet 90°C)</option>
                        <option value="0.5">50% (Extruder)</option>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-2.5 dark:border-[#1E333D]">
            <span className="text-[11px] font-semibold text-[#0F172A] dark:text-slate-200">
              {pickLang(
                language,
                "Plafon Sub-Aditif Gabungan (ψ)",
                "Combined Sub-Additive Cap (ψ)",
              )}
            </span>
            <Select
              aria-label={pickLang(language, "Plafon sub-aditif enzim", "Enzyme sub-additive cap")}
              value={String(capPsi)}
              onChange={(e) => onUpdatePrecision({ enzymeSubAdditiveCap: Number(e.target.value) })}
              className="h-7 min-h-7 w-36 py-0 text-[11px]"
            >
              <option value="1">1.00 (100% Aditif)</option>
              <option value="0.85">0.85 (85% Cap)</option>
              <option value="0.7">0.70 (70% Cap)</option>
              <option value="0.5">0.50 (50% Cap)</option>
            </Select>
          </div>
        </div>
      </div>
    </SheetDialog>
  );
}
