import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { pickLang } from "../../i18n";
import type { AppLanguage, Nutrient, RatioConstraint } from "../../types";
import { formatNumberLocale } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";

export interface RatioConstraintsSectionProps {
  readonly ratios: readonly RatioConstraint[];
  readonly achievedMap: ReadonlyMap<string, number>;
  readonly nutrientsCatalog?: readonly Nutrient[];
  readonly language?: AppLanguage;
}

/** Menampilkan pengunci rasio antar-nutrien (seperti Ca:P dan ME:CP) beserta nilai aktual. */
export function RatioConstraintsSection({
  ratios,
  achievedMap,
  nutrientsCatalog = MOCK_NUTRIENTS,
  language = "id",
}: RatioConstraintsSectionProps) {
  if (ratios.length === 0) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-white/65 pt-3.5 dark:border-cyan-200/10">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-tight text-[#375563] dark:text-slate-200">
          {pickLang(language, "Pengunci Rasio Nutrien", "Nutrient Ratio Locks")}
        </h3>
        <span className="text-[11px] font-medium text-[#6C8693] dark:text-slate-400">
          Linearized LP
        </span>
      </div>

      <div className="space-y-2">
        {ratios.map((ratio, idx) => {
          const num = achievedMap.get(ratio.numerator) ?? 0;
          const den = achievedMap.get(ratio.denominator) ?? 0;
          const actualRatio = den > 1e-6 ? num / den : null;
          const numMeta = nutrientsCatalog.find((n) => n.id === ratio.numerator);
          const denMeta = nutrientsCatalog.find((n) => n.id === ratio.denominator);
          const numLabel = numMeta
            ? language === "id"
              ? numMeta.name
              : (numMeta.nameEn ?? numMeta.name)
            : ratio.numerator;
          const denLabel = denMeta
            ? language === "id"
              ? denMeta.name
              : (denMeta.nameEn ?? denMeta.name)
            : ratio.denominator;
          const isMet =
            actualRatio !== null &&
            (ratio.min === undefined || actualRatio >= ratio.min - 1e-4) &&
            (ratio.max === undefined || actualRatio <= ratio.max + 1e-4);

          return (
            <div
              key={ratio.id ?? `${ratio.numerator}-${ratio.denominator}-${idx}`}
              className="neu-well flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-xs"
            >
              <div>
                <p className="font-semibold text-[#122B36] dark:text-slate-100">
                  {ratio.label ?? `${numLabel} : ${denLabel}`}
                </p>
                <p className="text-[11px] tabular-nums text-[#54707E] dark:text-slate-400">
                  Target: {ratio.min ?? "—"} {pickLang(language, "s/d", "to")} {ratio.max ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tabular-nums text-[#122B36] dark:text-white">
                  {actualRatio !== null ? `${formatNumberLocale(actualRatio, 2)} : 1` : "—"}
                </span>
                <Badge tone={actualRatio === null ? "neutral" : isMet ? "emerald" : "rose"}>
                  {actualRatio === null
                    ? "N/A"
                    : isMet
                      ? pickLang(language, "Sesuai", "Met")
                      : pickLang(language, "Meleset", "Off")}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
