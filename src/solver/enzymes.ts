import type { EnzymeConfig, Ingredient, NutrientId } from "../types";
import { resolveNutrientValue } from "../utils/equations";

/**
 * PR-05: uplift nutrien efektif per kg ransum dari multi-enzim, dengan retensi termal
 * dan plafon sub-aditif gabungan per nutrien (anti double-counting substrat).
 *
 * θ_e: thermalRetention (0-1). Σ_e uplift_e,i = inclusion_e · θ_e · matrix_{e,i}.
 * Jika enzymeSubAdditiveCap ψ < 1 diberikan, total uplift per nutrien dibatasi ke
 * ψ · Σ_e |uplift_e,i| (skala proporsional), sehingga ∑ r_{i,e} ≤ ψ·Σ potensi individual.
 */
function applySubAdditiveCap(contributions: readonly number[], subAdditiveCap?: number): number {
  if (contributions.length === 0) return 0;
  const raw = contributions.reduce((s, v) => s + v, 0);

  const psi = subAdditiveCap;
  if (psi === undefined || !Number.isFinite(psi) || psi >= 1) return raw;

  const individual = contributions.reduce((s, v) => s + Math.abs(v), 0);
  const cap = Math.max(0, psi) * individual;
  if (Math.abs(raw) <= cap) return raw;
  return Math.sign(raw) * cap;
}

function resolveEnzymeSubstratePool(ingredient: Ingredient, substrateId: string): number | null {
  if (substrateId === "phytate_p" || substrateId === "phytateP") {
    if (typeof ingredient.phytateP === "number" && Number.isFinite(ingredient.phytateP)) {
      return Math.max(0, ingredient.phytateP);
    }
  }
  const val = resolveNutrientValue(ingredient, substrateId);
  return val !== null && Number.isFinite(val) ? Math.max(0, val) : null;
}

export function computeEnzymeUplift(
  nutrientId: NutrientId,
  enzymes: readonly EnzymeConfig[] | undefined,
  subAdditiveCap?: number,
): number {
  if (!enzymes || enzymes.length === 0) return 0;

  const contributions = enzymes
    .map((e) => {
      const base = e.matrix[nutrientId] ?? 0;
      if (!Number.isFinite(base) || base === 0) return 0;
      const inclusion = Number.isFinite(e.inclusionFraction ?? 1) ? (e.inclusionFraction ?? 1) : 1;
      const retention = Number.isFinite(e.thermalRetention ?? 1) ? (e.thermalRetention ?? 1) : 1;
      return base * inclusion * Math.max(0, Math.min(1, retention));
    })
    .filter((v) => v !== 0);

  return applySubAdditiveCap(contributions, subAdditiveCap);
}

/**
 * Menghitung uplift multi-enzim spesifik per bahan pakan dengan memperhitungkan
 * batas substrat bahan (`substrateNutrientId` / `ingredient.phytateP`) agar bahan
 * bebas substrat (mis. kapur/mineral murni) tidak mendapat pelepasan enzim semu.
 */
export function computeIngredientEnzymeUplift(
  ingredient: Ingredient,
  nutrientId: NutrientId,
  enzymes: readonly EnzymeConfig[] | undefined,
  subAdditiveCap?: number,
): number {
  if (!enzymes || enzymes.length === 0) return 0;

  const contributions: number[] = [];
  const bySubstrate = new Map<string, number[]>();

  for (const e of enzymes) {
    const base = e.matrix[nutrientId] ?? 0;
    if (!Number.isFinite(base) || base === 0) continue;
    const inclusion = Number.isFinite(e.inclusionFraction ?? 1) ? (e.inclusionFraction ?? 1) : 1;
    const retention = Number.isFinite(e.thermalRetention ?? 1) ? (e.thermalRetention ?? 1) : 1;
    const rawUplift = base * inclusion * Math.max(0, Math.min(1, retention));
    if (rawUplift === 0) continue;

    if (e.substrateNutrientId) {
      const pool = resolveEnzymeSubstratePool(ingredient, e.substrateNutrientId);
      if (pool !== null) {
        const capped = Math.sign(rawUplift) * Math.min(Math.abs(rawUplift), pool);
        if (capped === 0) continue;
        const list = bySubstrate.get(e.substrateNutrientId) ?? [];
        list.push(capped);
        bySubstrate.set(e.substrateNutrientId, list);
        continue;
      }
    }
    contributions.push(rawUplift);
  }

  // Plafon gabungan per substrat agar kombinasi enzim tidak melebihi pool substrat yang sama.
  for (const [substrateId, list] of bySubstrate.entries()) {
    const pool = resolveEnzymeSubstratePool(ingredient, substrateId);
    const sumSub = list.reduce((s, v) => s + v, 0);
    if (pool !== null && Math.abs(sumSub) > pool) {
      const scale = pool / Math.abs(sumSub);
      for (const v of list) contributions.push(v * scale);
    } else {
      contributions.push(...list);
    }
  }

  return applySubAdditiveCap(contributions, subAdditiveCap);
}
