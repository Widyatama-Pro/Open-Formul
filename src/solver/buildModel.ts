import type { FormulationConfig, Ingredient, IngredientCategory, Requirement } from "../types";
import {
  computeScaleFactor,
  getModeWeights,
  normalizeActiveIngredients,
  resolveActiveConstraints,
  resolveEffectiveInclusion,
  resolveNutrientGoalTarget,
} from "./modelHelpers";
import type { BuildModelOptions, LpModel, LpRow, LpTerm, LpVariable } from "./types";

const EPS = 1e-9;

function filterNonZeroTerms(terms: readonly LpTerm[]): readonly LpTerm[] {
  return terms.filter((t) => Number.isFinite(t.coeff) && Math.abs(t.coeff) > EPS);
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
  const useGoals = wDev > 0 && goalTargets.length > 0;

  // Mode 1: koefisien objective murni harga IDR/kg (dual dari HiGHS langsung bernilai IDR/kg).
  // Mode 2-4: normalisasi harga & deviasi terukur agar skala energi (~3000) dan mineral (~1) seimbang.
  // Mode 5: wCost = 0 -> fokus penuh meminimalkan deviasi terhadap titik tengah target.
  const costObjFactor = wCost === 0 ? 0 : useGoals ? wCost / costScale : 1;

  const variables: LpVariable[] = [];
  const ingredientVarMap = new Map<string, string>();
  const ingVarNames: string[] = [];

  normalized.forEach((ing, idx) => {
    const varName = `x${idx}`;
    const bounds = resolveEffectiveInclusion(ing, config);
    const modelPricePerKg = modelPrices.get(ing.id) ?? 0;
    ingredientVarMap.set(ing.id, varName);
    ingVarNames.push(varName);

    variables.push({
      varName,
      role: "ingredient",
      ingredientId: ing.id,
      effectiveLowerPct: bounds.minPct,
      effectiveUpperPct: bounds.maxPct,
      modelPricePerKg,
      objectiveCoeff: modelPricePerKg * costObjFactor,
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
  ) => {
    const cleaned = [...filterNonZeroTerms(baseTerms)];
    if (!elasticMode || meta.kind === "sum_to_one") {
      rows.push({
        name: nextRowName(prefix),
        terms: cleaned,
        sense,
        rhs,
        meta,
      });
      return;
    }

    const penalty = elasticPenaltyM / computeScaleFactor(scaleForElastic);
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
  );

  // 2. Kendala batas nutrien (Min / Max / Eq)
  for (const c of activeConstraints) {
    const terms: LpTerm[] = normalized.map((ing, idx) => ({
      varName: ingVarNames[idx]!,
      coeff: ing.nutrients[c.nutrientId] ?? 0,
    }));

    if (c.min !== undefined && c.max !== undefined && Math.abs(c.min - c.max) <= EPS) {
      pushConstraintRow(
        "nut",
        terms,
        "=",
        c.min,
        { kind: "nutrient_eq", nutrientId: c.nutrientId, boundValue: c.min },
        c.min,
      );
      continue;
    }

    if (c.min !== undefined) {
      pushConstraintRow(
        "nut_min",
        terms,
        ">=",
        c.min,
        { kind: "nutrient_min", nutrientId: c.nutrientId, boundValue: c.min },
        c.min,
      );
    }

    if (c.max !== undefined) {
      pushConstraintRow(
        "nut_max",
        terms,
        "<=",
        c.max,
        { kind: "nutrient_max", nutrientId: c.nutrientId, boundValue: c.max },
        c.max,
      );
    }
  }

  // 3. Linearisasi rasio nutrien (Ca:P -> Σ (a_num - R * a_den) x_j >=|<= 0)
  for (const ratio of requirement.ratios ?? []) {
    if (ratio.min !== undefined) {
      const minRatio = ratio.min;
      const terms: LpTerm[] = normalized.map((ing, idx) => {
        const numVal = ing.nutrients[ratio.numerator] ?? 0;
        const denVal = ing.nutrients[ratio.denominator] ?? 0;
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
        minRatio,
      );
    }

    if (ratio.max !== undefined) {
      const maxRatio = ratio.max;
      const terms: LpTerm[] = normalized.map((ing, idx) => {
        const numVal = ing.nutrients[ratio.numerator] ?? 0;
        const denVal = ing.nutrients[ratio.denominator] ?? 0;
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
        maxRatio,
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
        { kind: "group_min", category: normalized[0]?.category ?? "energy", boundPct: grp.min },
        1,
      );
    }
    if (grp.max !== undefined) {
      pushConstraintRow(
        "grp_max",
        memberVars,
        "<=",
        grp.max / 100,
        { kind: "group_max", category: normalized[0]?.category ?? "energy", boundPct: grp.max },
        1,
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
        { kind: "group_min", category, boundPct: grp.minPct },
        1,
      );
    }
    if (grp.maxPct !== undefined) {
      pushConstraintRow(
        "grp_max",
        memberVars,
        "<=",
        grp.maxPct / 100,
        { kind: "group_max", category, boundPct: grp.maxPct },
        1,
      );
    }
  }

  // 5. Goal programming (Mode 2-5): Σ a_kj x_j - dp_k + dn_k = target_k
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
          coeff: ing.nutrients[constraint.nutrientId] ?? 0,
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

  return {
    basis: config.activeBasis,
    elasticMode,
    elasticPenaltyM,
    optimizationMode: config.optimizationMode,
    costObjFactor,
    normalizedIngredients: normalized,
    ingredientVarMap,
    variables,
    rows,
  };
}
