import type {
  ConstraintTier,
  FormulationConfig,
  Ingredient,
  IngredientCategory,
  Requirement,
} from "../types";
import { resolveNutrientValue } from "../utils/equations";
import { computeIngredientEnzymeUplift } from "./enzymes";
import {
  computeScaleFactor,
  getModeWeights,
  normalizeActiveIngredients,
  resolveActiveConstraints,
  resolveEffectiveInclusion,
  resolveIngredientStdDev,
  resolveNutrientGoalTarget,
  resolveRequirementVariance,
} from "./modelHelpers";
import { computeKappa, linearizeChanceConstraint } from "./stochastic";
import type { BuildModelOptions, LpModel, LpRow, LpTerm, LpVariable } from "./types";

const EPS = 1e-9;
/** Lantai penyebut Charnes–Cooper (F-09+): Σ e_j x_j >= ε agar 0/0 tertutup. */
const DENOMINATOR_FLOOR = 1e-4;

/** Nilai nutrien bahan (0 bila N/A), termasuk turunan dEB/DCAD dari Na/K/Cl/S. */
function ingValue(ing: Ingredient, nutrientId: string): number {
  return resolveNutrientValue(ing, nutrientId) ?? 0;
}

function filterNonZeroTerms(terms: readonly LpTerm[]): readonly LpTerm[] {
  return terms.filter((t) => Number.isFinite(t.coeff) && Math.abs(t.coeff) > EPS);
}

function tierPenalty(tier: ConstraintTier | undefined, baseM: number): number {
  switch (tier) {
    case "tier1":
      return Math.max(1e8, baseM);
    case "tier2":
      return Math.max(1e6, baseM);
    case "tier3":
      return Math.max(1e4, baseM / 10);
    case "tier0":
      return baseM; // unused (not relaxable)
    default:
      return Math.max(1e6, baseM);
  }
}

export function buildLpModel(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  options: BuildModelOptions = {},
): LpModel {
  const elasticMode = options.elastic === true;
  const { normalized, modelPrices } = normalizeActiveIngredients(
    ingredients,
    config.activeBasis,
    options.priceOverrides,
  );

  const maxPrice = normalized.reduce((acc, ing) => {
    const p = modelPrices.get(ing.id) ?? 0;
    return Math.max(acc, p);
  }, 0);
  const elasticPenaltyM = options.elasticPenaltyM ?? Math.max(1e6, maxPrice * 1000);

  const avgPrice =
    normalized.length > 0
      ? normalized.reduce((sum, ing) => sum + (modelPrices.get(ing.id) ?? 0), 0) / normalized.length
      : 1;
  const costScale = Math.max(avgPrice, 1);

  // PR-05: uplift enzim (sub-aditif + retensi termal + batas substrat bahan) per (bahan, nutrien).
  const enzymes = config.enzymes ?? [];
  const enzymeCap = config.enzymeSubAdditiveCap;
  const enzymeUpliftCache = new Map<string, number>();
  const getUplift = (ing: Ingredient, nutrientId: string): number => {
    if (enzymes.length === 0) return 0;
    const key = `${ing.id}\0${nutrientId}`;
    const cached = enzymeUpliftCache.get(key);
    if (cached !== undefined) return cached;
    const val = computeIngredientEnzymeUplift(ing, nutrientId, enzymes, enzymeCap);
    enzymeUpliftCache.set(key, val);
    return val;
  };
  const nutValue = (ing: Ingredient, nutrientId: string): number =>
    ingValue(ing, nutrientId) + getUplift(ing, nutrientId);

  const activeConstraints = resolveActiveConstraints(requirement, config);
  const goalTargets = activeConstraints
    .map((c) => ({ constraint: c, target: resolveNutrientGoalTarget(c) }))
    .filter(
      (
        entry,
      ): entry is {
        readonly constraint: (typeof activeConstraints)[number];
        readonly target: number;
      } => entry.target !== null,
    );

  const { wCost, wDev } = getModeWeights(config.optimizationMode);
  const fractional = config.fractionalObjective;
  const fractionalLambda = options.fractionalLambda ?? 0;
  const useChebyshev = !fractional && config.optimizationMode === 5 && goalTargets.length > 0;
  const useGoals = !fractional && !useChebyshev && wDev > 0 && goalTargets.length > 0;

  // Mode 1: koefisien objective murni harga IDR/kg.
  // Mode 2-4: normalisasi harga & deviasi terukur.
  // Mode 5 (Chebyshev + epsilon-lexicographic): min D + 1e-5 * sum c_j x_j (ternormalisasi).
  const costObjFactor = fractional
    ? 1
    : useChebyshev
      ? 1e-5 / costScale
      : wCost === 0
        ? 0
        : useGoals
          ? wCost / costScale
          : 1;

  const variables: LpVariable[] = [];
  const ingredientVarMap = new Map<string, string>();
  const ingVarNames: string[] = [];

  normalized.forEach((ing, idx) => {
    const varName = `x${idx}`;
    const bounds = resolveEffectiveInclusion(ing, config);
    const modelPricePerKg = modelPrices.get(ing.id) ?? 0;
    ingredientVarMap.set(ing.id, varName);
    ingVarNames.push(varName);

    // PR-03 Dinkelbach: koefisien objektif = harga_j − λ·e_j (min λ ⇒ max (c·x)/(e·x)).
    const objCoeff = fractional
      ? (modelPricePerKg - fractionalLambda * nutValue(ing, fractional.nutrientId)) * costObjFactor
      : modelPricePerKg * costObjFactor;

    variables.push({
      varName,
      role: "ingredient",
      ingredientId: ing.id,
      effectiveLowerPct: bounds.minPct,
      effectiveUpperPct: bounds.maxPct,
      modelPricePerKg,
      objectiveCoeff: objCoeff,
      lower: bounds.minPct / 100,
      upper: bounds.maxPct / 100,
    });
  });

  const rows: LpRow[] = [];
  let rowIndex = 0;
  let elasticCounter = 0;

  const nextRowName = (prefix: string) => `${prefix}_${rowIndex++}`;

  const pushConstraintRow = (
    prefix: string,
    baseTerms: readonly LpTerm[],
    sense: ">=" | "<=" | "=",
    rhs: number,
    meta: LpRow["meta"],
    scaleForElastic: number,
    tier: ConstraintTier | undefined,
    forceHard = false,
  ) => {
    const cleaned = [...filterNonZeroTerms(baseTerms)];
    const relaxable = elasticMode && !forceHard && tier !== "tier0" && meta.kind !== "sum_to_one";

    if (!relaxable) {
      rows.push({
        name: nextRowName(prefix),
        terms: cleaned,
        sense,
        rhs,
        meta,
      });
      return;
    }

    const penaltyBase = tierPenalty(tier, elasticPenaltyM);
    const penalty = penaltyBase / computeScaleFactor(scaleForElastic);
    let slackNegVar: string | undefined;
    let slackPosVar: string | undefined;

    if (sense === ">=" || sense === "=") {
      slackNegVar = `ev${elasticCounter++}`;
      variables.push({
        varName: slackNegVar,
        role: "elastic_neg",
        objectiveCoeff: penalty,
        lower: 0,
        upper: null,
      });
      cleaned.push({ varName: slackNegVar, coeff: 1 });
    }
    if (sense === "<=" || sense === "=") {
      slackPosVar = `ew${elasticCounter++}`;
      variables.push({
        varName: slackPosVar,
        role: "elastic_pos",
        objectiveCoeff: penalty,
        lower: 0,
        upper: null,
      });
      cleaned.push({ varName: slackPosVar, coeff: -1 });
    }

    rows.push({
      name: nextRowName(prefix),
      terms: cleaned,
      sense,
      rhs,
      meta,
      ...(slackNegVar !== undefined ? { slackNegVar } : {}),
      ...(slackPosVar !== undefined ? { slackPosVar } : {}),
    });
  };

  // 1. Kesetimbangan massa (Σ x_j = 1)
  pushConstraintRow(
    "sum",
    ingVarNames.map((varName) => ({ varName, coeff: 1 })),
    "=",
    1,
    { kind: "sum_to_one" },
    1,
    "tier0",
    true,
  );

  // 2. Kendala batas nutrien (Min / Max / Eq)
  // PR-04: bila titik linearisasi SLP diberikan, terapkan margin peluang Munford.
  const xPrev = options.stochastic?.xPrev;

  for (const c of activeConstraints) {
    const baseTerms: LpTerm[] = normalized.map((ing, idx) => ({
      varName: ingVarNames[idx]!,
      coeff: nutValue(ing, c.nutrientId),
    }));

    const sigmas = xPrev
      ? normalized.map((ing) => resolveIngredientStdDev(ing, c.nutrientId))
      : null;
    const reqVar = resolveRequirementVariance(c.requirementStdDev);
    const hasVariance = sigmas !== null && (reqVar > 0 || sigmas.some((s) => s > 0));

    const shiftTerms = (
      terms: LpTerm[],
      sense: ">=" | "<=",
    ): { terms: LpTerm[]; rhsDelta: number } => {
      if (!hasVariance || !sigmas || !xPrev) return { terms, rhsDelta: 0 };
      const kappa = computeKappa(c.targetProbability, c.useCantelli);
      const xVec = ingVarNames.map((v) => xPrev.get(v) ?? 0);
      const lin = linearizeChanceConstraint(sigmas, xVec, kappa, reqVar, sense);
      const shifted = terms.map((t, idx) => ({
        varName: t.varName,
        coeff: t.coeff + (lin.varianceCoeffs[idx] ?? 0),
      }));
      return { terms: shifted, rhsDelta: lin.rhsShift };
    };

    if (c.min !== undefined && c.max !== undefined && Math.abs(c.min - c.max) <= EPS) {
      pushConstraintRow(
        "nut",
        baseTerms,
        "=",
        c.min,
        { kind: "nutrient_eq", nutrientId: c.nutrientId, boundValue: c.min },
        c.min,
        c.tier,
      );
      continue;
    }

    if (c.min !== undefined) {
      const { terms, rhsDelta } = shiftTerms(baseTerms, ">=");
      pushConstraintRow(
        "nut_min",
        terms,
        ">=",
        c.min + rhsDelta,
        { kind: "nutrient_min", nutrientId: c.nutrientId, boundValue: c.min },
        c.min,
        c.tier,
      );
    }

    if (c.max !== undefined) {
      const { terms, rhsDelta } = shiftTerms(baseTerms, "<=");
      pushConstraintRow(
        "nut_max",
        terms,
        "<=",
        c.max + rhsDelta,
        { kind: "nutrient_max", nutrientId: c.nutrientId, boundValue: c.max },
        c.max,
        c.tier,
      );
    }
  }

  // 3. Linearisasi rasio nutrien (Ca:P -> Σ (a_num - R * a_den) x_j >=|<= 0)
  for (const ratio of requirement.ratios ?? []) {
    if (ratio.min !== undefined) {
      const minRatio = ratio.min;
      const terms: LpTerm[] = normalized.map((ing, idx) => {
        const numVal = nutValue(ing, ratio.numerator);
        const denVal = nutValue(ing, ratio.denominator);
        return {
          varName: ingVarNames[idx]!,
          coeff: numVal - minRatio * denVal,
        };
      });
      pushConstraintRow(
        "ratio_min",
        terms,
        ">=",
        0,
        {
          kind: "ratio_min",
          numeratorId: ratio.numerator,
          denominatorId: ratio.denominator,
          targetRatio: minRatio,
        },
        Math.max(minRatio, 1),
        ratio.tier ?? "tier1",
      );
    }

    if (ratio.max !== undefined) {
      const maxRatio = ratio.max;
      const terms: LpTerm[] = normalized.map((ing, idx) => {
        const numVal = nutValue(ing, ratio.numerator);
        const denVal = nutValue(ing, ratio.denominator);
        return {
          varName: ingVarNames[idx]!,
          coeff: numVal - maxRatio * denVal,
        };
      });
      pushConstraintRow(
        "ratio_max",
        terms,
        "<=",
        0,
        {
          kind: "ratio_max",
          numeratorId: ratio.numerator,
          denominatorId: ratio.denominator,
          targetRatio: maxRatio,
        },
        Math.max(maxRatio, 1),
        ratio.tier ?? "tier1",
      );
    }
  }

  // 4a. Batas grup bahan bawaan Requirement.ingredientGroups
  for (const grp of requirement.ingredientGroups ?? []) {
    const groupIds = new Set(grp.ingredientIds);
    const memberVars: LpTerm[] = [];
    normalized.forEach((ing, idx) => {
      if (groupIds.has(ing.id)) {
        memberVars.push({ varName: ingVarNames[idx]!, coeff: 1 });
      }
    });
    if (memberVars.length === 0) continue;

    if (grp.min !== undefined) {
      pushConstraintRow(
        "grp_min",
        memberVars,
        ">=",
        grp.min / 100,
        {
          kind: "group_min",
          category: normalized[0]?.category ?? "energy",
          boundPct: grp.min,
          groupId: grp.id,
          groupName: grp.name,
        },
        1,
        grp.tier ?? "tier3",
      );
    }
    if (grp.max !== undefined) {
      pushConstraintRow(
        "grp_max",
        memberVars,
        "<=",
        grp.max / 100,
        {
          kind: "group_max",
          category: normalized[0]?.category ?? "energy",
          boundPct: grp.max,
          groupId: grp.id,
          groupName: grp.name,
        },
        1,
        grp.tier ?? "tier3",
      );
    }
  }

  // 4b. Batas grup kategori bahan (opsional via BuildModelOptions)
  for (const grp of options.groupLimits ?? []) {
    const memberVars: LpTerm[] = [];
    normalized.forEach((ing, idx) => {
      if (ing.category === grp.category) {
        memberVars.push({ varName: ingVarNames[idx]!, coeff: 1 });
      }
    });
    if (memberVars.length === 0) continue;

    const category: IngredientCategory = grp.category;
    if (grp.minPct !== undefined) {
      pushConstraintRow(
        "grp_min",
        memberVars,
        ">=",
        grp.minPct / 100,
        { kind: "group_min", category, boundPct: grp.minPct, groupId: `cat:${category}` },
        1,
        "tier3",
      );
    }
    if (grp.maxPct !== undefined) {
      pushConstraintRow(
        "grp_max",
        memberVars,
        "<=",
        grp.maxPct / 100,
        { kind: "group_max", category, boundPct: grp.maxPct, groupId: `cat:${category}` },
        1,
        "tier3",
      );
    }
  }

  // 5a. Goal programming (Mode 2-4): Σ a_kj x_j - dp_k + dn_k = target_k
  if (useGoals) {
    const perGoalWeight = wDev / goalTargets.length;
    goalTargets.forEach(({ constraint, target }, gIdx) => {
      const dpVar = `dp${gIdx}`;
      const dnVar = `dn${gIdx}`;
      const goalScale = computeScaleFactor(target);
      const devCoeff = perGoalWeight / goalScale;

      variables.push(
        {
          varName: dpVar,
          role: "goal_pos",
          objectiveCoeff: devCoeff,
          lower: 0,
          upper: null,
        },
        {
          varName: dnVar,
          role: "goal_neg",
          objectiveCoeff: devCoeff,
          lower: 0,
          upper: null,
        },
      );

      const nutTerms = filterNonZeroTerms(
        normalized.map((ing, idx) => ({
          varName: ingVarNames[idx]!,
          coeff: nutValue(ing, constraint.nutrientId),
        })),
      );

      rows.push({
        name: nextRowName("goal"),
        terms: [...nutTerms, { varName: dpVar, coeff: -1 }, { varName: dnVar, coeff: 1 }],
        sense: "=",
        rhs: target,
        meta: {
          kind: "goal_deviation",
          nutrientId: constraint.nutrientId,
          target,
        },
      });
    });
  }

  // 5b. Mode 5 Chebyshev minimax + ε-lexicographic cost: min D + 1e-5*Σ c_j x_j
  if (useChebyshev) {
    const dVar = "D";
    variables.push({
      varName: dVar,
      role: "chebyshev",
      objectiveCoeff: 1,
      lower: 0,
      upper: null,
    });

    goalTargets.forEach(({ constraint, target }, gIdx) => {
      const dpVar = `dp${gIdx}`;
      const dnVar = `dn${gIdx}`;
      const goalScale = computeScaleFactor(target);

      variables.push(
        { varName: dpVar, role: "goal_pos", objectiveCoeff: 0, lower: 0, upper: null },
        { varName: dnVar, role: "goal_neg", objectiveCoeff: 0, lower: 0, upper: null },
      );

      const nutTerms = filterNonZeroTerms(
        normalized.map((ing, idx) => ({
          varName: ingVarNames[idx]!,
          coeff: nutValue(ing, constraint.nutrientId),
        })),
      );

      rows.push({
        name: nextRowName("goal"),
        terms: [...nutTerms, { varName: dpVar, coeff: -1 }, { varName: dnVar, coeff: 1 }],
        sense: "=",
        rhs: target,
        meta: { kind: "goal_deviation", nutrientId: constraint.nutrientId, target },
      });

      // (dp + dn) / s <= D  =>  dp + dn - s*D <= 0
      rows.push({
        name: nextRowName("cheb"),
        terms: [
          { varName: dpVar, coeff: 1 },
          { varName: dnVar, coeff: 1 },
          { varName: dVar, coeff: -goalScale },
        ],
        sense: "<=",
        rhs: 0,
        meta: { kind: "chebyshev", nutrientId: constraint.nutrientId, scale: goalScale },
      });
    });
  }

  // 6. PR-03: lantai penyebut fraksional Σ e_j x_j >= ε (guard 0/0 Charnes–Cooper).
  if (fractional) {
    const denTerms = filterNonZeroTerms(
      normalized.map((ing, idx) => ({
        varName: ingVarNames[idx]!,
        coeff: nutValue(ing, fractional.nutrientId),
      })),
    );
    rows.push({
      name: nextRowName("den_floor"),
      terms: denTerms,
      sense: ">=",
      rhs: DENOMINATOR_FLOOR,
      meta: {
        kind: "denominator_floor",
        nutrientId: fractional.nutrientId,
        floor: DENOMINATOR_FLOOR,
      },
    });
  }

  return {
    basis: config.activeBasis,
    elasticMode,
    elasticPenaltyM,
    optimizationMode: config.optimizationMode,
    costObjFactor,
    fractionalActive: fractional != null,
    normalizedIngredients: normalized,
    ingredientVarMap,
    variables,
    rows,
  };
}
