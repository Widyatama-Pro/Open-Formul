import { memo } from "react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getNutrientDisplayName, getNutrientShortName, pickLang } from "../../i18n";
import { useTheme } from "../../theme";
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
  readonly simpleMode?: boolean;
  readonly language?: AppLanguage;
}

/** Visualisasi SVG ringkas & reaktif terhadap tema aktif: Radar Target vs Aktual, Bar Berat vs Biaya, dan Rentang Nutrien. */
export const FormulationCharts = memo(function FormulationCharts({
  composition,
  nutrients,
  allNutrients = MOCK_NUTRIENTS,
  ingredients,
  simpleMode = true,
  language = "id",
}: FormulationChartsProps) {
  const { paletteId, resolvedMode, amoledPureBlack } = useTheme();
  const themeSignature = `${paletteId}-${resolvedMode}-${amoledPureBlack ? "amoled" : "std"}`;

  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const nutMap = new Map(allNutrients.map((n) => [n.id, n]));
  const totalCostContribution = composition.reduce(
    (sum, item) => sum + Math.max(0, item.costContribution ?? 0),
    0,
  );

  const radarItems = nutrients
    .filter((n) => n.min !== undefined || n.max !== undefined)
    .slice(0, 6);

  const cx = 90;
  const cy = 90;
  const maxR = 54;

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
    <div data-theme-chart={themeSignature} className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
      {/* Radar Chart Target Ideal vs Hasil Aktual (ukuran ringkas) */}
      <div className="glass-card rounded-xl p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            {pickLang(language, "Radar Target Ideal vs Aktual", "Ideal Target vs Actual Radar")}
          </h3>
          <div className="flex items-center gap-2.5 text-[10px] font-medium">
            <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--chart-radar-target)]" /> Target
            </span>
            <span className="inline-flex items-center gap-1 text-[var(--chart-radar-actual-stroke)]">
              <span className="h-2 w-2 rounded-full bg-[var(--chart-radar-actual-stroke)]" />{" "}
              {pickLang(language, "Aktual", "Actual")}
            </span>
          </div>
        </div>

        {radarItems.length < 3 ? (
          <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Aktifkan minimal 3 batasan nutrien untuk menampilkan Radar Chart.",
              "Enable at least 3 nutrient constraints to display the Radar Chart.",
            )}
          </p>
        ) : (
          <div className="flex justify-center">
            <svg viewBox="0 0 180 180" className="h-32 w-32" role="img" aria-label="Radar nutrien">
              {[0.5, 1].map((ring) => (
                <circle
                  key={ring}
                  cx={cx}
                  cy={cy}
                  r={maxR * ring}
                  fill="none"
                  stroke="var(--chart-radar-grid)"
                  strokeDasharray={ring === 0.5 ? "3 3" : undefined}
                />
              ))}
              {radarItems.map((item, i) => {
                const angle = (Math.PI * 2 * i) / radarItems.length - Math.PI / 2;
                const x2 = cx + Math.cos(angle) * maxR;
                const y2 = cy + Math.sin(angle) * maxR;
                const lx = cx + Math.cos(angle) * (maxR + 16);
                const ly = cy + Math.sin(angle) * (maxR + 16);
                const meta = nutMap.get(item.nutrientId);
                const axisLabel = meta ? getNutrientShortName(meta, language) : item.nutrientId;
                return (
                  <g key={item.nutrientId}>
                    <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--chart-radar-grid)" />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--text-secondary)"
                      className="text-[9px] font-bold"
                    >
                      {axisLabel}
                    </text>
                  </g>
                );
              })}
              <polygon
                points={targetPolygon}
                fill="none"
                stroke="var(--chart-radar-target)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <polygon
                points={actualPolygon}
                fill="var(--chart-radar-actual-fill)"
                stroke="var(--chart-radar-actual-stroke)"
                strokeWidth={1.75}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Bar Chart Porsi Berat (%) vs Porsi Biaya (%) — kompak */}
      <div className="glass-card rounded-xl p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            {pickLang(
              language,
              "Porsi Berat (%) vs Porsi Biaya (%)",
              "Weight Share (%) vs Cost Share (%)",
            )}
          </h3>
          <div className="flex items-center gap-2.5 text-[10px] font-medium">
            <span className="inline-flex items-center gap-1 text-[var(--chart-weight-bar)]">
              <span className="h-2 w-2 rounded-xs bg-[var(--chart-weight-bar)]" />{" "}
              {pickLang(language, "Berat", "Weight")}
            </span>
            <span className="inline-flex items-center gap-1 text-[var(--chart-cost-bar)]">
              <span className="h-2 w-2 rounded-xs bg-[var(--chart-cost-bar)]" />{" "}
              {pickLang(language, "Biaya", "Cost")}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {composition.slice(0, 5).map((item) => {
            const ing = ingMap.get(item.ingredientId);
            const weightPct = item.fraction * 100;
            const costPct =
              totalCostContribution > 0 && item.costContribution !== undefined
                ? (Math.max(0, item.costContribution) / totalCostContribution) * 100
                : weightPct;
            const ingName = ing
              ? language === "id"
                ? ing.name
                : (ing.nameEn ?? ing.name)
              : item.ingredientId;

            return (
              <div key={item.ingredientId} className="space-y-0.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="truncate font-semibold text-[var(--text-primary)]">
                    {ingName}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-secondary)]">
                    {formatNumberLocale(weightPct, 1)}% {pickLang(language, "berat", "wt")} ·{" "}
                    {formatNumberLocale(costPct, 1)}% {pickLang(language, "biaya", "cost")}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-0.5">
                  <div className="neu-well h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-[var(--chart-weight-bar)]"
                      style={{ width: `${Math.min(100, weightPct)}%` }}
                    />
                  </div>
                  <div className="neu-well h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-[var(--chart-cost-bar)]"
                      style={{ width: `${Math.min(100, costPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar Rentang Pencapaian Nutrien — kompak */}
      <div className="glass-card rounded-xl p-2.5 xl:col-span-2">
        <h3 className="mb-2 text-xs font-bold text-[var(--text-primary)]">
          {pickLang(
            language,
            "Indikator Rentang Pencapaian Nutrien (Min–Max)",
            "Nutrient Target Range Indicators (Min–Max)",
          )}
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {radarItems.map((n) => {
            const meta = nutMap.get(n.nutrientId);
            const lo = n.min ?? 0;
            const hi = n.max ?? (n.min !== undefined ? n.min * 1.25 : n.value * 1.25);
            const scaleMax = Math.max(hi * 1.15, n.value * 1.05, 1);
            const minPct = (lo / scaleMax) * 100;
            const maxPct = (hi / scaleMax) * 100;
            const valPct = Math.min(100, Math.max(0, (n.value / scaleMax) * 100));
            const nutName = meta
              ? getNutrientDisplayName(meta, language, simpleMode)
              : n.nutrientId;

            return (
              <div key={n.nutrientId} className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-1">
                  <span className="truncate font-semibold text-[var(--text-primary)]">
                    {nutName}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-[var(--text-secondary)]">
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
