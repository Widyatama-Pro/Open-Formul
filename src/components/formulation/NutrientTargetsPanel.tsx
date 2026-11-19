import { memo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronsRight,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import type { ConstraintPatch } from "../../hooks/use-prototype-store";
import { getNutrientDisplayName, getNutrientFullName, getTierLabel, pickLang } from "../../i18n";
import type {
  AppLanguage,
  Basis,
  ConflictDiagnostic,
  ConstraintTier,
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
  readonly showNdf?: boolean;
  readonly simpleMode?: boolean;
  readonly enableDigestible: boolean;
  readonly enableStochastic?: boolean;
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

const NDF_IDS = new Set(["ndf", "adf"]);
const TIER_CYCLE: readonly ConstraintTier[] = ["tier0", "tier1", "tier2", "tier3"];

function formatCompactBoundSummary(
  min: number | undefined,
  max: number | undefined,
  digits: number,
  language: AppLanguage,
): string {
  if (min !== undefined && max !== undefined) {
    return `${formatNumberLocale(min, digits)}–${formatNumberLocale(max, digits)}`;
  }
  if (min !== undefined) {
    return `≥ ${formatNumberLocale(min, digits)}`;
  }
  if (max !== undefined) {
    return `≤ ${formatNumberLocale(max, digits)}`;
  }
  return pickLang(language, "Tanpa batas", "No limit");
}

/**
 * Panel Target Nutrien ramping:
 * - Default menampilkan nilai aktual secara ringkas & jelas
 * - Input Min & Max tersembunyi secara default dan melebar (expand) saat nutrien diaktifkan
 */
export const NutrientTargetsPanel = memo(function NutrientTargetsPanel({
  requirement,
  allNutrients = MOCK_NUTRIENTS,
  activeBasis,
  enableAdvance,
  showNdf = false,
  simpleMode = !enableAdvance,
  enableDigestible,
  enableStochastic = false,
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
  const [expandedNutrients, setExpandedNutrients] = useState<ReadonlySet<string>>(() => new Set());

  const resultMap = new Map<string, NutrientResult>(nutrientResults.map((r) => [r.nutrientId, r]));
  const achievedMap = new Map<string, number>(nutrientResults.map((r) => [r.nutrientId, r.value]));

  const visibleNutrients = allNutrients.filter((nut) => {
    if (nut.isCustom) return true;
    const isBasic = (nut.tier ?? "basic") === "basic";
    if (isBasic) return true;
    if (showNdf && NDF_IDS.has(nut.id)) return true;
    if (!enableAdvance) return false;
    if (nut.isDigestibleVariant && !enableDigestible) return false;
    return true;
  });

  const allExpanded =
    visibleNutrients.length > 0 && visibleNutrients.every((n) => expandedNutrients.has(n.id));

  const toggleNutrientExpanded = (id: string) => {
    setExpandedNutrients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedNutrients(new Set());
    } else {
      setExpandedNutrients(new Set(visibleNutrients.map((n) => n.id)));
    }
  };

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
      setCustomError(
        pickLang(
          language,
          "Nilai Min/Max harus berupa angka valid.",
          "Min/Max must be valid numbers.",
        ),
      );
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
      setCustomError(
        res.error ??
          pickLang(language, "Gagal menambah nutrien kustom.", "Failed to add custom nutrient."),
      );
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
      <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <h2 className="truncate text-xs font-bold tracking-tight text-[var(--text-primary)]">
            {pickLang(language, "Target Nutrien", "Nutrient Targets")}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpandAll}
              title={
                allExpanded
                  ? pickLang(language, "Sembunyikan semua input Min/Max", "Hide all Min/Max bounds")
                  : pickLang(language, "Buka semua input Min/Max", "Expand all Min/Max bounds")
              }
              className="min-h-7 px-1.5 text-[10px] md:min-h-7"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>
                {allExpanded
                  ? pickLang(language, "Ringkas", "Compact")
                  : pickLang(language, "Edit Batas", "Edit Bounds")}
              </span>
            </Button>
            {onAddCustomNutrient && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCustomBasis(activeBasis);
                  setShowCustomForm((prev) => !prev);
                  setCustomError(null);
                }}
                aria-label={pickLang(language, "Tambah Nutrien Kustom", "Add Custom Nutrient")}
                className="min-h-7 px-2 text-[10px] md:min-h-7"
              >
                {showCustomForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                <span>
                  {showCustomForm
                    ? pickLang(language, "Tutup", "Close")
                    : pickLang(language, "Kustom", "Custom")}
                </span>
              </Button>
            )}
            {onCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapse}
                aria-label={pickLang(
                  language,
                  "Tutup panel target nutrien",
                  "Close nutrient targets panel",
                )}
                title={pickLang(
                  language,
                  "Sembunyikan panel target nutrien",
                  "Hide nutrient targets panel",
                )}
                className="hidden min-h-7 w-7 p-0 lg:inline-flex"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] font-medium text-[var(--text-secondary)]">
            {language === "id" ? requirement.name : (requirement.nameEn ?? requirement.name)}
          </p>
          <Badge tone={activeBasis === "as_fed" ? "sky" : "emerald"}>
            {pickLang(language, "Basis", "Basis")}:{" "}
            {activeBasis === "as_fed" ? "As-Fed" : pickLang(language, "BK (DM)", "DM")}
          </Badge>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-2.5">
        {showCustomForm && onAddCustomNutrient && (
          <div className="neu-pressed mb-3 space-y-2 rounded-xl p-2.5 text-xs">
            <p className="font-bold text-[var(--text-primary)]">
              {pickLang(language, "Tambah Nutrien Kustom", "Add Custom Nutrient")}
            </p>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={pickLang(language, "Mis. Beta-Glukan / Na", "e.g. Beta-Glucan / Na")}
              aria-label={pickLang(language, "Nama Nutrien Kustom", "Custom Nutrient Name")}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <Select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as NutrientUnit)}
                aria-label={pickLang(language, "Satuan Nutrien Kustom", "Custom Nutrient Unit")}
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
                aria-label={pickLang(language, "Basis Nutrien Kustom", "Custom Nutrient Basis")}
              >
                <option value="as_fed">{pickLang(language, "Basis As-Fed", "As-Fed Basis")}</option>
                <option value="dry_matter">
                  {pickLang(language, "Basis BK (DM)", "DM Basis")}
                </option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                value={customMinRaw}
                onChange={(e) => setCustomMinRaw(e.target.value)}
                placeholder={pickLang(language, "Min (opsional)", "Min (optional)")}
                aria-label={pickLang(
                  language,
                  "Target Min Nutrien Kustom",
                  "Custom Nutrient Min Target",
                )}
              />
              <Input
                value={customMaxRaw}
                onChange={(e) => setCustomMaxRaw(e.target.value)}
                placeholder={pickLang(language, "Max (opsional)", "Max (optional)")}
                aria-label={pickLang(
                  language,
                  "Target Max Nutrien Kustom",
                  "Custom Nutrient Max Target",
                )}
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleSaveCustom} className="w-full">
              {pickLang(language, "Simpan Nutrien", "Save Nutrient")}
            </Button>
            {customError && (
              <p role="alert" className="text-[11px] font-semibold text-[var(--status-danger)]">
                {customError}
              </p>
            )}
          </div>
        )}

        {enableAdvance && (
          <div className="neu-well mb-2.5 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                {pickLang(language, "Basis Tercerna (SID & AvP)", "Digestible Basis (SID & AvP)")}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Standardized Ileal Digestible &amp; AvP
              </p>
            </div>
            <Switch
              checked={enableDigestible}
              onCheckedChange={onToggleDigestible}
              label={pickLang(
                language,
                "Gunakan Basis Digestible SID dan AvP",
                "Use Digestible SID and AvP Basis",
              )}
            />
          </div>
        )}

        {advanceNullWarning && (
          <div
            role="alert"
            className="mb-2.5 flex items-start gap-2 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] p-2 text-[11px] text-[var(--text-primary)]"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--status-warning)]" />
            <div>
              <p className="font-semibold">{advanceNullWarning.message}</p>
              {advanceNullWarning.suggestion && (
                <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                  {advanceNullWarning.suggestion}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="mb-2 text-[10px] text-[var(--text-muted)]">
          {pickLang(
            language,
            "Nilai aktual tampil otomatis. Klik baris nutrien untuk membuka batas Min/Max.",
            "Actual values shown by default. Click any row to expand Min/Max bounds.",
          )}
        </p>

        {/* Daftar Nutrien Kompak: Default tampil Aktual dulu, Min/Max expand saat diklik */}
        <div className="space-y-1.5">
          {visibleNutrients.map((nut) => {
            const displayName = getNutrientDisplayName(nut, language, simpleMode);
            const fullName = getNutrientFullName(nut, language);
            const c = requirement.constraints.find((item) => item.nutrientId === nut.id);
            const res = resultMap.get(nut.id);
            const isCustomRow = nut.isCustom === true;
            const isAdvanceRow = !isCustomRow && (nut.tier ?? "basic") !== "basic";
            const enabled = c?.enabled ?? (!isAdvanceRow || isCustomRow);
            const invalidRange = c?.min !== undefined && c?.max !== undefined && c.min > c.max;
            const digits =
              nut.unit === "kcal/kg" || nut.unit === "mg/kg" || nut.unit === "mEq/kg" ? 0 : 2;
            const isAlert = res?.status === "below_min" || res?.status === "above_max";
            const activeTier = c?.tier ?? "tier2";
            const isExpanded = expandedNutrients.has(nut.id) || invalidRange;
            const boundSummary = formatCompactBoundSummary(c?.min, c?.max, digits, language);

            const cycleTier = () => {
              const idx = TIER_CYCLE.indexOf(activeTier);
              const nextTier = TIER_CYCLE[(idx + 1) % TIER_CYCLE.length]!;
              onUpdateConstraint(nut.id, { tier: nextTier });
            };

            return (
              <div
                key={nut.id}
                className={cn(
                  "rounded-lg border transition-colors duration-150",
                  isAlert || invalidRange
                    ? "border-[var(--status-danger-border)] bg-[var(--status-danger-soft)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-sunken)]",
                  !enabled && "opacity-55",
                )}
              >
                {/* Baris Ringkas Default: Nama + Target Ringkas + Nilai Aktual Menonjol + Status */}
                <div className="flex items-center justify-between gap-1.5 px-2 py-1.5">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {(isAdvanceRow || isCustomRow) && (
                      <input
                        type="checkbox"
                        checked={enabled}
                        aria-label={`${pickLang(language, "Kontrol", "Toggle")} ${fullName}`}
                        onChange={(e) => onUpdateConstraint(nut.id, { enabled: e.target.checked })}
                        className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleNutrientExpanded(nut.id)}
                      aria-expanded={isExpanded}
                      aria-label={pickLang(
                        language,
                        `Atur batas Min dan Max ${fullName}`,
                        `Edit Min and Max bounds for ${fullName}`,
                      )}
                      title={`${fullName} (${nut.unit})`}
                      className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-1.5 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1 truncate">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {displayName}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            ({nut.unit})
                          </span>
                        </div>
                        <div className="text-[10px] tabular-nums text-[var(--text-muted)]">
                          {pickLang(language, "Target:", "Target:")} {boundSummary}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 text-right">
                          <span className="block text-[8px] font-medium uppercase text-[var(--text-muted)]">
                            {pickLang(language, "Aktual", "Actual")}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                            {res ? formatNumberLocale(res.value, digits) : "—"}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        )}
                      </div>
                    </button>
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
                            className="cursor-pointer rounded bg-[var(--status-info-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--status-info)] transition-colors hover:brightness-95"
                            title={pickLang(
                              language,
                              "Klik untuk ubah basis nutrien kustom",
                              "Click to toggle custom nutrient basis",
                            )}
                          >
                            {(nut.defaultBasis ?? activeBasis) === "as_fed"
                              ? "AF"
                              : pickLang(language, "BK", "DM")}
                          </button>
                        )}
                        {onRemoveCustomNutrient && (
                          <button
                            type="button"
                            onClick={() => onRemoveCustomNutrient(nut.id)}
                            aria-label={`${pickLang(language, "Hapus", "Remove")} ${fullName}`}
                            className="cursor-pointer rounded p-0.5 text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)]"
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
                      language={language}
                    />
                  </div>
                </div>

                {/* Area Batas Min & Max: Hanya tampil saat di-expand */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)] px-2 pt-1.5 pb-2">
                    <div className="grid grid-cols-2 items-end gap-1.5">
                      <div>
                        <span className="mb-0.5 block text-[10px] font-medium text-[var(--text-secondary)]">
                          Min ({nut.unit})
                        </span>
                        <NumericCellInput
                          value={c?.min ?? null}
                          allowNull
                          disabled={!enabled}
                          fractionDigits={digits}
                          invalid={invalidRange}
                          errorTooltip={pickLang(
                            language,
                            "Min tidak boleh > Max",
                            "Min cannot exceed Max",
                          )}
                          ariaLabel={`${pickLang(language, "Target Min", "Min Target")} ${fullName}`}
                          onCommit={(next) => onUpdateConstraint(nut.id, { min: next })}
                        />
                      </div>
                      <div>
                        <span className="mb-0.5 block text-[10px] font-medium text-[var(--text-secondary)]">
                          Max ({nut.unit})
                        </span>
                        <NumericCellInput
                          value={c?.max ?? null}
                          allowNull
                          disabled={!enabled}
                          fractionDigits={digits}
                          invalid={invalidRange}
                          errorTooltip={pickLang(
                            language,
                            "Max harus >= Min",
                            "Max must be >= Min",
                          )}
                          ariaLabel={`${pickLang(language, "Target Max", "Max Target")} ${fullName}`}
                          onCommit={(next) => onUpdateConstraint(nut.id, { max: next })}
                        />
                      </div>
                    </div>

                    {enableAdvance && enabled && (
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-secondary)]">
                          {pickLang(language, "Prioritas Batas:", "Bound Priority:")}
                        </span>
                        <button
                          type="button"
                          onClick={cycleTier}
                          title={pickLang(
                            language,
                            `Prioritas relaksasi: ${getTierLabel(language, activeTier)} (klik untuk ubah)`,
                            `Relaxation priority: ${getTierLabel(language, activeTier)} (click to cycle)`,
                          )}
                          className={cn(
                            "cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors",
                            activeTier === "tier0"
                              ? "bg-[var(--status-danger-soft)] text-[var(--status-danger)]"
                              : activeTier === "tier1"
                                ? "bg-[var(--status-warning-soft)] text-[var(--status-warning)]"
                                : "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
                          )}
                        >
                          {getTierLabel(language, activeTier)}
                        </button>
                      </div>
                    )}

                    {enableStochastic &&
                      enabled &&
                      (c?.min !== undefined || c?.max !== undefined) && (
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-[var(--border-subtle)] pt-1.5 text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--text-secondary)]">p:</span>
                            <select
                              aria-label={`Target probability ${fullName}`}
                              value={String(c?.targetProbability ?? 0.95)}
                              onChange={(e) =>
                                onUpdateConstraint(nut.id, {
                                  targetProbability: Number(e.target.value),
                                })
                              }
                              className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1 py-0.5 text-[10px] text-[var(--text-primary)]"
                            >
                              <option value="0.9">90%</option>
                              <option value="0.95">95%</option>
                              <option value="0.99">99%</option>
                            </select>
                            <label className="inline-flex cursor-pointer items-center gap-1 text-[var(--text-secondary)]">
                              <input
                                type="checkbox"
                                checked={c?.useCantelli === true}
                                onChange={(e) =>
                                  onUpdateConstraint(nut.id, { useCantelli: e.target.checked })
                                }
                                className="h-3 w-3 accent-[var(--status-warning)]"
                              />
                              <span>Cantelli</span>
                            </label>
                          </div>
                          {res?.stochasticMargin !== undefined && res.stochasticMargin > 0 && (
                            <span className="font-semibold tabular-nums text-[var(--status-warning)]">
                              ±{formatNumberLocale(res.stochasticMargin, digits)}
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <RatioConstraintsSection
          ratios={requirement.ratios ?? []}
          achievedMap={achievedMap}
          nutrientsCatalog={allNutrients}
          language={language}
        />
      </div>
    </Card>
  );
});
