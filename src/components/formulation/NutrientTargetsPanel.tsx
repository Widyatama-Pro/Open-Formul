import { memo, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsRight,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { resolveFeedClass } from "../../data/feed-classes";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import type { ConstraintPatch } from "../../hooks/use-prototype-store";
import { getNutrientDisplayName, getNutrientFullName, getTierLabel, pickLang } from "../../i18n";
import {
  isUpperBoundOnlyNutrient,
  recommendIngredientsForGaps,
  resolveSingleTargetValue,
} from "../../solver";
import type {
  AppLanguage,
  Basis,
  ConflictDiagnostic,
  ConstraintTier,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  NutrientResult,
  NutrientUnit,
  Requirement,
  TargetInputMode,
} from "../../types";
import { cn } from "../../utils/cn";
import {
  formatNumberLocale,
  parseLocaleDecimal,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { isPoultrySpecies, isRuminantSpecies } from "../../utils/species";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FeedClassIcon } from "../ui/FeedClassIcon";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { NutrientStatusBadge } from "./NutrientStatusBadge";
import { NumericCellInput } from "./NumericCellInput";
import { RatioConstraintsSection } from "./RatioConstraintsSection";

export interface NutrientTargetsPanelProps {
  readonly requirement: Requirement;
  readonly allNutrients?: readonly Nutrient[];
  readonly allIngredients?: readonly Ingredient[];
  readonly config?: FormulationConfig;
  readonly result?: FormulationResult;
  readonly activeBasis: Basis;
  readonly targetInputMode?: TargetInputMode;
  readonly onChangeTargetInputMode?: (mode: TargetInputMode) => void;
  readonly onActivateSuggestedIngredient?: (ingredientId: string) => void;
  readonly enableAdvance: boolean;
  readonly showNdf?: boolean;
  readonly showBetn?: boolean;
  readonly decimalPlaces?: 0 | 1 | 2;
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
const BETN_IDS = new Set(["betn"]);
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
 * Panel Target Nutrien dengan 2 mode target:
 * - Mode Rentang ("range"): Min–Max standar, default ringkas & expand saat diklik
 * - Mode Pendekatan 1 Angka ("single"): 1 angka target presisi (SK batas maksimal tidak boleh lebih)
 * - Dilengkapi Saran Bahan Pakan prioritas mudah didapat di Indonesia (pilihan Ya / Tidak)
 * - Pada layar mobile (< lg), menyatu ke scroll view utama halaman tanpa nested scroll sempit
 */
export const NutrientTargetsPanel = memo(function NutrientTargetsPanel({
  requirement,
  allNutrients = MOCK_NUTRIENTS,
  allIngredients,
  config,
  result,
  activeBasis,
  targetInputMode = config?.targetInputMode ?? "range",
  onChangeTargetInputMode,
  onActivateSuggestedIngredient,
  enableAdvance,
  showNdf = false,
  showBetn = false,
  decimalPlaces = 0,
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
  const [dismissedSuggestions, setDismissedSuggestions] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // Reset daftar saran yang ditolak saat standar ternak atau mode target berubah
  useEffect(() => {
    setDismissedSuggestions(new Set());
  }, [requirement.id, targetInputMode]);

  const singleMode = targetInputMode === "single";

  const resultMap = new Map<string, NutrientResult>(nutrientResults.map((r) => [r.nutrientId, r]));
  const achievedMap = new Map<string, number>(nutrientResults.map((r) => [r.nutrientId, r.value]));

  const isPoultry = isPoultrySpecies(requirement.species);
  const isRuminant = isRuminantSpecies(requirement.species);

  const visibleNutrients = allNutrients.filter((nut) => {
    if (nut.isCustom) return true;
    if (isPoultry && nut.id === "tdn") return false;
    if (isRuminant && nut.id === "me_poultry") return false;
    const isBasic = (nut.tier ?? "basic") === "basic";
    if (isBasic) return true;
    if (showBetn && BETN_IDS.has(nut.id)) return true;
    if (showNdf && NDF_IDS.has(nut.id)) return true;
    if (!enableAdvance) return false;
    if (nut.isDigestibleVariant && !enableDigestible) return false;
    return true;
  });

  const suggestions = useMemo(() => {
    if (!allIngredients || !config || !result) return [];
    return recommendIngredientsForGaps(allIngredients, requirement, config, result, allNutrients, {
      maxSuggestions: 3,
      dismissedIds: dismissedSuggestions,
    });
  }, [allIngredients, requirement, config, result, allNutrients, dismissedSuggestions]);

  const toggleNutrientExpanded = (id: string) => {
    setExpandedNutrients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    <Card interactive={false} className="flex flex-col lg:h-full lg:overflow-hidden">
      <div className="space-y-1.5 border-b border-[var(--border-subtle)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold tracking-tight text-[var(--text-primary)]">
            {pickLang(language, "Target Nutrien", "Nutrient Targets")}
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
              <span className="hidden lg:inline-flex">
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
                  className="min-h-7 w-7 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </span>
            )}
          </div>
        </div>

        {/* Baris 2: Toggle Mode Rentang vs Pendekatan 1 Angka + Badge Basis */}
        <div className="flex items-center justify-between gap-2">
          {onChangeTargetInputMode ? (
            <div
              role="group"
              aria-label={pickLang(
                language,
                "Pilih mode target Rentang atau Pendekatan 1 Angka",
                "Switch between Range or Single Target approach",
              )}
              className="neu-pressed inline-flex h-7 items-center rounded-lg p-0.5"
            >
              <button
                type="button"
                aria-pressed={!singleMode}
                onClick={() => onChangeTargetInputMode("range")}
                title={pickLang(
                  language,
                  "Mode Rentang: atur batas Min dan Max nutrien",
                  "Range mode: set Min and Max nutrient bounds",
                )}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-0.5 text-[10px] font-bold transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                  !singleMode
                    ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {pickLang(language, "Rentang", "Range")}
              </button>
              <button
                type="button"
                aria-pressed={singleMode}
                onClick={() => onChangeTargetInputMode("single")}
                title={pickLang(
                  language,
                  "Mode Pendekatan 1 Angka: target tunggal sepresisi mungkin (SK batas maksimal tidak boleh lebih)",
                  "Single-Number Approach: get as close as possible to each single standard (CF stays at or below max)",
                )}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-0.5 text-[10px] font-bold transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                  singleMode
                    ? "bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {pickLang(language, "1 Angka", "1 Target")}
              </button>
            </div>
          ) : (
            <span />
          )}

          <Badge tone={activeBasis === "as_fed" ? "sky" : "emerald"}>
            {pickLang(language, "Basis", "Basis")}:{" "}
            {activeBasis === "as_fed" ? "As-Fed" : pickLang(language, "BK (DM)", "DM")}
          </Badge>
        </div>

        <p className="min-w-0 truncate text-[11px] font-medium text-[var(--text-secondary)]">
          {language === "id" ? requirement.name : (requirement.nameEn ?? requirement.name)}
        </p>
      </div>

      {/* Pada mobile (< lg), menyatu ke scroll view utama halaman agar tidak terjepit */}
      <div className="custom-scrollbar p-2.5 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
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

        <p className="mb-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
          {singleMode
            ? pickLang(
                language,
                "Mode Pendekatan 1 Angka: solver mendekati tiap angka standar sepresisi mungkin. Khusus SK adalah batas maksimal (tidak boleh lebih) namun tetap diusahakan mendekati.",
                "Single-Target Approach: solver gets as close as possible to each single value. Crude Fiber (CF) stays at or below its max cap while approaching closely.",
              )
            : pickLang(
                language,
                "Nilai aktual tampil otomatis. Klik baris nutrien untuk membuka batas Min/Max.",
                "Actual values shown by default. Click any row to expand Min/Max bounds.",
              )}
        </p>

        {/* Daftar Nutrien Kompak */}
        <div className="space-y-1.5">
          {visibleNutrients.map((nut) => {
            const displayName = getNutrientDisplayName(nut, language, simpleMode);
            const fullName = getNutrientFullName(nut, language);
            const c = requirement.constraints.find((item) => item.nutrientId === nut.id);
            const res = resultMap.get(nut.id);
            const isCustomRow = nut.isCustom === true;
            const isAdvanceRow = !isCustomRow && (nut.tier ?? "basic") !== "basic";
            const enabled = c?.enabled ?? (!isAdvanceRow || isCustomRow);
            const invalidRange =
              !singleMode && c?.min !== undefined && c?.max !== undefined && c.min > c.max;
            const isUpperOnly = isUpperBoundOnlyNutrient(nut.id, c);
            const singleTarget = c ? resolveSingleTargetValue(c) : null;
            const digits = resolveDisplayDigits(
              nut.unit,
              nut.id,
              decimalPlaces,
              res?.value ?? singleTarget ?? c?.min ?? c?.max,
            );
            const isAlert = res?.status === "below_min" || res?.status === "above_max";
            const activeTier = c?.tier ?? "tier2";
            const isExpanded = expandedNutrients.has(nut.id) || invalidRange;
            const boundSummary = singleMode
              ? singleTarget !== null
                ? isUpperOnly
                  ? `${pickLang(language, "Maks", "Max")} ${formatNumberLocale(singleTarget, digits)}`
                  : formatNumberLocale(singleTarget, digits)
                : pickLang(language, "Tanpa target", "No target")
              : formatCompactBoundSummary(c?.min, c?.max, digits, language);

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
                {/* Baris Ringkas Default */}
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
                      aria-label={
                        singleMode
                          ? pickLang(
                              language,
                              `Atur target 1 angka ${fullName}`,
                              `Edit single target for ${fullName}`,
                            )
                          : pickLang(
                              language,
                              `Atur batas Min dan Max ${fullName}`,
                              `Edit Min and Max bounds for ${fullName}`,
                            )
                      }
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
                        <div className="flex items-center gap-1 text-[10px] tabular-nums text-[var(--text-muted)]">
                          <span>
                            {singleMode
                              ? singleTarget !== null
                                ? `${pickLang(language, "Target:", "Target:")} ${boundSummary}`
                                : boundSummary
                              : `${pickLang(language, "Target:", "Target:")} ${boundSummary}`}
                          </span>
                          {singleMode && isUpperOnly && singleTarget !== null && (
                            <span
                              title={pickLang(
                                language,
                                "Batas maksimal: tidak boleh lebih, diusahakan tetap mendekati",
                                "Maximum cap: must not exceed while staying close",
                              )}
                              className="rounded bg-[var(--status-warning-soft)] px-1 py-0.2 text-[9px] font-bold text-[var(--status-warning)]"
                            >
                              ≤
                            </span>
                          )}
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

                {/* Area Edit Target: 1 Angka vs Rentang Min–Max */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)] px-2 pt-1.5 pb-2">
                    {singleMode ? (
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                            {isUpperOnly
                              ? pickLang(
                                  language,
                                  `Batas Maksimal (${nut.unit}) — tidak boleh lebih`,
                                  `Maximum Limit (${nut.unit}) — must not exceed`,
                                )
                              : pickLang(
                                  language,
                                  `Target Standar (${nut.unit}) — pendekatan presisi`,
                                  `Target Standard (${nut.unit}) — close approach`,
                                )}
                          </span>
                        </div>
                        <NumericCellInput
                          value={singleTarget}
                          allowNull
                          disabled={!enabled}
                          fractionDigits={digits}
                          ariaLabel={`${pickLang(language, "Target 1 Angka", "Single Target")} ${fullName}`}
                          onCommit={(next) => {
                            if (next === null) {
                              onUpdateConstraint(nut.id, {
                                min: null,
                                max: null,
                                idealTarget: null,
                              });
                            } else if (isUpperOnly) {
                              onUpdateConstraint(nut.id, {
                                min: null,
                                max: next,
                                idealTarget: next,
                              });
                            } else {
                              onUpdateConstraint(nut.id, {
                                min: next,
                                max: null,
                                idealTarget: next,
                              });
                            }
                          }}
                        />
                      </div>
                    ) : (
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
                    )}

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
                            `Prioritas toleransi: ${getTierLabel(language, activeTier)} (klik untuk ubah)`,
                            `Tolerance priority: ${getTierLabel(language, activeTier)} (click to cycle)`,
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

        {/* Saran Bahan Prioritas Mudah Didapat di Indonesia (opsional: Ya / Tidak) */}
        {suggestions.length > 0 && onActivateSuggestedIngredient && (
          <section
            aria-label={pickLang(
              language,
              "Saran bahan pakan mudah didapat di Indonesia",
              "Recommended Indonesian feed ingredients",
            )}
            className="mt-3 rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-soft)] p-2.5"
          >
            <div className="mb-2 flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--status-info)]" />
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-[var(--text-primary)]">
                  {pickLang(
                    language,
                    "Saran Bahan untuk Mendekati Standar",
                    "Suggested Feeds to Approach Standard",
                  )}
                </h3>
                <p className="text-[10px] leading-snug text-[var(--text-secondary)]">
                  {pickLang(
                    language,
                    "Prioritas bahan yang mudah didapat di Indonesia. Hanya saran — pilih apakah ingin dimasukkan.",
                    "Prioritizing widely available Indonesian feeds. Optional suggestion — choose Yes or No.",
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              {suggestions.map((sug) => {
                const ingName =
                  language === "id"
                    ? sug.ingredient.name
                    : (sug.ingredient.nameEn ?? sug.ingredient.name);
                const feedClass = resolveFeedClass(sug.ingredient);
                return (
                  <div
                    key={sug.ingredient.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-2"
                  >
                    <div className="flex items-start gap-1.5">
                      <FeedClassIcon code={feedClass} language={language} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <p className="text-[11px] leading-tight font-bold text-[var(--text-primary)]">
                            {ingName}
                          </p>
                          <Badge tone={sug.availabilityTier === "high" ? "emerald" : "sky"}>
                            {sug.availabilityTier === "high"
                              ? pickLang(language, "Mudah di ID", "Common in ID")
                              : sug.availabilityTier === "medium"
                                ? pickLang(language, "Cukup Mudah", "Regional")
                                : pickLang(language, "Alternatif", "Specialty")}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-snug text-[var(--text-secondary)]">
                          {language === "id" ? sug.reasonId : sug.reasonEn}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDismissedSuggestions((prev) => {
                            const next = new Set(prev);
                            next.add(sug.ingredient.id);
                            return next;
                          })
                        }
                        aria-label={pickLang(
                          language,
                          `Tolak saran ${ingName}`,
                          `Dismiss ${ingName}`,
                        )}
                        className="min-h-7 px-2 text-[10px] md:min-h-7"
                      >
                        {pickLang(language, "Tidak", "No")}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onActivateSuggestedIngredient(sug.ingredient.id)}
                        aria-label={pickLang(
                          language,
                          `Masukkan saran ${ingName}`,
                          `Include ${ingName}`,
                        )}
                        className="min-h-7 px-2.5 text-[10px] md:min-h-7"
                      >
                        <Check className="h-3 w-3" />
                        <span>{pickLang(language, "Ya, Masukkan", "Yes, Include")}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
