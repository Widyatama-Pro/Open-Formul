import { memo, useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { formatIisBound, pickLang } from "../../i18n";
import { computeCriticalPriceLadder, type CriticalStep } from "../../solver";
import type {
  AppLanguage,
  BoundDualItem,
  CompositionItem,
  FormulationConfig,
  Ingredient,
  Nutrient,
  NutrientResult,
  OpportunityCostItem,
  Requirement,
} from "../../types";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

export interface ShadowPriceTabProps {
  readonly nutrients: readonly NutrientResult[];
  readonly allNutrients?: readonly Nutrient[];
  readonly composition: readonly CompositionItem[];
  readonly opportunityCosts: readonly OpportunityCostItem[];
  readonly boundDuals: readonly BoundDualItem[];
  readonly ingredients: readonly Ingredient[];
  readonly requirement?: Requirement;
  readonly config?: FormulationConfig;
  readonly language?: AppLanguage;
}

export const ShadowPriceTab = memo(function ShadowPriceTab({
  nutrients,
  allNutrients = MOCK_NUTRIENTS,
  composition,
  opportunityCosts,
  boundDuals,
  ingredients,
  requirement,
  config,
  language = "id",
}: ShadowPriceTabProps) {
  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const nutMap = useMemo(() => new Map(allNutrients.map((n) => [n.id, n])), [allNutrients]);

  const activeIngredients = useMemo(
    () => ingredients.filter((i) => i.isActive !== false),
    [ingredients],
  );
  const [selectedIngId, setSelectedIngId] = useState<string>(
    () => composition[0]?.ingredientId ?? activeIngredients[0]?.id ?? "",
  );
  const [ladderSteps, setLadderSteps] = useState<readonly CriticalStep[] | null>(null);
  const [ladderLoading, setLadderLoading] = useState(false);

  const effectiveTargetId = useMemo(() => {
    if (activeIngredients.some((i) => i.id === selectedIngId)) return selectedIngId;
    return composition[0]?.ingredientId ?? activeIngredients[0]?.id ?? "";
  }, [activeIngredients, composition, selectedIngId]);

  useEffect(() => {
    setLadderSteps(null);
  }, [effectiveTargetId, requirement?.id, config?.activeBasis, config?.optimizationMode]);

  const handleComputeLadder = async () => {
    if (!requirement || !config || !effectiveTargetId) return;
    setLadderLoading(true);
    try {
      const steps = await computeCriticalPriceLadder(
        ingredients,
        requirement,
        config,
        effectiveTargetId,
      );
      setLadderSteps(steps);
    } finally {
      setLadderLoading(false);
    }
  };

  // Unused import guard: formatIisBound stays available for future dual bound extensions if needed
  void formatIisBound;

  return (
    <div className="space-y-3.5 text-xs">
      {/* Shadow Price Nutrisi */}
      <div className="glass-card rounded-xl p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-bold text-[#0F172A] dark:text-white">
            {pickLang(
              language,
              "Shadow Price Kendala Nutrisi (Dual Value)",
              "Nutrient Constraint Shadow Prices (Dual Value)",
            )}
          </h3>
          <Badge tone="emerald">HiGHS Simplex Dual</Badge>
        </div>
        <p className="mb-2.5 text-[11px] text-[#475569] dark:text-slate-300">
          {pickLang(
            language,
            "Estimasi perubahan biaya per 1 unit pelonggaran batas nutrien (dipisahkan dari Bound Duals batas bahan).",
            "Estimated cost change per 1-unit shift of nutrient bound (separated from ingredient Bound Duals).",
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="border-b border-[#E2E8F0] text-[11px] font-bold text-[#475569] dark:border-[#1E333D] dark:text-slate-300">
              <tr>
                <th className="py-1.5 text-left">{pickLang(language, "Nutrien", "Nutrient")}</th>
                <th className="py-1.5 text-right">Shadow Price</th>
                <th className="py-1.5 text-right">
                  {pickLang(language, "Rentang RHS Valid", "Valid RHS Range")}
                </th>
                <th className="py-1.5 text-right">
                  {pickLang(language, "Status Batas", "Bound Status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E333D]">
              {nutrients.map((n) => {
                const meta = nutMap.get(n.nutrientId);
                const sp = n.shadowPrice ?? 0;
                const nutLabel =
                  language === "id"
                    ? (meta?.name ?? n.nutrientId)
                    : (meta?.nameEn ?? meta?.name ?? n.nutrientId);
                return (
                  <tr key={n.nutrientId}>
                    <td className="py-1.5 font-semibold text-[#0F172A] dark:text-slate-100">
                      {nutLabel} ({meta?.unit ?? ""})
                    </td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-[#0F172A] dark:text-slate-100">
                      <div>{sp !== 0 ? formatCurrencyIdr(sp) : "Rp 0"}</div>
                      {n.isDegenerate &&
                        (n.shadowPriceDown !== undefined || n.shadowPriceUp !== undefined) && (
                          <div className="text-[10px] font-normal text-[#475569] dark:text-slate-400">
                            ↓{" "}
                            {n.shadowPriceDown != null ? formatCurrencyIdr(n.shadowPriceDown) : "—"}{" "}
                            · ↑ {n.shadowPriceUp != null ? formatCurrencyIdr(n.shadowPriceUp) : "—"}
                          </div>
                        )}
                    </td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-[#475569] dark:text-slate-300">
                      {n.rhsRange && (n.rhsRange.min !== null || n.rhsRange.max !== null)
                        ? `${n.rhsRange.min !== null ? formatNumberLocale(n.rhsRange.min, 2) : "0"} – ${
                            n.rhsRange.max !== null ? formatNumberLocale(n.rhsRange.max, 2) : "∞"
                          }`
                        : "—"}
                    </td>
                    <td className="py-1.5 text-right">
                      {n.isDegenerate ? (
                        <Badge tone="rose">{pickLang(language, "Degenerat", "Degenerate")}</Badge>
                      ) : (
                        <Badge tone={sp !== 0 ? "amber" : "neutral"}>
                          {sp !== 0
                            ? pickLang(language, "Mengikat", "Binding")
                            : pickLang(language, "Longgar", "Slack")}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PR-02: Kurva Tangga Harga Beli (Critical-Region Stepping) */}
      {requirement && config && activeIngredients.length > 0 && (
        <div className="glass-card rounded-xl p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 font-bold text-[#0F172A] dark:text-white">
                <TrendingUp className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-300" />
                <span>
                  {pickLang(
                    language,
                    "PR-02 · Peta Tangga Harga Beli (Buy / No-Buy Ladder)",
                    "PR-02 · Parametric Buy / No-Buy Price Ladder",
                  )}
                </span>
              </h3>
              <p className="mt-0.5 text-[11px] text-[#475569] dark:text-slate-300">
                {pickLang(
                  language,
                  "Menelusuri titik breakpoint harga di mana porsi bahan berubah basisnya di HiGHS.",
                  "Walks exact cost breakpoints where ingredient inclusion shifts in HiGHS simplex.",
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label={pickLang(
                  language,
                  "Pilih bahan untuk kurva tangga harga",
                  "Select ingredient for price ladder",
                )}
                value={effectiveTargetId}
                onChange={(e) => setSelectedIngId(e.target.value)}
                className="h-8 min-h-8 w-44 py-0 text-[11px]"
              >
                {activeIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {language === "id" ? ing.name : (ing.nameEn ?? ing.name)}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                size="sm"
                disabled={ladderLoading}
                onClick={() => void handleComputeLadder()}
                className="shrink-0 whitespace-nowrap"
              >
                {pickLang(language, "Hitung Tangga Harga", "Compute Price Ladder")}
              </Button>
            </div>
          </div>

          {ladderLoading && (
            <div className="space-y-2 py-2" aria-label="Menghitung tangga harga">
              <div className="skeleton-shimmer h-4 w-2/3 rounded" />
              <div className="skeleton-shimmer h-16 w-full rounded-lg" />
            </div>
          )}

          {!ladderLoading && ladderSteps && ladderSteps.length === 0 && (
            <p className="text-[11px] text-[#475569] dark:text-slate-300">
              {pickLang(
                language,
                "Kurva tangga tidak tersedia pada kondisi infeasible atau error.",
                "Price ladder unavailable when formulation is infeasible.",
              )}
            </p>
          )}

          {!ladderLoading && ladderSteps && ladderSteps.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="border-b border-[#E2E8F0] text-[11px] font-bold text-[#475569] dark:border-[#1E333D] dark:text-slate-300">
                  <tr>
                    <th className="py-1.5 text-left">
                      {pickLang(language, "Titik Harga Bahan", "Ingredient Price")}
                    </th>
                    <th className="py-1.5 text-right">
                      {pickLang(language, "Inklusi Target", "Target Inclusion")}
                    </th>
                    <th className="py-1.5 text-right">
                      {pickLang(language, "Biaya Ransum / kg", "Ration Cost / kg")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E333D]">
                  {ladderSteps.map((step, idx) => {
                    const frac =
                      step.composition.find((c) => c.ingredientId === effectiveTargetId)
                        ?.fraction ?? 0;
                    return (
                      <tr key={`${step.price}-${idx}`}>
                        <td className="py-1.5 font-semibold tabular-nums text-[#0F172A] dark:text-slate-100">
                          {formatCurrencyIdr(step.price)}
                        </td>
                        <td className="py-1.5 text-right font-semibold tabular-nums text-[#059669] dark:text-emerald-400">
                          {formatNumberLocale(frac * 100, 2)}%
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-[#475569] dark:text-slate-200">
                          {step.costPerKg !== null ? formatCurrencyIdr(step.costPerKg) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Price Range bahan terpilih & Opportunity Cost bahan 0% */}
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        <div className="glass-card rounded-xl p-3.5">
          <h3 className="mb-2.5 font-bold text-[#0F172A] dark:text-white">
            {pickLang(
              language,
              "Rentang Harga Aman Bahan Terpilih",
              "Safe Price Range (Selected Feeds)",
            )}
          </h3>
          <div className="space-y-2">
            {composition.map((item) => {
              const ing = ingMap.get(item.ingredientId);
              const ingLabel = ing
                ? language === "id"
                  ? ing.name
                  : (ing.nameEn ?? ing.name)
                : item.ingredientId;
              return (
                <div
                  key={item.ingredientId}
                  className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-1.5 last:border-b-0 dark:border-[#1E333D]"
                >
                  <span className="truncate font-semibold text-[#0F172A] dark:text-slate-100">
                    {ingLabel}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-[#475569] dark:text-slate-200">
                    {item.priceRange?.minPrice !== null && item.priceRange?.minPrice !== undefined
                      ? formatCurrencyIdr(item.priceRange.minPrice)
                      : "0"}{" "}
                    –{" "}
                    {item.priceRange?.maxPrice !== null && item.priceRange?.maxPrice !== undefined
                      ? formatCurrencyIdr(item.priceRange.maxPrice)
                      : "∞"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5">
          <h3 className="mb-2.5 font-bold text-[#0F172A] dark:text-white">
            {pickLang(
              language,
              "Opportunity Cost (Bahan Tidak Terpakai 0%)",
              "Opportunity Cost (Unused Feeds 0%)",
            )}
          </h3>
          {opportunityCosts.length === 0 ? (
            <p className="text-[11px] text-[#475569] dark:text-slate-300">
              {pickLang(
                language,
                "Semua bahan aktif masuk dalam formula.",
                "All active ingredients are included in the ration.",
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {opportunityCosts.map((opp) => {
                const ing = ingMap.get(opp.ingredientId);
                const ingLabel = ing
                  ? language === "id"
                    ? ing.name
                    : (ing.nameEn ?? ing.name)
                  : opp.ingredientId;
                return (
                  <div key={opp.ingredientId} className="neu-well rounded-lg p-2.5">
                    <div className="flex justify-between font-semibold text-[#0F172A] dark:text-white">
                      <span>{ingLabel}</span>
                      <span className="tabular-nums text-[#059669] dark:text-emerald-300">
                        {pickLang(language, "Impas ≤", "Break-even ≤")}{" "}
                        {formatCurrencyIdr(opp.opportunityPrice)}/kg
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] tabular-nums text-[#475569] dark:text-slate-300">
                      {pickLang(
                        language,
                        `Harga saat ini ${formatCurrencyIdr(opp.currentPrice)} (turunkan ${formatCurrencyIdr(opp.reducedCost)} agar masuk ransum)`,
                        `Current price ${formatCurrencyIdr(opp.currentPrice)} (drop by ${formatCurrencyIdr(opp.reducedCost)} to enter ration)`,
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {boundDuals.length > 0 && (
            <div className="mt-3 border-t border-[#E2E8F0] pt-2.5 dark:border-[#1E333D]">
              <p className="mb-1 text-[11px] font-bold text-[#0F172A] dark:text-slate-200">
                {pickLang(
                  language,
                  "Bound Duals (Bahan Menempel Batas Min/Max)",
                  "Bound Duals (Feeds at Min/Max Bounds)",
                )}
              </p>
              {boundDuals.map((bd) => {
                const ing = ingMap.get(bd.ingredientId);
                const ingLabel = ing
                  ? language === "id"
                    ? ing.name
                    : (ing.nameEn ?? ing.name)
                  : bd.ingredientId;
                return (
                  <div
                    key={bd.ingredientId}
                    className="flex justify-between text-[11px] tabular-nums text-[#475569] dark:text-slate-300"
                  >
                    <span>
                      {ingLabel} ({bd.boundHit})
                    </span>
                    <span>{formatNumberLocale(bd.dualValue, 0)} IDR/%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
