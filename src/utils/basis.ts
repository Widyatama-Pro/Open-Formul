import type { Basis, Ingredient, NutrientId } from "../types";

/** Memvalidasi persentase Bahan Kering (BK/DM) agar berada pada rentang (0, 100]. */
export function assertValidDryMatter(dryMatterPct: number, label?: string): number {
  if (!Number.isFinite(dryMatterPct) || dryMatterPct <= 0 || dryMatterPct > 100) {
    throw new RangeError(
      `Persentase Bahan Kering (BK)${label ? ` pada "${label}"` : ""} harus di antara (0, 100], diterima ${dryMatterPct}.`,
    );
  }
  return dryMatterPct;
}

/**
 * Mengonversi nilai nutrien antara basis As-Fed dan Bahan Kering (BK/DM).
 * Nilai `null` (N/A) dipertahankan sebagai `null` dan `0` tetap `0`.
 */
export function convertNutrientValue(
  value: number | null | undefined,
  fromBasis: Basis,
  toBasis: Basis,
  dryMatterPct: number,
): number | null {
  assertValidDryMatter(dryMatterPct);
  if (value === null || value === undefined) return null;
  if (fromBasis === toBasis) return value;
  const dmRatio = dryMatterPct / 100;
  return fromBasis === "as_fed" ? value / dmRatio : value * dmRatio;
}

/**
 * Mengonversi harga per kg As-Fed ke biaya per kg pada basis model aktif.
 * Untuk model berbasis BK: c^DM = c^AF * 100 / BK.
 */
export function convertPriceToModelBasis(
  pricePerKgAsFed: number,
  targetBasis: Basis,
  dryMatterPct: number,
): number {
  const validDm = assertValidDryMatter(dryMatterPct);
  if (targetBasis === "as_fed") return pricePerKgAsFed;
  return (pricePerKgAsFed * 100) / validDm;
}

/** Menormalkan seluruh profil nutrien bahan pakan ke basis target (`as_fed` atau `dry_matter`). */
export function normalizeIngredientToBasis(ingredient: Ingredient, targetBasis: Basis): Ingredient {
  assertValidDryMatter(ingredient.dryMatter, ingredient.name);
  if (ingredient.basis === targetBasis) {
    return ingredient;
  }

  const normalizedNutrients: Record<NutrientId, number | null> = {};
  for (const [nutrientId, val] of Object.entries(ingredient.nutrients)) {
    normalizedNutrients[nutrientId] = convertNutrientValue(
      val,
      ingredient.basis,
      targetBasis,
      ingredient.dryMatter,
    );
  }

  let normalizedStdDev: Record<NutrientId, number> | undefined;
  if (ingredient.stdDev) {
    normalizedStdDev = {};
    for (const [nutrientId, sigma] of Object.entries(ingredient.stdDev)) {
      const scaled = convertNutrientValue(
        sigma,
        ingredient.basis,
        targetBasis,
        ingredient.dryMatter,
      );
      if (scaled !== null) {
        normalizedStdDev[nutrientId] = scaled;
      }
    }
  }

  const normalizedPhytateP =
    ingredient.phytateP !== undefined
      ? (convertNutrientValue(
          ingredient.phytateP,
          ingredient.basis,
          targetBasis,
          ingredient.dryMatter,
        ) ?? undefined)
      : undefined;

  return {
    ...ingredient,
    basis: targetBasis,
    nutrients: normalizedNutrients,
    ...(normalizedStdDev !== undefined ? { stdDev: normalizedStdDev } : {}),
    ...(normalizedPhytateP !== undefined ? { phytateP: normalizedPhytateP } : {}),
  };
}

/**
 * Mengonversi fraksi solusi LP menjadi fraksi berat segar aktual (As-Fed) untuk penimbangan.
 * Ketika `modelBasis === "dry_matter"`, diterapkan: x_i^AF = (x_i / BK_i) / Σ_j (x_j / BK_j).
 */
export function computeAsFedFractions(
  items: readonly { readonly ingredient: Ingredient; readonly fraction: number }[],
  modelBasis: Basis,
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  if (modelBasis === "as_fed") {
    for (const item of items) {
      result.set(item.ingredient.id, item.fraction);
    }
    return result;
  }

  let denom = 0;
  const rawTerms: Array<{ readonly id: string; readonly rawAf: number }> = [];
  for (const item of items) {
    const dm = assertValidDryMatter(item.ingredient.dryMatter, item.ingredient.name);
    const rawAf = item.fraction / (dm / 100);
    denom += rawAf;
    rawTerms.push({ id: item.ingredient.id, rawAf });
  }

  for (const term of rawTerms) {
    result.set(term.id, denom > 0 ? term.rawAf / denom : 0);
  }
  return result;
}
