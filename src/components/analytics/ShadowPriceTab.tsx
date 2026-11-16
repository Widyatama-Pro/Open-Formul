import { MOCK_NUTRIENTS } from "../../data/mock-state";
import type {
  BoundDualItem,
  CompositionItem,
  Ingredient,
  Nutrient,
  NutrientResult,
  OpportunityCostItem,
} from "../../types";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";

export interface ShadowPriceTabProps {
  readonly nutrients: readonly NutrientResult[];
  readonly allNutrients?: readonly Nutrient[];
  readonly composition: readonly CompositionItem[];
  readonly opportunityCosts: readonly OpportunityCostItem[];
  readonly boundDuals: readonly BoundDualItem[];
  readonly ingredients: readonly Ingredient[];
}

export function ShadowPriceTab({
  nutrients,
  allNutrients = MOCK_NUTRIENTS,
  composition,
  opportunityCosts,
  boundDuals,
  ingredients,
}: ShadowPriceTabProps) {
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const nutMap = new Map(allNutrients.map((n) => [n.id, n]));

  return (
    <div className="space-y-4 text-xs">
      {/* Shadow Price Nutrisi */}
      <div className="glass-card rounded-2xl p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold text-[#122B36] dark:text-white">
            Shadow Price Kendala Nutrisi (Dual Value)
          </h3>
          <Badge tone="emerald">HiGHS Simplex Dual</Badge>
        </div>
        <p className="mb-2.5 text-[11px] text-[#54707E] dark:text-slate-300">
          Estimasi perubahan biaya per 1 unit pelonggaran batas nutrien (dipisahkan dari Bound Duals
          batas bahan).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="border-b border-white/75 text-[11px] font-bold text-[#54707E] dark:border-cyan-200/10 dark:text-slate-300">
              <tr>
                <th className="py-1.5 text-left">Nutrien</th>
                <th className="py-1.5 text-right">Shadow Price</th>
                <th className="py-1.5 text-right">Status Batas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/60 dark:divide-cyan-200/10">
              {nutrients.map((n) => {
                const meta = nutMap.get(n.nutrientId);
                const sp = n.shadowPrice ?? 0;
                return (
                  <tr key={n.nutrientId}>
                    <td className="py-1.5 font-semibold text-[#122B36] dark:text-slate-100">
                      {meta?.name ?? n.nutrientId} ({meta?.unit ?? ""})
                    </td>
                    <td className="py-1.5 text-right font-medium tabular-nums">
                      {sp !== 0 ? formatCurrencyIdr(sp) : "Rp 0"}
                    </td>
                    <td className="py-1.5 text-right">
                      <Badge tone={sp !== 0 ? "amber" : "neutral"}>
                        {sp !== 0 ? "Mengikat" : "Longgar"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Range bahan terpilih & Opportunity Cost bahan 0% */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="glass-card rounded-2xl p-3.5">
          <h3 className="mb-2.5 font-bold text-[#122B36] dark:text-white">
            Rentang Harga Aman Bahan Terpilih
          </h3>
          <div className="space-y-2">
            {composition.map((item) => {
              const ing = ingMap.get(item.ingredientId);
              return (
                <div
                  key={item.ingredientId}
                  className="flex items-center justify-between gap-2 border-b border-white/60 pb-1.5 last:border-b-0 dark:border-cyan-200/10"
                >
                  <span className="truncate font-semibold text-[#122B36] dark:text-slate-100">
                    {ing?.name ?? item.ingredientId}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-[#375563] dark:text-slate-200">
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

        <div className="glass-card rounded-2xl p-3.5">
          <h3 className="mb-2.5 font-bold text-[#122B36] dark:text-white">
            Opportunity Cost (Bahan Tidak Terpakai 0%)
          </h3>
          {opportunityCosts.length === 0 ? (
            <p className="text-[11px] text-[#54707E]">Semua bahan aktif masuk dalam formula.</p>
          ) : (
            <div className="space-y-2">
              {opportunityCosts.map((opp) => {
                const ing = ingMap.get(opp.ingredientId);
                return (
                  <div key={opp.ingredientId} className="neu-well rounded-xl p-2.5">
                    <div className="flex justify-between font-semibold text-[#122B36] dark:text-white">
                      <span>{ing?.name ?? opp.ingredientId}</span>
                      <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
                        Impas ≤ {formatCurrencyIdr(opp.opportunityPrice)}/kg
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] tabular-nums text-[#54707E] dark:text-slate-300">
                      Harga saat ini {formatCurrencyIdr(opp.currentPrice)} (turunkan{" "}
                      {formatCurrencyIdr(opp.reducedCost)} agar masuk ransum)
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {boundDuals.length > 0 && (
            <div className="mt-3 border-t border-white/65 pt-2.5 dark:border-cyan-200/10">
              <p className="mb-1 text-[11px] font-bold text-[#375563] dark:text-slate-200">
                Bound Duals (Bahan Menempel Batas Min/Max)
              </p>
              {boundDuals.map((bd) => (
                <div
                  key={bd.ingredientId}
                  className="flex justify-between text-[11px] tabular-nums text-[#54707E] dark:text-slate-300"
                >
                  <span>
                    {ingMap.get(bd.ingredientId)?.name ?? bd.ingredientId} ({bd.boundHit})
                  </span>
                  <span>{formatNumberLocale(bd.dualValue, 0)} IDR/%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
