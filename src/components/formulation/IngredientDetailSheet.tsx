import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { pickLang } from "../../i18n";
import type { AppLanguage, Ingredient, Nutrient, NutrientTier } from "../../types";
import { isDerivedNutrient, resolveNutrientValue } from "../../utils/equations";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { SheetDialog } from "../ui/SheetDialog";
import { Switch } from "../ui/Switch";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientDetailSheetProps {
  readonly ingredient: Ingredient | null;
  readonly allNutrients?: readonly Nutrient[];
  readonly open: boolean;
  readonly stochasticEnabled?: boolean;
  readonly onClose: () => void;
  readonly onUpdate: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPrice: (id: string) => void;
  readonly language: AppLanguage;
}

type DetailTab = "basic" | "amino" | "fiber_anf" | "rules";

export function IngredientDetailSheet({
  ingredient,
  allNutrients = MOCK_NUTRIENTS,
  open,
  stochasticEnabled = false,
  onClose,
  onUpdate,
  onResetPrice,
  language,
}: IngredientDetailSheetProps) {
  const [tab, setTab] = useState<DetailTab>("basic");

  if (!ingredient) return null;

  const ingName = language === "id" ? ingredient.name : (ingredient.nameEn ?? ingredient.name);
  const min = ingredient.inclusion?.min ?? 0;
  const max = ingredient.inclusion?.max ?? 100;
  const invalidBounds = min > max;

  const filterNutrients = (tiers: readonly NutrientTier[]) =>
    allNutrients.filter((n) => tiers.includes(n.tier ?? "basic"));

  const updateStdDev = (nutrientId: string, nextSigma: number | null) => {
    const current = { ...(ingredient.stdDev ?? {}) };
    if (nextSigma === null || nextSigma <= 0) {
      delete current[nutrientId];
    } else {
      current[nutrientId] = nextSigma;
    }
    onUpdate(ingredient.id, { stdDev: current });
  };

  const renderNutrientInputs = (tiers: readonly NutrientTier[]) => {
    const list = filterNutrients(tiers);
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((nut) => {
          const nutName = language === "id" ? nut.name : (nut.nameEn ?? nut.name);
          const derived = isDerivedNutrient(nut.id);
          const digits =
            nut.unit === "kcal/kg" || nut.unit === "mg/kg" || nut.unit === "mEq/kg" ? 0 : 2;

          if (derived) {
            const derivedVal = resolveNutrientValue(ingredient, nut.id);
            return (
              <div key={nut.id} className="glass-card rounded-2xl p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#122B36] dark:text-slate-100">
                    {nutName}{" "}
                    <span className="text-[#6C8693] dark:text-slate-400">({nut.unit})</span>
                  </span>
                  <Badge tone="sky">{pickLang(language, "Turunan", "Derived")}</Badge>
                </div>
                <p className="text-sm font-bold tabular-nums text-[#0F172A] dark:text-white">
                  {derivedVal !== null ? `${formatNumberLocale(derivedVal, 1)} ${nut.unit}` : "N/A"}
                </p>
                <p className="mt-1 text-[10px] text-[#54707E] dark:text-slate-400">
                  {pickLang(
                    language,
                    "Dihitung otomatis dari Na, K, Cl, S (mg/kg).",
                    "Auto-computed from Na, K, Cl, S (mg/kg).",
                  )}
                </p>
              </div>
            );
          }

          const val = ingredient.nutrients[nut.id];
          const isNull = val === null || val === undefined;
          const sigmaVal = ingredient.stdDev?.[nut.id] ?? null;
          return (
            <div key={nut.id} className="glass-card rounded-2xl p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  {nutName}{" "}
                  <span className="text-[#6C8693] dark:text-slate-400">
                    ({nut.unit}
                    {nut.isCustom
                      ? ` · ${pickLang(language, "Kustom", "Custom")} ${nut.defaultBasis === "dry_matter" ? pickLang(language, "BK", "DM") : "AF"}`
                      : ""}
                    )
                  </span>
                </label>
                {isNull ? (
                  <Badge tone="amber">N/A</Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate(ingredient.id, {
                        nutrients: { ...ingredient.nutrients, [nut.id]: null },
                      })
                    }
                    className="cursor-pointer text-[11px] font-semibold text-[#0E7490] underline hover:text-[#0891B2] dark:text-cyan-300"
                  >
                    Set N/A
                  </button>
                )}
              </div>
              <NumericCellInput
                value={val ?? null}
                allowNull
                fractionDigits={digits}
                placeholder={pickLang(language, "N/A (kosong)", "N/A (empty)")}
                ariaLabel={`${nutName} ${ingName}`}
                onCommit={(next) =>
                  onUpdate(ingredient.id, {
                    nutrients: { ...ingredient.nutrients, [nut.id]: next },
                  })
                }
              />
              {stochasticEnabled && (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#E2E8F0] pt-1.5 dark:border-[#1E333D]">
                  <span className="text-[10px] font-medium text-[#54707E] dark:text-slate-400">
                    σ ({pickLang(language, "Simpangan Baku", "Std Dev")})
                  </span>
                  <div className="w-24">
                    <NumericCellInput
                      value={sigmaVal}
                      allowNull
                      fractionDigits={digits === 0 ? 1 : 3}
                      placeholder="0"
                      ariaLabel={`Sigma ${nutName} ${ingName}`}
                      onCommit={(next) => updateStdDev(nut.id, next)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={ingName}
      subtitle={`${pickLang(language, "Basis data", "Data basis")}: ${ingredient.basis === "as_fed" ? "As-Fed" : pickLang(language, "Bahan Kering (BK)", "Dry Matter (DM)")} · ${ingredient.source}`}
      footer={
        <div className="flex justify-end">
          <Button variant="primary" size="md" onClick={onClose}>
            {pickLang(language, "Selesai", "Done")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SegmentedTabs
          ariaLabel={pickLang(
            language,
            "Kategori detail bahan pakan",
            "Ingredient detail sections",
          )}
          value={tab}
          onChange={setTab}
          options={[
            { value: "basic", label: pickLang(language, "Dasar", "Basic") },
            {
              value: "amino",
              label: pickLang(language, "Asam Amino & Mineral", "Amino & Electrolytes"),
            },
            { value: "fiber_anf", label: pickLang(language, "Serat & ANF", "Fiber & ANF") },
            { value: "rules", label: pickLang(language, "Harga & Batas", "Price & Limits") },
          ]}
        />

        {tab === "basic" && renderNutrientInputs(["basic"])}
        {tab === "amino" && renderNutrientInputs(["amino_acid", "mineral_electrolyte"])}
        {tab === "fiber_anf" && renderNutrientInputs(["fiber_carb", "anf_physical"])}

        {tab === "rules" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="glass-card rounded-2xl p-3.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#122B36] dark:text-slate-100">
                    {pickLang(language, "Harga Custom (Rp/kg)", "Custom Price (IDR/kg)")}
                  </span>
                  {ingredient.priceOverride !== undefined && (
                    <button
                      type="button"
                      onClick={() => onResetPrice(ingredient.id)}
                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {pickLang(language, "Reset pasar", "Reset market")}
                    </button>
                  )}
                </div>
                <NumericCellInput
                  value={ingredient.priceOverride ?? ingredient.pricePerKg}
                  treatSingleThousandDot
                  fractionDigits={0}
                  ariaLabel={`${pickLang(language, "Harga per kg", "Price per kg")} ${ingName}`}
                  onCommit={(next) => {
                    if (next === null) return;
                    if (Math.abs(next - ingredient.pricePerKg) < 0.01) {
                      onResetPrice(ingredient.id);
                    } else {
                      onUpdate(ingredient.id, { priceOverride: next });
                    }
                  }}
                />
                <p className="mt-1.5 text-[11px] text-[#54707E] dark:text-slate-400">
                  {pickLang(language, "Acuan pasar", "Market reference")}:{" "}
                  {formatCurrencyIdr(ingredient.pricePerKg)}
                </p>
              </div>

              <div className="glass-card rounded-2xl p-3.5">
                <span className="mb-1 block text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  {pickLang(language, "Bahan Kering / Dry Matter (%)", "Dry Matter (%)")}
                </span>
                <NumericCellInput
                  value={ingredient.dryMatter}
                  fractionDigits={1}
                  invalid={ingredient.dryMatter <= 0 || ingredient.dryMatter > 100}
                  errorTooltip={pickLang(
                    language,
                    "BK harus > 0 dan <= 100%",
                    "DM must be > 0 and <= 100%",
                  )}
                  ariaLabel={`BK % ${ingName}`}
                  onCommit={(next) => {
                    if (next !== null && next > 0 && next <= 100) {
                      onUpdate(ingredient.id, { dryMatter: next });
                    }
                  }}
                />
                <p className="mt-1.5 text-[11px] text-[#54707E] dark:text-slate-400">
                  {pickLang(language, "Kadar air estimasi", "Estimated moisture")}:{" "}
                  {(100 - ingredient.dryMatter).toFixed(1)}%
                </p>
              </div>
            </div>

            <div
              className={
                invalidBounds
                  ? "glass-card glass-card-coral grid grid-cols-2 gap-3 rounded-2xl p-3.5"
                  : "glass-card grid grid-cols-2 gap-3 rounded-2xl p-3.5"
              }
            >
              <div>
                <span className="mb-1 block text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  {pickLang(language, "Batas Min (%)", "Min Limit (%)")}
                </span>
                <NumericCellInput
                  value={min}
                  invalid={invalidBounds}
                  errorTooltip={pickLang(
                    language,
                    "Min tidak boleh lebih besar dari Max",
                    "Min cannot exceed Max",
                  )}
                  ariaLabel={`Inklusi minimal ${ingName}`}
                  onCommit={(next) =>
                    onUpdate(ingredient.id, {
                      inclusion: { ...ingredient.inclusion, min: next ?? 0 },
                    })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  {pickLang(language, "Batas Max (%)", "Max Limit (%)")}
                </span>
                <NumericCellInput
                  value={max}
                  invalid={invalidBounds}
                  errorTooltip={pickLang(language, "Max harus >= Min", "Max must be >= Min")}
                  ariaLabel={`Inklusi maksimal ${ingName}`}
                  onCommit={(next) =>
                    onUpdate(ingredient.id, {
                      inclusion: { ...ingredient.inclusion, max: next ?? 100 },
                    })
                  }
                />
              </div>
            </div>

            <div className="glass-card flex items-center justify-between gap-3 rounded-2xl p-3.5">
              <div>
                <p className="text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  {pickLang(language, "Fosfor Fitat / Phytate-P (%)", "Phytate-P Substrate (%)")}
                </p>
                <p className="text-[11px] text-[#54707E] dark:text-slate-400">
                  {pickLang(
                    language,
                    "Plafon pelepasan fosfor oleh enzim fitase (PR-05).",
                    "Substrate pool ceiling for phytase phosphorus release (PR-05).",
                  )}
                </p>
              </div>
              <div className="w-28">
                <NumericCellInput
                  value={ingredient.phytateP ?? null}
                  allowNull
                  fractionDigits={3}
                  placeholder="N/A"
                  ariaLabel={`Phytate-P ${ingName}`}
                  onCommit={(next) => {
                    if (next === null) {
                      const { phytateP: _removed, ...rest } = ingredient;
                      void _removed;
                      onUpdate(ingredient.id, rest);
                    } else {
                      onUpdate(ingredient.id, { phytateP: Math.max(0, next) });
                    }
                  }}
                />
              </div>
            </div>

            <div className="glass-card flex items-center justify-between gap-3 rounded-2xl p-3.5">
              <div>
                <p className="text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  {pickLang(
                    language,
                    "Aturan Anti-Nol Khusus Bahan Ini",
                    "Per-Ingredient Anti-Zero Rule",
                  )}
                </p>
                <p className="text-[11px] text-[#54707E] dark:text-slate-400">
                  {pickLang(
                    language,
                    "Kunci pemakaian minimal bila bahan tetap diaktifkan",
                    "Enforces minimum usage when ingredient stays active",
                  )}
                </p>
              </div>
              <Switch
                checked={ingredient.zeroInclusionRule?.enforceNonZero ?? false}
                label={`Anti-nol ${ingName}`}
                onCheckedChange={(checked) =>
                  onUpdate(ingredient.id, {
                    zeroInclusionRule: {
                      enforceNonZero: checked,
                      minIfSelected: ingredient.zeroInclusionRule?.minIfSelected ?? 1,
                    },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>
    </SheetDialog>
  );
}
