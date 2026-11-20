import type {
  BoundDualItem,
  CompositionItem,
  ConflictDiagnostic,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  NutrientResult,
  NutrientStatus,
  OpportunityCostItem,
  PriceRange,
  Requirement,
} from "../types";
import { computeAsFedFractions } from "../utils/basis";
import { isDerivedNutrient, resolveNutrientValue } from "../utils/equations";
import type { LpSolveOutput } from "./highsTypes";
import {
  BASIC_NUTRIENT_IDS,
  BETN_NUTRIENT_IDS,
  DIGESTIBLE_NUTRIENT_IDS,
  NDF_NUTRIENT_IDS,
  resolveActiveConstraints,
  resolveEffectiveConstraintBounds,
  resolveEffectiveInclusion,
  resolveEffectivePricePerKg,
  resolveIngredientStdDev,
  resolveRequirementVariance,
} from "./modelHelpers";
import { computeIngredientEnzymeUplift } from "./enzymes";
import { evaluateRumenBiology } from "./rumenEvaluator";
import { computeKappa } from "./stochastic";
import type { LpModel } from "./types";

const VERIFY_TOL = 1e-6;
const PRIMAL_ZERO_EPS = 1e-7;
const DUAL_ZERO_EPS = 1e-6;

function modelDeltaToAsFedPrice(
  valueModelObj: number,
  dryMatterPct: number,
  model: LpModel,
): number | null {
  if (!Number.isFinite(valueModelObj) || model.costObjFactor <= 0) {
    return null;
  }
  const modelBasisPrice = valueModelObj / model.costObjFactor;
  const afPrice =
    model.basis === "dry_matter" ? modelBasisPrice * (dryMatterPct / 100) : modelBasisPrice;
  if (!Number.isFinite(afPrice)) return null;
  return Math.max(0, afPrice);
}

function collectDisplayNutrientIds(
  requirement: Requirement,
  config: FormulationConfig,
): readonly string[] {
  const customIds = new Set((config.customNutrients ?? []).map((n) => n.id));
  const seen = new Set<string>([
    ...BASIC_NUTRIENT_IDS,
    ...customIds,
    ...(config.showNdf === true ? NDF_NUTRIENT_IDS : []),
    ...(config.showBetn === true ? BETN_NUTRIENT_IDS : []),
  ]);
  const addIfVisible = (nutId: string) => {
    const isBasic = BASIC_NUTRIENT_IDS.has(nutId);
    const isDerived = isDerivedNutrient(nutId);
    const isExplicitCustom = customIds.has(nutId);
    const isOptionalVisible =
      (config.showNdf === true && NDF_NUTRIENT_IDS.has(nutId)) ||
      (config.showBetn === true && BETN_NUTRIENT_IDS.has(nutId));
    if (DIGESTIBLE_NUTRIENT_IDS.has(nutId) && !config.enableDigestibleBasis) return;
    if (isBasic || isDerived || isExplicitCustom || isOptionalVisible) {
      seen.add(nutId);
      return;
    }
    if (config.enableAdvanceNutrients) {
      seen.add(nutId);
    }
  };
  for (const c of requirement.constraints) {
    addIfVisible(c.nutrientId);
  }
  if (config.fractionalObjective) {
    addIfVisible(config.fractionalObjective.nutrientId);
  }
  for (const r of requirement.ratios ?? []) {
    addIfVisible(r.numerator);
    addIfVisible(r.denominator);
  }
  return Array.from(seen);
}

export function buildInfeasibleResult(
  config: FormulationConfig,
  conflicts: readonly ConflictDiagnostic[],
  messages: readonly string[],
  extras: Pick<FormulationResult, "iis"> = {},
): FormulationResult {
  return {
    status: "infeasible",
    basis: config.activeBasis,
    costPerKg: null,
    batchTotalCost: null,
    batchSizeKg: config.batchSizeKg,
    composition: [],
    nutrients: [],
    opportunityCosts: [],
    boundDuals: [],
    conflicts,
    messages,
    solvedAt: new Date().toISOString(),
    ...extras,
  };
}

function computeRelaxationPenalty(model: LpModel, output: LpSolveOutput): number {
  let total = 0;
  for (const v of model.variables) {
    if (v.role !== "elastic_pos" && v.role !== "elastic_neg") continue;
    const col = output.solution.Columns[v.varName];
    const primal = col && "Primal" in col ? col.Primal : 0;
    if (!Number.isFinite(primal) || primal <= 0) continue;
    total += v.objectiveCoeff * primal;
  }
  return total;
}

export function parseHighsResult(
  model: LpModel,
  output: LpSolveOutput,
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  precheckWarnings: readonly ConflictDiagnostic[],
): FormulationResult {
  const { solution, ranging } = output;

  if (solution.Status !== "Optimal") {
    const msg = `HiGHS mengembalikan status "${solution.Status}". Formulasi tidak dapat dipenuhi dengan batas saat ini.`;
    return buildInfeasibleResult(
      config,
      [
        ...precheckWarnings,
        {
          code: "SOLVER_INFEASIBLE",
          severity: "error",
          message: msg,
          suggestion:
            "Aktifkan Mode Toleransi Target atau longgarkan target nutrien / batas maksimal bahan yang terlalu ketat.",
        },
      ],
      [msg],
    );
  }

  const rawByVar = new Map<string, number>();
  const ingVars = model.variables.filter((v) => v.role === "ingredient");
  let rawSum = 0;

  for (const v of ingVars) {
    const col = solution.Columns[v.varName];
    const primal = col && "Primal" in col ? col.Primal : 0;
    if (
      !Number.isFinite(primal) ||
      primal < v.lower - VERIFY_TOL ||
      (v.upper !== null && primal > v.upper + VERIFY_TOL)
    ) {
      const msg = `Verifikasi pasca-solve gagal: proporsi variabel ${v.varName} (${primal}) berada di luar batas [${v.lower}, ${v.upper ?? "∞"}].`;
      return buildInfeasibleResult(
        config,
        [...precheckWarnings, { code: "SOLVER_INFEASIBLE", severity: "error", message: msg }],
        [msg],
      );
    }
    rawByVar.set(v.varName, primal);
    rawSum += primal;
  }

  if (Math.abs(rawSum - 1) > VERIFY_TOL) {
    const msg = `Verifikasi kesetimbangan massa gagal: Σx = ${rawSum.toFixed(6)} (harus 1 ± 1e-6).`;
    return buildInfeasibleResult(
      config,
      [...precheckWarnings, { code: "SOLVER_INFEASIBLE", severity: "error", message: msg }],
      [msg],
    );
  }

  const rawIngredientMap = new Map(ingredients.map((i) => [i.id, i]));
  const activeNormalized = model.normalizedIngredients;
  const activeConstraints = resolveActiveConstraints(requirement, config);
  const constraintMap = new Map(activeConstraints.map((c) => [c.nutrientId, c]));

  const nutrientDualMap = new Map<string, number>();
  const nutrientRhsRangeMap = new Map<string, { min: number | null; max: number | null }>();
  const nutrientDegenerateMap = new Map<string, boolean>();
  const rowViolations: string[] = [];

  model.rows.forEach((row, rIdx) => {
    if (
      row.meta.kind !== "nutrient_min" &&
      row.meta.kind !== "nutrient_max" &&
      row.meta.kind !== "nutrient_eq"
    ) {
      return;
    }
    const solvedRow = solution.Rows[rIdx];
    if (!solvedRow || !("Status" in solvedRow) || !("Dual" in solvedRow)) return;

    const rowPrimal =
      "Primal" in solvedRow && typeof solvedRow.Primal === "number" ? solvedRow.Primal : null;
    const atBound = rowPrimal !== null && Math.abs(rowPrimal - row.meta.boundValue) <= 1e-6;
    const isActiveOrAtBound = solvedRow.Status !== "BS" || atBound;

    // PR-02/PR-03: rentang RHS & dual — berlaku pada baris mengikat atau baris yang tepat menyentuh batas (degenerasi primal).
    let zeroMarginDegenerate = false;
    if (!model.fractionalActive && ranging && isActiveOrAtBound) {
      const bDown = ranging.rowBoundDown[rIdx];
      const bUp = ranging.rowBoundUp[rIdx];
      const prev = nutrientRhsRangeMap.get(row.meta.nutrientId);
      const down = typeof bDown === "number" && Number.isFinite(bDown) ? bDown : null;
      const up = typeof bUp === "number" && Number.isFinite(bUp) ? bUp : null;
      if (
        (down !== null && Math.abs(down - row.meta.boundValue) <= 1e-6) ||
        (up !== null && Math.abs(up - row.meta.boundValue) <= 1e-6)
      ) {
        zeroMarginDegenerate = true;
      }
      const next = {
        min:
          prev?.min !== null && prev?.min !== undefined && down !== null
            ? Math.max(prev.min, down)
            : (down ?? prev?.min ?? null),
        max:
          prev?.max !== null && prev?.max !== undefined && up !== null
            ? Math.min(prev.max, up)
            : (up ?? prev?.max ?? null),
      };
      nutrientRhsRangeMap.set(row.meta.nutrientId, next);
    }

    if (solvedRow.Status === "BS") {
      // Degenerasi primal: baris tepat di batas (slack basic = 0) dan dual dilaporkan 0.
      if (atBound && !nutrientDegenerateMap.has(row.meta.nutrientId)) {
        nutrientDegenerateMap.set(row.meta.nutrientId, true);
      }
      return;
    }
    if (model.costObjFactor <= 0 || model.fractionalActive) return;

    const rawDual = solvedRow.Dual;
    if (!Number.isFinite(rawDual)) return;

    const priceDual = rawDual / model.costObjFactor;

    // PR-02: baris mengikat tapi dual ~0 ATAU rentang RHS satu sisi nol => sinyal degenerasi.
    if (Math.abs(priceDual) <= DUAL_ZERO_EPS || zeroMarginDegenerate) {
      if (!nutrientDegenerateMap.has(row.meta.nutrientId) || zeroMarginDegenerate) {
        nutrientDegenerateMap.set(row.meta.nutrientId, true);
      }
      if (Math.abs(priceDual) > DUAL_ZERO_EPS) {
        const prev = nutrientDualMap.get(row.meta.nutrientId) ?? 0;
        nutrientDualMap.set(row.meta.nutrientId, prev + priceDual);
      }
    } else {
      nutrientDegenerateMap.set(row.meta.nutrientId, false);
      const prev = nutrientDualMap.get(row.meta.nutrientId) ?? 0;
      nutrientDualMap.set(row.meta.nutrientId, prev + priceDual);
    }
  });

  const nutrientIds = collectDisplayNutrientIds(requirement, config);
  const nutrientValues = new Map<string, number>();
  let anyConstraintViolated = false;
  const violatedDetails: ConflictDiagnostic[] = [];

  for (const nutId of nutrientIds) {
    let val = 0;
    for (const ing of activeNormalized) {
      const varName = model.ingredientVarMap.get(ing.id);
      const frac = varName ? (rawByVar.get(varName) ?? 0) : 0;
      const uplift = computeIngredientEnzymeUplift(
        ing,
        nutId,
        config.enzymes,
        config.enzymeSubAdditiveCap,
      );
      val += frac * ((resolveNutrientValue(ing, nutId) ?? 0) + uplift);
    }
    nutrientValues.set(nutId, val);
  }

  const singleTargetMode = config.targetInputMode === "single";
  const nutrientResults: NutrientResult[] = nutrientIds.map((nutId) => {
    const val = nutrientValues.get(nutId) ?? 0;
    const constraint = constraintMap.get(nutId);
    const effBounds = constraint
      ? resolveEffectiveConstraintBounds(constraint, singleTargetMode)
      : undefined;
    const min = effBounds?.min;
    const max = effBounds?.max;
    const rhsRange = nutrientRhsRangeMap.get(nutId);

    let status: NutrientStatus = "unconstrained";
    let deviation: number | undefined;

    if (constraint) {
      if (min !== undefined && val < min - VERIFY_TOL) {
        status = "below_min";
        deviation = val - min;
        anyConstraintViolated = true;
        rowViolations.push(`${nutId} kurang (${val.toFixed(2)} < ${min})`);
        violatedDetails.push({
          code: "NUTRIENT_UNREACHABLE",
          severity: "warning",
          targetId: nutId,
          message: `Nutrien "${nutId}" berada di bawah target minimum (${val.toFixed(2)} vs min ${min}).`,
        });
      } else if (max !== undefined && val > max + VERIFY_TOL) {
        status = "above_max";
        deviation = val - max;
        anyConstraintViolated = true;
        rowViolations.push(`${nutId} berlebih (${val.toFixed(2)} > ${max})`);
        violatedDetails.push({
          code: "NUTRIENT_UNREACHABLE",
          severity: "warning",
          targetId: nutId,
          message: `Nutrien "${nutId}" melampaui batas maksimum (${val.toFixed(2)} vs max ${max}).`,
        });
      } else {
        status = "met";
      }
    }

    const shadowPrice = nutrientDualMap.get(nutId);
    const isDegenerate = nutrientDegenerateMap.get(nutId);

    // PR-04: margin stokastik κ·sqrt(V(x)) yang diterapkan kendala peluang ini.
    let stochasticMargin: number | undefined;
    if (
      config.enableStochasticSlp === true &&
      constraint &&
      (min !== undefined || max !== undefined)
    ) {
      const xVec = activeNormalized.map((ing) => {
        const varName = model.ingredientVarMap.get(ing.id);
        return varName ? (rawByVar.get(varName) ?? 0) : 0;
      });
      const sigmas = activeNormalized.map((ing) => resolveIngredientStdDev(ing, nutId));
      const reqVar = resolveRequirementVariance(constraint.requirementStdDev);
      if (reqVar > 0 || sigmas.some((s) => s > 0)) {
        const kappa = computeKappa(constraint.targetProbability, constraint.useCantelli);
        // s dihitung di titik solusi akhir (margin eksak, bukan aproksimasi linear).
        let variance = reqVar + 1e-12;
        for (let j = 0; j < sigmas.length; j++) {
          variance += (sigmas[j] ?? 0) ** 2 * (xVec[j] ?? 0) ** 2;
        }
        stochasticMargin = kappa * Math.sqrt(variance);
      }
    }

    return {
      nutrientId: nutId,
      value: val,
      status,
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(deviation !== undefined ? { deviation } : {}),
      ...(shadowPrice !== undefined ? { shadowPrice } : {}),
      ...(isDegenerate !== undefined ? { isDegenerate } : {}),
      ...(rhsRange ? { rhsRange } : {}),
      ...(stochasticMargin !== undefined ? { stochasticMargin } : {}),
    };
  });

  for (const ratio of requirement.ratios ?? []) {
    const numVal = nutrientValues.get(ratio.numerator) ?? 0;
    const denVal = nutrientValues.get(ratio.denominator) ?? 0;
    if (ratio.min !== undefined && numVal < ratio.min * denVal - VERIFY_TOL) {
      anyConstraintViolated = true;
      rowViolations.push(`Rasio ${ratio.numerator}:${ratio.denominator} di bawah ${ratio.min}`);
    }
    if (ratio.max !== undefined && numVal > ratio.max * denVal + VERIFY_TOL) {
      anyConstraintViolated = true;
      rowViolations.push(`Rasio ${ratio.numerator}:${ratio.denominator} melampaui ${ratio.max}`);
    }
  }

  if (anyConstraintViolated && !model.elasticMode) {
    const msg = `Verifikasi toleransi 1e-6 mendeteksi pelanggaran kendala: ${rowViolations.join("; ")}.`;
    return buildInfeasibleResult(
      config,
      [...precheckWarnings, { code: "SOLVER_INFEASIBLE", severity: "error", message: msg }],
      [msg],
    );
  }

  const cleanFractions = activeNormalized.map((ing) => {
    const varName = model.ingredientVarMap.get(ing.id);
    const raw = varName ? (rawByVar.get(varName) ?? 0) : 0;
    return { ingredient: ing, fraction: Math.abs(raw) < PRIMAL_ZERO_EPS ? 0 : raw };
  });
  const asFedMap = computeAsFedFractions(cleanFractions, model.basis);

  let costPerKg = 0;
  const composition: CompositionItem[] = [];
  const opportunityCosts: OpportunityCostItem[] = [];
  const boundDuals: BoundDualItem[] = [];

  for (const v of ingVars) {
    const ingId = v.ingredientId!;
    const normIng = activeNormalized.find((item) => item.id === ingId)!;
    const rawIng = rawIngredientMap.get(ingId) ?? normIng;
    const rawFrac = rawByVar.get(v.varName) ?? 0;
    const frac = Math.abs(rawFrac) < PRIMAL_ZERO_EPS ? 0 : rawFrac;
    const modelPricePerKg = v.modelPricePerKg ?? 0;
    const costContribution = frac * modelPricePerKg;
    costPerKg += costContribution;

    const col = solution.Columns[v.varName];
    const colIndex = col?.Index;
    const effectivePriceAf = resolveEffectivePricePerKg(rawIng);
    const asFedFrac = asFedMap.get(ingId) ?? frac;
    const weightKg = asFedFrac * config.batchSizeKg;

    let priceRange: PriceRange | undefined;
    if (!model.fractionalActive && ranging && colIndex !== undefined && model.costObjFactor > 0) {
      const rawDown = ranging.colCostDown[colIndex];
      const rawUp = ranging.colCostUp[colIndex];
      const minPrice =
        rawDown !== undefined ? modelDeltaToAsFedPrice(rawDown, rawIng.dryMatter, model) : null;
      const maxPrice =
        rawUp !== undefined ? modelDeltaToAsFedPrice(rawUp, rawIng.dryMatter, model) : null;
      if (minPrice !== null || maxPrice !== null) {
        priceRange = { minPrice, maxPrice };
      }
    }

    composition.push({
      ingredientId: ingId,
      fraction: frac,
      asFedFraction: asFedFrac,
      weightKg,
      costContribution,
      ...(priceRange ? { priceRange } : {}),
    });

    if (!model.fractionalActive && col && "Status" in col && "Dual" in col) {
      const colDualRaw = col.Dual;
      const reducedCostModel =
        model.costObjFactor > 0 && Number.isFinite(colDualRaw)
          ? colDualRaw / model.costObjFactor
          : 0;
      const afScale = model.basis === "dry_matter" ? rawIng.dryMatter / 100 : 1;
      const reducedCostAf = reducedCostModel * afScale;
      const effectiveBounds = resolveEffectiveInclusion(rawIng, config);

      if (col.Status === "LB" && frac <= PRIMAL_ZERO_EPS && reducedCostAf > DUAL_ZERO_EPS) {
        opportunityCosts.push({
          ingredientId: ingId,
          currentPrice: effectivePriceAf,
          opportunityPrice: Math.max(0, effectivePriceAf - reducedCostAf),
          reducedCost: reducedCostAf,
        });
      } else if (
        (col.Status === "LB" || col.Status === "UB" || col.Status === "FX") &&
        Math.abs(reducedCostAf) > DUAL_ZERO_EPS &&
        ((v.effectiveLowerPct !== undefined && v.effectiveLowerPct > 0) ||
          col.Status === "UB" ||
          col.Status === "FX" ||
          effectiveBounds.isLocked)
      ) {
        const boundHit: BoundDualItem["boundHit"] =
          col.Status === "UB" || (col.Status === "FX" && reducedCostAf < 0) ? "max" : "min";

        boundDuals.push({
          ingredientId: ingId,
          boundHit,
          dualValue: reducedCostAf / 100,
        });
      }
    }
  }

  composition.sort((a, b) => b.fraction - a.fraction);
  opportunityCosts.sort((a, b) => a.reducedCost - b.reducedCost);

  const isNearFeasible = model.elasticMode && anyConstraintViolated;
  const finalStatus: FormulationResult["status"] = isNearFeasible ? "near_feasible" : "optimal";
  const allConflicts: readonly ConflictDiagnostic[] = isNearFeasible
    ? [...precheckWarnings, ...violatedDetails]
    : precheckWarnings;

  const relaxationPenalty = model.elasticMode ? computeRelaxationPenalty(model, output) : 0;

  let fractionalCost: number | null | undefined;
  if (model.fractionalActive && config.fractionalObjective) {
    const denVal = nutrientValues.get(config.fractionalObjective.nutrientId) ?? 0;
    fractionalCost = denVal > 1e-12 ? costPerKg / denVal : null;
  }

  const fracByIngId = new Map<string, number>();
  for (const item of cleanFractions) {
    fracByIngId.set(item.ingredient.id, item.fraction);
  }
  const rumenEvaluation = evaluateRumenBiology(
    activeNormalized,
    fracByIngId,
    nutrientResults,
    requirement,
  );

  const messages: string[] = isNearFeasible
    ? [
        `Mode Toleransi Target aktif: solusi terdekat ditemukan dengan penyesuaian ${rowViolations.length} kendala.`,
      ]
    : ["Optimasi Linear Programming HiGHS konvergen Optimal (verifikasi toleransi 1e-6 lolos)."];

  return {
    status: finalStatus,
    basis: config.activeBasis,
    costPerKg,
    batchTotalCost: costPerKg * config.batchSizeKg,
    batchSizeKg: config.batchSizeKg,
    composition,
    nutrients: nutrientResults,
    opportunityCosts,
    boundDuals,
    conflicts: allConflicts,
    ...(relaxationPenalty > 0 ? { relaxationPenalty } : {}),
    ...(fractionalCost !== undefined ? { fractionalCost } : {}),
    ...(rumenEvaluation ? { rumenEvaluation } : {}),
    messages,
    solvedAt: new Date().toISOString(),
  };
}
