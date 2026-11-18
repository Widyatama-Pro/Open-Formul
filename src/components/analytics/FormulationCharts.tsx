import { memo } from "react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { pickLang } from "../../i18n";
import type {
  AppLanguage,
  CompositionItem,
  Ingredient,
  Nutrient,
  NutrientResult,
} from "../../types";
import { formatNumberLocale } from "../../utils/locale-number";
import { NeumorphicProgressTrack } from "../ui/NeumorphicProgressTrack";

export interface FormulationChartsProps {
  readonly composition: readonly CompositionItem[];
  readonly nutrients: readonly NutrientResult[];
  readonly allNutrients?: readonly Nutrient[];
  readonly ingredients: readonly Ingredient[];
  readonly batchTotalCost: number | null;
  readonly language?: AppLanguage;
}

/** Visualisasi SVG murni & indikator progres: Radar Target vs Aktual, Bar Berat vs Biaya, dan Rentang Nutrien. */
export const FormulationCharts = memo(function FormulationCharts({
  composition,
  nutrients,
  allNutrients = MOCK_NUTRIENTS,
  ingredients,
  batchTotalCost,
  language = "id",
}: FormulationChartsProps) {
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const nutMap = new Map(allNutrients.map((n) => [n.id, n]));

  const radarItems = nutrients
    .filter((n) => n.min !== undefined || n.max !== undefined)
    .slice(0, 6);

  const cx = 110;
  const cy = 110;
  const maxR = 72;

  const getPolygonPoints = (ratios: readonly number[]) =>
    ratios
      .map((r, i) => {
        const angle = (Math.PI * 2 * i) / Math.max(ratios.length, 1) - Math.PI / 2;
        const clamped = Math.max(0.15, Math.min(1.25, r));
        const px = cx + Math.cos(angle) * maxR * clamped;
        const py = cy + Math.sin(angle) * maxR * clamped;
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");

  const targetPolygon = getPolygonPoints(radarItems.map(() => 1));
  const actualRatios = radarItems.map((n) => {
    const ref =
      n.min !== undefined && n.max !== undefined
        ? (n.min + n.max) / 2
        : (n.min ?? n.max ?? (n.value || 1));
    return ref > 0 ? n.value / ref : 1;
  });
  const actualPolygon = getPolygonPoints(actualRatios);

  return (
    <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
      {/* Radar Chart Target Ideal vs Hasil Aktual */}
      <div className="glass-card rounded-xl p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F172A] dark:text-white">
            {pickLang(language, "Radar Target Ideal vs Aktual", "Ideal Target vs Actual Radar")}
          </h3>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1 text-[#475569] dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-slate-400" /> Target (100%)
            </span>
            <span className="inline-flex items-center gap-1 text-[#059669] dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-[#059669] dark:bg-emerald-400" />{" "}
              {pickLang(language, "Aktual", "Actual")}
            </span>
          </div>
        </div>

        {radarItems.length < 3 ? (
          <p className="py-10 text-center text-xs text-[#475569] dark:text-slate-300">
            {pickLang(
              language,
              "Aktifkan minimal 3 batasan nutrien untuk menampilkan Radar Chart.",
              "Enable at least 3 nutrient constraints to display the Radar Chart.",
            )}
          </p>
        ) : (
          <div className="flex justify-center">
            <svg viewBox="0 0 220 220" className="h-48 w-48" role="img" aria-label="Radar nutrien">
              {[0.5, 1].map((ring) => (
                <circle
                  key={ring}
                  cx={cx}
                  cy={cy}
                  r={maxR * ring}
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-300 dark:text-slate-700"
                  strokeDasharray={ring === 0.5 ? "3 3" : undefined}
                />
              ))}
              {radarItems.map((item, i) => {
                const angle = (Math.PI * 2 * i) / radarItems.length - Math.PI / 2;
                const x2 = cx + Math.cos(angle) * maxR;
                const y2 = cy + Math.sin(angle) * maxR;
                const lx = cx + Math.cos(angle) * (maxR + 18);
                const ly = cy + Math.sin(angle) * (maxR + 18);
                return (
                  <g key={item.nutrientId}>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={x2}
                      y2={y2}
                      stroke="currentColor"
                      className="text-slate-300 dark:text-slate-700"
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-[#475569] text-[9px] font-bold uppercase dark:fill-slate-300"
                    >
                      {item.nutrientId}
                    </text>
                  </g>
                );
              })}
              <polygon
                points={targetPolygon}
                fill="none"
                stroke="#94A3B8"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <polygon
                points={actualPolygon}
                fill="rgba(5, 150, 105, 0.18)"
                stroke="#059669"
                strokeWidth={2}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Bar Chart Porsi Berat (%) vs Porsi Biaya (%) */}
      <div className="glass-card rounded-xl p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F172A] dark:text-white">
            {pickLang(
              language,
              "Porsi Berat (%) vs Porsi Biaya (%)",
              "Weight Share (%) vs Cost Share (%)",
            )}
          </h3>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1 text-[#0F3D3E] dark:text-teal-300">
              <span className="h-2 w-2 rounded-xs bg-[#0F3D3E] dark:bg-teal-400" />{" "}
              {pickLang(language, "Berat", "Weight")}
            </span>
            <span className="inline-flex items-center gap-1 text-[#059669] dark:text-emerald-300">
              <span className="h-2 w-2 rounded-xs bg-[#059669]" />{" "}
              {pickLang(language, "Biaya", "Cost")}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {composition.slice(0, 6).map((item) => {
            const ing = ingMap.get(item.ingredientId);
            const weightPct = item.fraction * 100;
            const costPct =
              batchTotalCost && batchTotalCost > 0 && item.costContribution !== undefined
                ? (item.costContribution / batchTotalCost) * 100
                : weightPct;
            const ingName = ing
              ? language === "id"
                ? ing.name
                : (ing.nameEn ?? ing.name)
              : item.ingredientId;

            return (
              <div key={item.ingredientId} className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="truncate font-semibold text-[#0F172A] dark:text-slate-100">
                    {ingName}
                  </span>
                  <span className="shrink-0 tabular-nums text-[#475569] dark:text-slate-300">
                    {formatNumberLocale(weightPct, 1)}% {pickLang(language, "berat", "weight")} ·{" "}
                    {formatNumberLocale(costPct, 1)}% {pickLang(language, "biaya", "cost")}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="neu-well h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-[#0F3D3E] dark:bg-teal-400"
                      style={{ width: `${Math.min(100, weightPct)}%` }}
                    />
                  </div>
                  <div className="neu-well h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-[#059669]"
                      style={{ width: `${Math.min(100, costPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar Rentang Pencapaian Nutrien */}
      <div className="glass-card rounded-xl p-3.5 xl:col-span-2">
        <h3 className="mb-3 text-xs font-bold text-[#0F172A] dark:text-white">
          {pickLang(
            language,
            "Indikator Rentang Pencapaian Nutrien (Min–Max)",
            "Nutrient Target Range Indicators (Min–Max)",
          )}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {radarItems.map((n) => {
            const meta = nutMap.get(n.nutrientId);
            const lo = n.min ?? 0;
            const hi = n.max ?? (n.min !== undefined ? n.min * 1.25 : n.value * 1.25);
            const scaleMax = Math.max(hi * 1.15, n.value * 1.05, 1);
            const minPct = (lo / scaleMax) * 100;
            const maxPct = (hi / scaleMax) * 100;
            const valPct = Math.min(100, Math.max(0, (n.value / scaleMax) * 100));
            const nutName = meta
              ? language === "id"
                ? meta.name
                : (meta.nameEn ?? meta.name)
              : n.nutrientId;

            return (
              <div key={n.nutrientId} className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#0F172A] dark:text-slate-100">
                    {nutName}
                  </span>
                  <span className="font-semibold tabular-nums text-[#475569] dark:text-slate-200">
                    {formatNumberLocale(n.value, meta?.unit === "kcal/kg" ? 0 : 2)}{" "}
                    {meta?.unit ?? ""}
                  </span>
                </div>
                <NeumorphicProgressTrack
                  percent={valPct}
                  rangeStartPct={minPct}
                  rangeWidthPct={Math.max(4, maxPct - minPct)}
                  tone={n.status === "met" ? "emerald" : "coral"}
                  showThumb
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
