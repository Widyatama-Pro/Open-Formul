import { useState } from "react";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
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
}

const NUTRIENT_UNITS: readonly NutrientUnit[] = [
  "%",
  "kcal/kg",
  "MJ/kg",
  "mg/kg",
  "IU/kg",
  "mEq/kg",
];

export function NutrientTargetsPanel({
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/65 px-4 py-3 dark:border-cyan-200/10">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight text-[#122B36] dark:text-white">
            {language === "id" ? "Target Nutrien" : "Nutrient Targets"}
          </h2>
          <p className="truncate text-[11px] font-medium text-[#54707E] dark:text-slate-300">
            {requirement.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            >
              {showCustomForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{showCustomForm ? "Tutup" : "Nutrien Kustom"}</span>
            </Button>
          )}
          <Badge tone={activeBasis === "as_fed" ? "sky" : "emerald"}>
            Basis: {activeBasis === "as_fed" ? "As-Fed" : "BK (DM)"}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 md:p-4">
        {showCustomForm && onAddCustomNutrient && (
          <div className="glass-card mb-3 space-y-2.5 rounded-2xl p-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#122B36] dark:text-white">
                {language === "id"
                  ? "Tambah Nutrien Kustom (Nama, Satuan & Basis)"
                  : "Add Custom Nutrient"}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Mis. Beta-Glukan / Na"
                aria-label="Nama Nutrien Kustom"
              />
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveCustom}
                className="col-span-2 sm:col-span-1"
              >
                Simpan Nutrien
              </Button>
            </div>
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
          <div className="neu-well mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5">
            <div>
              <p className="text-xs font-semibold text-[#122B36] dark:text-white">
                Basis Nutrisi Tercerna (SID &amp; AvP)
              </p>
              <p className="text-[11px] text-[#54707E] dark:text-slate-300">
                Aktifkan fraksi Standardized Ileal Digestible &amp; Available P
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
            className="mb-3 flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-3 text-xs text-amber-900 backdrop-blur-xs dark:border-amber-700/70 dark:bg-amber-950/45 dark:text-amber-100"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">{advanceNullWarning.message}</p>
              {advanceNullWarning.suggestion && (
                <p className="mt-0.5 text-[11px] opacity-90">{advanceNullWarning.suggestion}</p>
              )}
            </div>
          </div>
        )}

        {/* Tampilan Tabel Desktop / Tablet */}
        <div className="hidden md:block">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/75 text-[11px] font-bold tracking-wide text-[#54707E] dark:border-cyan-200/10 dark:text-slate-300">
                <th className="py-2 pr-2 text-left">Nutrien</th>
                <th className="w-20 px-1 py-2 text-right">Min</th>
                <th className="w-20 px-1 py-2 text-right">Max</th>
                <th className="w-20 px-2 py-2 text-right">Aktual</th>
                <th className="w-32 py-2 pl-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/60 dark:divide-cyan-200/10">
              {visibleNutrients.map((nut) => {
                const c = requirement.constraints.find((item) => item.nutrientId === nut.id);
                const res = resultMap.get(nut.id);
                const isCustomRow = nut.isCustom === true;
                const isAdvanceRow = !isCustomRow && (nut.tier ?? "basic") !== "basic";
                const enabled = c?.enabled ?? (!isAdvanceRow || isCustomRow);
                const invalidRange = c?.min !== undefined && c?.max !== undefined && c.min > c.max;
                const digits = nut.unit === "kcal/kg" ? 0 : 2;

                return (
                  <tr key={nut.id} className={!enabled ? "opacity-55" : undefined}>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-2">
                        {(isAdvanceRow || isCustomRow) && (
                          <input
                            type="checkbox"
                            checked={enabled}
                            aria-label={`Kontrol ${nut.name}`}
                            onChange={(e) =>
                              onUpdateConstraint(nut.id, { enabled: e.target.checked })
                            }
                            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-[#0E7490]"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-[#122B36] dark:text-slate-100">
                            {language === "id" ? nut.name : (nut.nameEn ?? nut.name)}
                          </span>{" "}
                          <span className="text-[11px] text-[#6C8693] dark:text-slate-400">
                            ({nut.unit})
                          </span>
                          {isCustomRow && (
                            <span className="ml-1.5 inline-flex items-center gap-1">
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
                                  className="cursor-pointer rounded-md bg-cyan-500/12 px-1.5 py-0.5 text-[10px] font-bold text-[#0E7490] transition-all duration-150 hover:bg-cyan-500/20 active:scale-95 dark:text-cyan-300"
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
                                  className="cursor-pointer rounded p-0.5 text-rose-500 transition-transform duration-150 hover:bg-rose-500/15 active:scale-90 dark:text-rose-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-1 py-1.5">
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
                    </td>
                    <td className="px-1 py-1.5">
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
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#122B36] dark:text-white">
                      {res ? formatNumberLocale(res.value, digits) : "—"}
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      {res ? (
                        <NutrientStatusBadge
                          status={res.status}
                          deviation={res.deviation}
                          digits={digits}
                        />
                      ) : (
                        <NutrientStatusBadge status="unconstrained" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tampilan Priority Cards Mobile (<768px) */}
        <div className="space-y-2.5 md:hidden">
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
                className={
                  isAlert || invalidRange
                    ? "glass-card glass-card-coral rounded-2xl p-3"
                    : "glass-card rounded-2xl p-3"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#122B36] dark:text-white">
                    {(isAdvanceRow || isCustomRow) && (
                      <input
                        type="checkbox"
                        checked={enabled}
                        aria-label={`Kontrol ${nut.name}`}
                        onChange={(e) => onUpdateConstraint(nut.id, { enabled: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 accent-[#0E7490]"
                      />
                    )}
                    <span className="truncate">
                      {language === "id" ? nut.name : (nut.nameEn ?? nut.name)} ({nut.unit})
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {isCustomRow && onRemoveCustomNutrient && (
                      <button
                        type="button"
                        onClick={() => onRemoveCustomNutrient(nut.id)}
                        aria-label={`Hapus ${nut.name}`}
                        className="cursor-pointer rounded p-1 text-rose-500 transition-transform duration-150 hover:bg-rose-500/15 active:scale-90 dark:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <NutrientStatusBadge
                      status={res?.status ?? "unconstrained"}
                      deviation={res?.deviation}
                      digits={digits}
                    />
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-3 items-end gap-2">
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold text-[#54707E] dark:text-slate-300">
                      Min
                    </span>
                    <NumericCellInput
                      value={c?.min ?? null}
                      allowNull
                      disabled={!enabled}
                      fractionDigits={digits}
                      invalid={invalidRange}
                      ariaLabel={`Target Min ${nut.name}`}
                      onCommit={(next) => onUpdateConstraint(nut.id, { min: next })}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold text-[#54707E] dark:text-slate-300">
                      Max
                    </span>
                    <NumericCellInput
                      value={c?.max ?? null}
                      allowNull
                      disabled={!enabled}
                      fractionDigits={digits}
                      invalid={invalidRange}
                      ariaLabel={`Target Max ${nut.name}`}
                      onCommit={(next) => onUpdateConstraint(nut.id, { max: next })}
                    />
                  </div>
                  <div className="neu-well rounded-xl px-2.5 py-1.5 text-right">
                    <span className="block text-[10px] font-medium text-[#6C8693] dark:text-slate-400">
                      Aktual
                    </span>
                    <span className="text-sm font-bold tabular-nums text-[#122B36] dark:text-white">
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
}
