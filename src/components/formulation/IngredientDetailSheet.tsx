import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import type { AppLanguage, Ingredient, Nutrient, NutrientTier } from "../../types";
import { formatCurrencyIdr } from "../../utils/locale-number";
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
  onClose,
  onUpdate,
  onResetPrice,
  language,
}: IngredientDetailSheetProps) {
  const [tab, setTab] = useState<DetailTab>("basic");

  if (!ingredient) return null;

  const min = ingredient.inclusion?.min ?? 0;
  const max = ingredient.inclusion?.max ?? 100;
  const invalidBounds = min > max;

  const filterNutrients = (tiers: readonly NutrientTier[]) =>
    allNutrients.filter((n) => tiers.includes(n.tier ?? "basic"));

  const renderNutrientInputs = (tiers: readonly NutrientTier[]) => {
    const list = filterNutrients(tiers);
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((nut) => {
          const val = ingredient.nutrients[nut.id];
          const isNull = val === null || val === undefined;
          return (
            <div key={nut.id} className="glass-card rounded-2xl p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  {language === "id" ? nut.name : (nut.nameEn ?? nut.name)}{" "}
                  <span className="text-[#6C8693] dark:text-slate-400">
                    ({nut.unit}
                    {nut.isCustom
                      ? ` · Kustom ${nut.defaultBasis === "dry_matter" ? "BK" : "AF"}`
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
                fractionDigits={nut.unit === "kcal/kg" ? 0 : 2}
                placeholder="N/A (kosong)"
                ariaLabel={`${nut.name} pada ${ingredient.name}`}
                onCommit={(next) =>
                  onUpdate(ingredient.id, {
                    nutrients: { ...ingredient.nutrients, [nut.id]: next },
                  })
                }
              />
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
      title={ingredient.name}
      subtitle={`Basis data: ${ingredient.basis === "as_fed" ? "As-Fed" : "Bahan Kering (BK)"} · ${ingredient.source}`}
      footer={
        <div className="flex justify-end">
          <Button variant="primary" size="md" onClick={onClose}>
            Selesai
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SegmentedTabs
          ariaLabel="Kategori detail bahan pakan"
          value={tab}
          onChange={setTab}
          options={[
            { value: "basic", label: "Dasar" },
            { value: "amino", label: "Asam Amino" },
            { value: "fiber_anf", label: "Serat & ANF" },
            { value: "rules", label: "Harga & Batas" },
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
                    Harga Custom (Rp/kg)
                  </span>
                  {ingredient.priceOverride !== undefined && (
                    <button
                      type="button"
                      onClick={() => onResetPrice(ingredient.id)}
                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset pasar
                    </button>
                  )}
                </div>
                <NumericCellInput
                  value={ingredient.priceOverride ?? ingredient.pricePerKg}
                  treatSingleThousandDot
                  fractionDigits={0}
                  ariaLabel={`Harga per kg ${ingredient.name}`}
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
                  Acuan pasar: {formatCurrencyIdr(ingredient.pricePerKg)}
                </p>
              </div>

              <div className="glass-card rounded-2xl p-3.5">
                <span className="mb-1 block text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  Bahan Kering / Dry Matter (%)
                </span>
                <NumericCellInput
                  value={ingredient.dryMatter}
                  fractionDigits={1}
                  invalid={ingredient.dryMatter <= 0 || ingredient.dryMatter > 100}
                  errorTooltip="BK harus > 0 dan <= 100%"
                  ariaLabel={`BK % ${ingredient.name}`}
                  onCommit={(next) => {
                    if (next !== null && next > 0 && next <= 100) {
                      onUpdate(ingredient.id, { dryMatter: next });
                    }
                  }}
                />
                <p className="mt-1.5 text-[11px] text-[#54707E] dark:text-slate-400">
                  Kadar air estimasi: {(100 - ingredient.dryMatter).toFixed(1)}%
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
                  Batas Min (%)
                </span>
                <NumericCellInput
                  value={min}
                  invalid={invalidBounds}
                  errorTooltip="Min tidak boleh lebih besar dari Max"
                  ariaLabel={`Inklusi minimal ${ingredient.name}`}
                  onCommit={(next) =>
                    onUpdate(ingredient.id, {
                      inclusion: { ...ingredient.inclusion, min: next ?? 0 },
                    })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-semibold text-[#122B36] dark:text-slate-100">
                  Batas Max (%)
                </span>
                <NumericCellInput
                  value={max}
                  invalid={invalidBounds}
                  errorTooltip="Max harus >= Min"
                  ariaLabel={`Inklusi maksimal ${ingredient.name}`}
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
                  Aturan Anti-Nol Khusus Bahan Ini
                </p>
                <p className="text-[11px] text-[#54707E] dark:text-slate-400">
                  Kunci pemakaian minimal bila bahan tetap diaktifkan
                </p>
              </div>
              <Switch
                checked={ingredient.zeroInclusionRule?.enforceNonZero ?? false}
                label={`Anti-nol ${ingredient.name}`}
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
