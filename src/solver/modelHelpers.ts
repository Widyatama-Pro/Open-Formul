import type {
  Basis,
  FormulationConfig,
  Ingredient,
  NutrientConstraint,
  OptimizationMode,
  Requirement,
} from "../types";
import { convertPriceToModelBasis, normalizeIngredientToBasis } from "../utils/basis";

export const BASIC_NUTRIENT_IDS: ReadonlySet<string> = new Set([
  "cp",
  "me_poultry",
  "tdn",
  "ee",
  "cf",
  "ca",
  "p",
]);

export const DIGESTIBLE_NUTRIENT_IDS: ReadonlySet<string> = new Set(["sid_lys", "avp"]);

export interface EffectiveInclusionBounds {
  readonly minPct: number;
  readonly maxPct: number;
  readonly isLocked: boolean;
  readonly antiNolApplied: boolean;
}

export function resolveEffectiveInclusion(
  ingredient: Ingredient,
  config: FormulationConfig,
): EffectiveInclusionBounds {
  const lockedPct = config.manualLocks?.[ingredient.id];
  if (lockedPct !== undefined && Number.isFinite(lockedPct)) {
    return {
      minPct: lockedPct,
      maxPct: lockedPct,
      isLocked: true,
      antiNolApplied: false,
    };
  }

  let minPct = ingredient.inclusion?.min ?? 0;
  const maxPct = ingredient.inclusion?.max ?? 100;
  let antiNolApplied = false;

  const globalRule = config.globalZeroInclusion;
  const localRule = ingredient.zeroInclusionRule;
  const enforceNonZero = localRule?.enforceNonZero ?? globalRule.enforceNonZero;
  const autoMin = localRule?.minIfSelected ?? globalRule.minIfSelected ?? 0;

  if (enforceNonZero && autoMin > 0 && maxPct > 0 && minPct <= maxPct) {
    const clampedAutoMin = Math.min(autoMin, maxPct);
    if (clampedAutoMin > minPct) {
      minPct = clampedAutoMin;
      antiNolApplied = true;
    }
  }

  return {
    minPct,
    maxPct,
    isLocked: false,
    antiNolApplied,
  };
}

export function resolveEffectivePricePerKg(
  ingredient: Ingredient,
  priceOverrides?: Readonly<Record<string, number>>,
): number {
  const paramPrice = priceOverrides?.[ingredient.id];
  if (paramPrice !== undefined && Number.isFinite(paramPrice)) {
    return paramPrice;
  }
  if (ingredient.priceOverride !== undefined && Number.isFinite(ingredient.priceOverride)) {
    return ingredient.priceOverride;
  }
  return ingredient.pricePerKg;
}

export function resolveActiveConstraints(
  requirement: Requirement,
  config: FormulationConfig,
): readonly NutrientConstraint[] {
  return requirement.constraints.filter((c) => {
    const isBasic = BASIC_NUTRIENT_IDS.has(c.nutrientId);
    const isAdvance = !isBasic;
    if (isAdvance && !config.enableAdvanceNutrients) {
      return false;
    }
    if (DIGESTIBLE_NUTRIENT_IDS.has(c.nutrientId) && !config.enableDigestibleBasis) {
      return false;
    }
    const enabled = c.enabled ?? isBasic;
    if (!enabled) {
      return false;
    }
    return c.min !== undefined || c.max !== undefined;
  });
}

export function normalizeActiveIngredients(
  ingredients: readonly Ingredient[],
  activeBasis: Basis,
  priceOverrides?: Readonly<Record<string, number>>,
): {
  readonly normalized: readonly Ingredient[];
  readonly modelPrices: ReadonlyMap<string, number>;
} {
  const active = ingredients.filter((i) => i.isActive !== false);
  const normalized: Ingredient[] = [];
  const modelPrices = new Map<string, number>();

  for (const ing of active) {
    const effectivePriceAf = resolveEffectivePricePerKg(ing, priceOverrides);
    const dmPct = ing.dryMatter;
    const norm = normalizeIngredientToBasis(ing, activeBasis);
    normalized.push(norm);
    modelPrices.set(ing.id, convertPriceToModelBasis(effectivePriceAf, activeBasis, dmPct));
  }

  return { normalized, modelPrices };
}

export function getModeWeights(mode: OptimizationMode): {
  readonly wCost: number;
  readonly wDev: number;
} {
  switch (mode) {
    case 1:
      return { wCost: 1, wDev: 0 };
    case 2:
      return { wCost: 0.7, wDev: 0.3 };
    case 3:
      return { wCost: 0.5, wDev: 0.5 };
    case 4:
      return { wCost: 0.2, wDev: 0.8 };
    case 5:
      return { wCost: 0, wDev: 1 };
  }
}

export function resolveNutrientGoalTarget(constraint: NutrientConstraint): number | null {
  if (constraint.idealTarget !== undefined && Number.isFinite(constraint.idealTarget)) {
    let clamped = constraint.idealTarget;
    if (constraint.min !== undefined) clamped = Math.max(clamped, constraint.min);
    if (constraint.max !== undefined) clamped = Math.min(clamped, constraint.max);
    return clamped;
  }
  if (constraint.min !== undefined && constraint.max !== undefined) {
    return (constraint.min + constraint.max) / 2;
  }
  if (constraint.min !== undefined) {
    return constraint.min;
  }
  return null;
}

export function computeScaleFactor(referenceValue: number): number {
  return Math.max(Math.abs(referenceValue), 1e-3);
}
