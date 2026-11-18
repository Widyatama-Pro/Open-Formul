import type { Ingredient, NutrientResult, Requirement, RumenEvaluation } from "../types";
import { resolveNutrientValue } from "../utils/equations";

const RUMINANT_SPECIES_KEYWORDS = ["cattle", "beef", "dairy", "sheep", "goat", "ruminant"];

/** Memeriksa apakah profil kebutuhan atau komposisi relevan untuk evaluator rumen CNCPS/NASEM. */
export function isRumenEvaluationRelevant(
  requirement: Requirement,
  ingredients: readonly Ingredient[],
): boolean {
  const s = requirement.species.toLowerCase();
  if (RUMINANT_SPECIES_KEYWORDS.some((kw) => s.includes(kw))) return true;
  return ingredients.some((ing) => ing.category === "forage");
}

/**
 * PR-05: Evaluator biologis rumen pasca-solve berbasis persamaan aljabar
 * CNCPS v6.5 / NASEM 2021 & teori fill NDF Mertens (1997) (tanpa Genetic Algorithm).
 */
export function evaluateRumenBiology(
  normalizedIngredients: readonly Ingredient[],
  fractionsByIngredientId: ReadonlyMap<string, number>,
  nutrientResults: readonly NutrientResult[],
  requirement: Requirement,
): RumenEvaluation | undefined {
  if (!isRumenEvaluationRelevant(requirement, normalizedIngredients)) {
    return undefined;
  }

  let forageFrac = 0;
  let ndfPct = 0;
  let peuNdf240Pct = 0;
  let cpPct = 0;
  let tdnPct = 0;
  let eePct = 0;
  let starchPct = 0;

  for (const ing of normalizedIngredients) {
    const frac = fractionsByIngredientId.get(ing.id) ?? 0;
    if (frac <= 1e-9) continue;

    const isForage = ing.category === "forage";
    if (isForage) {
      forageFrac += frac;
    }

    const cp = resolveNutrientValue(ing, "cp") ?? 0;
    const ee = resolveNutrientValue(ing, "ee") ?? 0;
    const cf = resolveNutrientValue(ing, "cf") ?? 0;
    const ndf = resolveNutrientValue(ing, "ndf") ?? (isForage ? cf * 1.45 : cf * 1.85);
    const tdn = resolveNutrientValue(ing, "tdn") ?? 0;
    const starch = resolveNutrientValue(ing, "starch") ?? 0;

    // Faktor efektivitas fisik (pef) & fraksi uNDF240 (Van Amburgh et al., 2015 CNCPS v6.5)
    const pef = isForage
      ? 0.85
      : ing.category === "energy" || ing.category === "protein"
        ? 0.25
        : 0;
    const explicitUndf240 = resolveNutrientValue(ing, "undf240");
    const undf240 = explicitUndf240 !== null ? explicitUndf240 : ndf * (isForage ? 0.28 : 0.18);

    ndfPct += frac * ndf;
    peuNdf240Pct += frac * undf240 * pef;
    cpPct += frac * cp;
    tdnPct += frac * tdn;
    eePct += frac * ee;
    starchPct += frac * starch;
  }

  const resValue = (id: string): number | undefined =>
    nutrientResults.find((n) => n.nutrientId === id)?.value;

  const finalNdf = resValue("ndf") ?? ndfPct;
  const finalCp = resValue("cp") ?? cpPct;
  const finalTdn = resValue("tdn") ?? tdnPct;
  const finalEe = resValue("ee") ?? eePct;
  const finalStarch = resValue("starch") ?? starchPct;

  // Batas pengisian fisik rumen Mertens (1997): DMI (% BW) ≈ 1.2 / (NDF / 100), dijepit [1.4, 4.2]
  const safeNdf = Math.max(15, finalNdf);
  const estimatedDmiPctBw = Math.min(4.2, Math.max(1.4, 1.2 / (safeNdf / 100)));

  // Laju alir CNCPS v6.5 berbasis level asupan (% BW) & rasio hijauan
  const foragePct = forageFrac * 100;
  const kpForagePctPerH = Number(
    Math.max(1.5, 0.388 + 0.82 * estimatedDmiPctBw + 0.012 * foragePct).toFixed(2),
  );
  const kpConcPctPerH = Number(
    Math.max(2.5, 2.2 + 1.35 * estimatedDmiPctBw - 0.008 * foragePct).toFixed(2),
  );

  // Sintesis Protein Mikroba Rumen (NASEM 2021): ~130 g MCP / kg TDN tercerna, dibatasi ketersediaan N rumen
  const tdnBasedMcp = finalTdn > 0 ? 130 * (finalTdn / 100) : 75;
  const cpCeilingMcp = finalCp > 0 ? finalCp * 10 * 0.68 : tdnBasedMcp;
  const microbialProteinGPerKgDm = Math.max(0, Math.min(tdnBasedMcp, cpCeilingMcp));

  // Estimasi Emisi Metana Enterik ringan (g CH4 / kg DM, Moraes et al. 2014/2015):
  // dipengaruhi positif oleh serat NDF & negatif oleh lemak (EE)
  const predictedMethaneGPerKgDm = Math.max(
    8,
    13.5 + 0.24 * finalNdf - 0.85 * Math.max(0, finalEe - 2.5),
  );

  const acidosisRisk: RumenEvaluation["acidosisRisk"] =
    foragePct < 20 || (finalNdf > 0 && finalNdf < 24) || (finalStarch > 32 && peuNdf240Pct < 4)
      ? "high"
      : foragePct < 35 || (finalNdf > 0 && finalNdf < 29)
        ? "moderate"
        : "low";

  return {
    forageFractionPct: Number(foragePct.toFixed(2)),
    ndfPct: Number(finalNdf.toFixed(2)),
    peuNdf240Pct: Number(peuNdf240Pct.toFixed(2)),
    estimatedDmiPctBw: Number(estimatedDmiPctBw.toFixed(2)),
    kpForagePctPerH,
    kpConcPctPerH,
    microbialProteinGPerKgDm: Number(microbialProteinGPerKgDm.toFixed(1)),
    predictedMethaneGPerKgDm: Number(predictedMethaneGPerKgDm.toFixed(1)),
    acidosisRisk,
  };
}
