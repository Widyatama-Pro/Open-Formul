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
import type { LpSolveOutput } from "./highsTypes";
import {
  BASIC_NUTRIENT_IDS,
  DIGESTIBLE_NUTRIENT_IDS,
  resolveActiveConstraints,
  resolveEffectiveInclusion,
  resolveEffectivePricePerKg,
} from "./modelHelpers";
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
  const seen = new Set<string>([...BASIC_NUTRIENT_IDS]);
  for (const c of requirement.constraints) {
    const isBasic = BASIC_NUTRIENT_IDS.has(c.nutrientId);
    if (!isBasic && !config.enableAdvanceNutrients) continue;
    if (DIGESTIBLE_NUTRIENT_IDS.has(c.nutrientId) && !config.enableDigestibleBasis) continue;
    seen.add(c.nutrientId);
  }
  for (const r of requirement.ratios ?? []) {
    seen.add(r.numerator);
    seen.add(r.denominator);
  }
  return Array.from(seen);
}

export function buildInfeasibleResult(
  config: FormulationConfig,
  conflicts: readonly ConflictDiagnostic[],
  messages: readonly string[],
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
  };
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
            "Aktifkan Mode Relaksasi Elastik atau longgarkan target nutrien / batas maksimal bahan yang terlalu ketat.",
        },
      ],
      [msg],
    );
  }

  const rawByVar = new Map<string, number>();
  const ingVars = model.variables.filter((v) => v.role === "ingredient");
  let rawSum = 0;

  for (const v of ingVars) {
    const primal = solution.Columns[v.varName]?.Primal ?? 0;
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

  // Ekstrak shadow price nutrien dari baris LP yang binding (hanya bermakna sebagai Rp saat costObjFactor > 0)
  const nutrientDualMap = new Map<string, number>();
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
    if (solvedRow.Status === "BS") return;
    if (model.costObjFactor <= 0) return;

    const rawDual = solvedRow.Dual;
    if (!Number.isFinite(rawDual) || Math.abs(rawDual) <= DUAL_ZERO_EPS) return;
    const priceDual = rawDual / model.costObjFactor;
    const prev = nutrientDualMap.get(row.meta.nutrientId) ?? 0;
    nutrientDualMap.set(row.meta.nutrientId, prev + priceDual);
  });

  // Hitung ulang seluruh nutrien dari proporsi mentah x_i lalu verifikasi batas 1e-6
  const nutrientIds = collectDisplayNutrientIds(requirement, config);
  const nutrientValues = new Map<string, number>();
  let anyConstraintViolated = false;
  const violatedDetails: ConflictDiagnostic[] = [];

  for (const nutId of nutrientIds) {
    let val = 0;
    for (const ing of activeNormalized) {
      const varName = model.ingredientVarMap.get(ing.id);
      const frac = varName ? (rawByVar.get(varName) ?? 0) : 0;
      val += frac * (ing.nutrients[nutId] ?? 0);
    }
    nutrientValues.set(nutId, val);
  }

  const nutrientResults: NutrientResult[] = nutrientIds.map((nutId) => {
    const val = nutrientValues.get(nutId) ?? 0;
    const constraint = constraintMap.get(nutId);
    const min = constraint?.min;
    const max = constraint?.max;

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
    return {
      nutrientId: nutId,
      value: val,
      status,
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(deviation !== undefined ? { deviation } : {}),
      ...(shadowPrice !== undefined ? { shadowPrice } : {}),
    };
  });

  // Verifikasi rasio Ca:P dkk dalam toleransi 1e-6
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

  // Konversi fraksi model -> fraksi penimbangan As-Fed
  const cleanFractions = activeNormalized.map((ing) => {
    const varName = model.ingredientVarMap.get(ing.id);
    const raw = varName ? (rawByVar.get(varName) ?? 0) : 0;
    return { ingredient: ing, fraction: Math.abs(raw) < PRIMAL_ZERO_EPS ? 0 : raw };
  });
  const asFedMap = computeAsFedFractions(cleanFractions, model.basis);

  // Biaya riil Σ x_j c_j murni TANPA penalti elastik maupun bobot goal programming!
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

    // Price sensitivity ranging (bermakna bila biaya masuk objective, costObjFactor > 0)
    let priceRange: PriceRange | undefined;
    if (ranging && colIndex !== undefined && model.costObjFactor > 0) {
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

    // Pisahkan dual kolom: Opportunity Cost (bahan 0% non-basis) vs Bound Dual (batas inklusi mengikat)
    if (col && "Status" in col && "Dual" in col) {
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

  const messages: string[] = isNearFeasible
    ? [
        `Mode Relaksasi Elastik aktif: solusi kompromi ditemukan dengan penyesuaian ${rowViolations.length} kendala.`,
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
    messages,
    solvedAt: new Date().toISOString(),
  };
}
