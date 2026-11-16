import { memo, useState } from "react";
import { AlertTriangle, PanelRightClose, Plus, Trash2, X } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import type { ConstraintPatch } from "../../hooks/use-prototype-store";
import type {
  AppLanguage,
  Basis,
  ConflictDiagnostic,
  Nutrient,
  NutrientResult,
  NutrientUnit,
  Requirement,
} from "../../types";
import { cn } from "../../utils/cn";
import { formatNumberLocale, parseLocaleDecimal } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { NutrientStatusBadge } from "./NutrientStatusBadge";
import { NumericCellInput } from "./NumericCellInput";
import { RatioConstraintsSection } from "./RatioConstraintsSection";

export interface NutrientTargetsPanelProps {
  readonly requirement: Requirement;
  readonly allNutrients?: readonly Nutrient[];
  readonly activeBasis: Basis;
  readonly enableAdvance: boolean;
  readonly enableDigestible: boolean;
  readonly onToggleDigestible: (val: boolean) => void;
  readonly nutrientResults: readonly NutrientResult[];
  readonly conflicts: readonly ConflictDiagnostic[];
  readonly language: AppLanguage;
  readonly onUpdateConstraint: (nutrientId: string, patch: ConstraintPatch) => void;
  readonly onAddCustomNutrient?: (input: {
    readonly name: string;
    readonly unit: NutrientUnit;
    readonly defaultBasis?: Basis;
    readonly min?: number;
    readonly max?: number;
  }) => { readonly ok: boolean; readonly error?: string };
  readonly onRemoveCustomNutrient?: (nutrientId: string) => void;
  readonly onUpdateCustomNutrientBasis?: (nutrientId: string, defaultBasis: Basis) => void;
  readonly onCollapse?: () => void;
}

const NUTRIENT_UNITS: readonly NutrientUnit[] = [
  "%",
  "kcal/kg",
  "MJ/kg",
  "mg/kg",
  "IU/kg",
  "mEq/kg",
];

/**
 * Panel inspector Target Nutrien ramping (maks 310px di desktop) dengan scrollbar ultra-tipis
 * dan tata letak ringkas bebas overflow horizontal.
 */
export const NutrientTargetsPanel = memo(function NutrientTargetsPanel({
  requirement,
  allNutrients = MOCK_NUTRIENTS,
  activeBasis,
  enableAdvance,
  enableDigestible,
  onToggleDigestible,
  nutrientResults,
  conflicts,
  language,
  onUpdateConstraint,
  onAddCustomNutrient,
  onRemoveCustomNutrient,
  onUpdateCustomNutrientBasis,
  onCollapse,
}: NutrientTargetsPanelProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState<NutrientUnit>("%");
  const [customBasis, setCustomBasis] = useState<Basis>(activeBasis);
  const [customMinRaw, setCustomMinRaw] = useState("");
  const [customMaxRaw, setCustomMaxRaw] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const resultMap = new Map<string, NutrientResult>(nutrientResults.map((r) => [r.nutrientId, r]));
  const achievedMap = new Map<string, number>(nutrientResults.map((r) => [r.nutrientId, r.value]));

  const visibleNutrients = allNutrients.filter((nut) => {
    if (nut.isCustom) return true;
    const isBasic = (nut.tier ?? "basic") === "basic";
    if (isBasic) return true;
    if (!enableAdvance) return false;
    if (nut.isDigestibleVariant && !enableDigestible) return false;
    return true;
  });

  const handleSaveCustom = () => {
    if (!onAddCustomNutrient) return;
    const minVal =
      customMinRaw.trim() !== ""
        ? parseLocaleDecimal(customMinRaw, { treatSingleThousandDot: false })
        : undefined;
    const maxVal =
      customMaxRaw.trim() !== ""
        ? parseLocaleDecimal(customMaxRaw, { treatSingleThousandDot: false })
        : undefined;
    if (minVal === null || maxVal === null) {
      setCustomError("Nilai Min/Max harus berupa angka valid.");
      return;
    }
    const res = onAddCustomNutrient({
      name: customName,
      unit: customUnit,
      defaultBasis: customBasis,
      ...(minVal !== undefined ? { min: minVal } : {}),
      ...(maxVal !== undefined ? { max: maxVal } : {}),
    });
    if (!res.ok) {
      setCustomError(res.error ?? "Gagal menambah nutrien kustom.");
      return;
    }
    setCustomName("");
    setCustomMinRaw("");
    setCustomMaxRaw("");
    setCustomError(null);
    setShowCustomForm(false);
  };

  const advanceNullWarning = conflicts.find((c) => c.code === "ADVANCE_NULL_DATA");

  return (
    <Card interactive={false} className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[#E2E8F0] px-3 py-2.5 dark:border-[#1E333D]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-xs font-bold tracking-tight text-[#0F172A] dark:text-white">
            {language === "id" ? "Target Nutrien" : "Nutrient Targets"}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            {onAddCustomNutrient && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCustomBasis(activeBasis);
                  setShowCustomForm((prev) => !prev);
                  setCustomError(null);
                }}
                aria-label="Tambah Nutrien Kustom"
                className="min-h-7 px-2 text-[11px] md:min-h-7"
              >
                {showCustomForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                <span>{showCustomForm ? "Tutup" : "Kustom"}</span>
              </Button>
            )}
            {onCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapse}
                aria-label="Tutup panel target nutrien"
                title="Sembunyikan panel target nutrien"
                className="hidden min-h-7 w-7 p-0 lg:inline-flex"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] font-medium text-[#475569] dark:text-slate-300">
            {requirement.name}
          </p>
          <Badge tone={activeBasis === "as_fed" ? "sky" : "emerald"}>
            Basis: {activeBasis === "as_fed" ? "As-Fed" : "BK (DM)"}
          </Badge>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-3">
        {showCustomForm && onAddCustomNutrient && (
          <div className="mb-3 space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs dark:border-[#1E333D] dark:bg-[#0B1519]">
            <p className="font-bold text-[#0F172A] dark:text-white">
              {language === "id" ? "Tambah Nutrien Kustom" : "Add Custom Nutrient"}
            </p>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Mis. Beta-Glukan / Na"
              aria-label="Nama Nutrien Kustom"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <Select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as NutrientUnit)}
                aria-label="Satuan Nutrien Kustom"
              >
                {NUTRIENT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
              <Select
                value={customBasis}
                onChange={(e) => setCustomBasis(e.target.value as Basis)}
                aria-label="Basis Nutrien Kustom"
              >
                <option value="as_fed">Basis As-Fed</option>
                <option value="dry_matter">Basis BK (DM)</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                value={customMinRaw}
                onChange={(e) => setCustomMinRaw(e.target.value)}
                placeholder="Min (opsional)"
                aria-label="Target Min Nutrien Kustom"
              />
              <Input
                value={customMaxRaw}
                onChange={(e) => setCustomMaxRaw(e.target.value)}
                placeholder="Max (opsional)"
                aria-label="Target Max Nutrien Kustom"
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleSaveCustom} className="w-full">
              Simpan Nutrien
            </Button>
            {customError && (
              <p
                role="alert"
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-300"
              >
                {customError}
              </p>
            )}
          </div>
        )}

        {enableAdvance && (
          <div className="neu-well mb-3 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#0F172A] dark:text-white">
                Basis Tercerna (SID &amp; AvP)
              </p>
              <p className="text-[10px] text-[#475569] dark:text-slate-300">
                Standardized Ileal Digestible &amp; AvP
              </p>
            </div>
            <Switch
              checked={enableDigestible}
              onCheckedChange={onToggleDigestible}
              label="Gunakan Basis Digestible SID dan AvP"
            />
          </div>
        )}

        {advanceNullWarning && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-[#B45309] dark:border-amber-700/70 dark:bg-amber-950/45 dark:text-amber-100"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
            <div>
              <p className="font-semibold">{advanceNullWarning.message}</p>
              {advanceNullWarning.suggestion && (
                <p className="mt-0.5 text-[10px] opacity-90">{advanceNullWarning.suggestion}</p>
              )}
            </div>
          </div>
        )}

        {/* Daftar Kendala Nutrien Kompak (muat rapi di lebar inspector 300px–320px maupun mobile) */}
        <div className="space-y-2">
          {visibleNutrients.map((nut) => {
            const c = requirement.constraints.find((item) => item.nutrientId === nut.id);
            const res = resultMap.get(nut.id);
            const isCustomRow = nut.isCustom === true;
            const isAdvanceRow = !isCustomRow && (nut.tier ?? "basic") !== "basic";
            const enabled = c?.enabled ?? (!isAdvanceRow || isCustomRow);
            const invalidRange = c?.min !== undefined && c?.max !== undefined && c.min > c.max;
            const digits = nut.unit === "kcal/kg" ? 0 : 2;
            const isAlert = res?.status === "below_min" || res?.status === "above_max";

            return (
              <div
                key={nut.id}
                className={cn(
                  "rounded-lg border p-2 transition-colors duration-150",
                  isAlert || invalidRange
                    ? "border-rose-300 bg-rose-50/60 dark:border-rose-700/70 dark:bg-rose-950/25"
                    : "border-[#E2E8F0] bg-[#F8FAFC] dark:border-[#1E333D] dark:bg-[#0B1519]",
                  !enabled && "opacity-55",
                )}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {(isAdvanceRow || isCustomRow) && (
                      <input
                        type="checkbox"
                        checked={enabled}
                        aria-label={`Kontrol ${nut.name}`}
                        onChange={(e) => onUpdateConstraint(nut.id, { enabled: e.target.checked })}
                        className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 accent-[#059669]"
                      />
                    )}
                    <div className="min-w-0 truncate text-xs">
                      <span className="font-semibold text-[#0F172A] dark:text-slate-100">
                        {language === "id" ? nut.name : (nut.nameEn ?? nut.name)}
                      </span>{" "}
                      <span className="text-[10px] text-[#475569] dark:text-slate-400">
                        ({nut.unit})
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {isCustomRow && (
                      <>
                        {onUpdateCustomNutrientBasis && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateCustomNutrientBasis(
                                nut.id,
                                (nut.defaultBasis ?? activeBasis) === "as_fed"
                                  ? "dry_matter"
                                  : "as_fed",
                              )
                            }
                            className="cursor-pointer rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-[#0F3D3E] transition-colors hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300"
                            title="Klik untuk ubah basis nutrien kustom"
                          >
                            {(nut.defaultBasis ?? activeBasis) === "as_fed" ? "AF" : "BK"}
                          </button>
                        )}
                        {onRemoveCustomNutrient && (
                          <button
                            type="button"
                            onClick={() => onRemoveCustomNutrient(nut.id)}
                            aria-label={`Hapus ${nut.name}`}
                            className="cursor-pointer rounded p-0.5 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                    <NutrientStatusBadge
                      status={res?.status ?? "unconstrained"}
                      deviation={res?.deviation}
                      digits={digits}
                    />
                  </div>
                </div>

                <div className="mt-1.5 grid grid-cols-[1fr_1fr_auto] items-end gap-1.5">
                  <div>
                    <span className="mb-0.5 block text-[10px] font-medium text-[#475569] dark:text-slate-400">
                      Min
                    </span>
                    <NumericCellInput
                      value={c?.min ?? null}
                      allowNull
                      disabled={!enabled}
                      fractionDigits={digits}
                      invalid={invalidRange}
                      errorTooltip="Min tidak boleh > Max"
                      ariaLabel={`Target Min ${nut.name}`}
                      onCommit={(next) => onUpdateConstraint(nut.id, { min: next })}
                    />
                  </div>
                  <div>
                    <span className="mb-0.5 block text-[10px] font-medium text-[#475569] dark:text-slate-400">
                      Max
                    </span>
                    <NumericCellInput
                      value={c?.max ?? null}
                      allowNull
                      disabled={!enabled}
                      fractionDigits={digits}
                      invalid={invalidRange}
                      errorTooltip="Max harus >= Min"
                      ariaLabel={`Target Max ${nut.name}`}
                      onCommit={(next) => onUpdateConstraint(nut.id, { max: next })}
                    />
                  </div>
                  <div className="min-w-14 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-right dark:border-[#1E333D] dark:bg-[#111F26]">
                    <span className="block text-[9px] font-medium text-[#475569] dark:text-slate-400">
                      Aktual
                    </span>
                    <span className="text-xs font-bold tabular-nums text-[#0F172A] dark:text-white">
                      {res ? formatNumberLocale(res.value, digits) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <RatioConstraintsSection
          ratios={requirement.ratios ?? []}
          achievedMap={achievedMap}
          nutrientsCatalog={allNutrients}
        />
      </div>
    </Card>
  );
});
