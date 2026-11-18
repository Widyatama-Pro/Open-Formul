import type {
  ConflictDiagnostic,
  FormulationConfig,
  FormulationResult,
  IisItem,
  Ingredient,
  Requirement,
} from "../types";
import { resolveNutrientValue } from "../utils/equations";
import { buildLpModel } from "./buildModel";
import type { LpRunner, LpSolveOutput } from "./highsTypes";
import { findMinimalIis } from "./iis";
import { buildInfeasibleResult, parseHighsResult } from "./parseResult";
import { runPrecheck } from "./precheck";
import { toLpString } from "./toLpString";
import type { GroupLimitRule, LpModel } from "./types";

export interface SolveOptions {
  readonly groupLimits?: readonly GroupLimitRule[];
}

const DINKELBACH_MAX_ITER = 20;
const DINKELBACH_TOL = 1e-7;

/**
 * Error struktural (batas mustahil, inklusi >/< 100%) tidak bisa diperbaiki oleh
 * relaksasi elastik. NUTRIENT_UNREACHABLE justru target utama relaksasi bertingkat.
 */
function isStructuralPrecheckError(d: ConflictDiagnostic): boolean {
  return d.severity === "error" && d.code !== "NUTRIENT_UNREACHABLE";
}

/** Bungkus IIS menjadi partial result bila tidak kosong. */
async function withIis(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  groupLimits: readonly GroupLimitRule[],
): Promise<Pick<FormulationResult, "iis">> {
  const iis: readonly IisItem[] = await findMinimalIis(
    ingredients,
    requirement,
    config,
    solveLp,
    groupLimits,
  );
  return iis.length > 0 ? { iis } : {};
}

interface PassResult {
  readonly model: LpModel;
  readonly output: LpSolveOutput;
  readonly parsed: FormulationResult;
}

async function runPass(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  groupLimits: readonly GroupLimitRule[],
  warnings: readonly ConflictDiagnostic[],
  elastic: boolean,
  fractionalLambda?: number,
  stochasticXPrev?: ReadonlyMap<string, number>,
): Promise<PassResult> {
  const model = buildLpModel(ingredients, requirement, config, {
    elastic,
    groupLimits,
    ...(fractionalLambda !== undefined ? { fractionalLambda } : {}),
    ...(stochasticXPrev !== undefined ? { stochastic: { xPrev: stochasticXPrev } } : {}),
  });
  const output = await solveLp(toLpString(model));
  const parsed = parseHighsResult(model, output, ingredients, requirement, config, warnings);
  return { model, output, parsed };
}

/** Fraksi primal tiap variabel bahan dari output HiGHS. */
function extractFractions(model: LpModel, output: LpSolveOutput): ReadonlyMap<string, number> {
  const x = new Map<string, number>();
  for (const ing of model.normalizedIngredients) {
    const varName = model.ingredientVarMap.get(ing.id);
    if (!varName) continue;
    const col = output.solution.Columns[varName];
    const primal = col && "Primal" in col && Number.isFinite(col.Primal) ? col.Primal : 0;
    x.set(varName, primal);
  }
  return x;
}

/** PR-04: ada tidaknya data varians (sigma bahan atau sigma kebutuhan) untuk di-SLP. */
function hasStochasticData(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
): boolean {
  if (config.enableStochasticSlp !== true) return false;
  const anyIngredientSigma = ingredients.some(
    (ing) =>
      ing.stdDev !== undefined &&
      Object.values(ing.stdDev).some((v) => typeof v === "number" && v > 0),
  );
  const anyRequirementSigma = requirement.constraints.some(
    (c) => typeof c.requirementStdDev === "number" && c.requirementStdDev > 0,
  );
  return anyIngredientSigma || anyRequirementSigma;
}

/**
 * PR-04: Successive Linear Programming (Munford, 1996) dengan damped update.
 * Selesaikan LP terlinearisasi di x⁽ᵗ⁾, lalu x⁽ᵗ⁺¹⁾ = (1−α)x⁽ᵗ⁾ + α x̂ sampai ||Δx||∞ < tol.
 */
async function runStochasticSlp(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  groupLimits: readonly GroupLimitRule[],
  warnings: readonly ConflictDiagnostic[],
  elastic: boolean,
): Promise<PassResult & { readonly iterations: number; readonly converged: boolean }> {
  const maxIter = Math.max(1, config.stochasticMaxIter ?? 12);
  const alpha = Math.min(1, Math.max(0, config.stochasticDamping ?? 0.5)) || 0.5;
  const tol = config.stochasticTolerance ?? 1e-5;

  let xPrev: ReadonlyMap<string, number> | undefined;
  let last: PassResult | undefined;
  let converged = false;
  let iterations = 0;

  for (let t = 0; t < maxIter; t++) {
    const pass = await runPass(
      ingredients,
      requirement,
      config,
      solveLp,
      groupLimits,
      warnings,
      elastic,
      undefined,
      xPrev,
    );
    iterations++;
    if (pass.output.solution.Status !== "Optimal") {
      return { ...pass, iterations, converged };
    }

    const xHat = extractFractions(pass.model, pass.output);
    last = pass;

    if (xPrev === undefined) {
      xPrev = xHat;
      continue;
    }

    let maxDelta = 0;
    const next = new Map<string, number>();
    for (const [varName, vHat] of xHat) {
      const vPrev = xPrev.get(varName) ?? 0;
      const v = (1 - alpha) * vPrev + alpha * vHat;
      maxDelta = Math.max(maxDelta, Math.abs(v - vPrev));
      next.set(varName, v);
    }
    xPrev = next;
    if (maxDelta < tol) {
      converged = true;
      break;
    }
  }

  return { ...last!, iterations, converged };
}

function computeSolutionRatio(
  model: LpModel,
  output: LpSolveOutput,
  denominatorNutrientId: string,
): { readonly cost: number; readonly den: number; readonly ratio: number } {
  let cost = 0;
  let den = 0;
  for (const ing of model.normalizedIngredients) {
    const varName = model.ingredientVarMap.get(ing.id);
    if (!varName) continue;
    const col = output.solution.Columns[varName];
    const frac = col && "Primal" in col && Number.isFinite(col.Primal) ? col.Primal : 0;
    const v = model.variables.find((vv) => vv.varName === varName);
    cost += frac * (v?.modelPricePerKg ?? 0);
    den += frac * (resolveNutrientValue(ing, denominatorNutrientId) ?? 0);
  }
  const ratio = den > 1e-12 ? cost / den : Number.POSITIVE_INFINITY;
  return { cost, den, ratio };
}

async function runDinkelbach(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  groupLimits: readonly GroupLimitRule[],
  warnings: readonly ConflictDiagnostic[],
  elastic: boolean,
): Promise<PassResult> {
  const denNut = config.fractionalObjective!.nutrientId;
  let lambda = 0;
  let lastPass = await runPass(
    ingredients,
    requirement,
    config,
    solveLp,
    groupLimits,
    warnings,
    elastic,
    lambda,
  );

  if (lastPass.output.solution.Status !== "Optimal") {
    return lastPass;
  }

  const initial = computeSolutionRatio(lastPass.model, lastPass.output, denNut);
  if (!Number.isFinite(initial.ratio)) {
    return lastPass;
  }
  lambda = initial.ratio;

  for (let iter = 0; iter < DINKELBACH_MAX_ITER; iter++) {
    const pass = await runPass(
      ingredients,
      requirement,
      config,
      solveLp,
      groupLimits,
      warnings,
      elastic,
      lambda,
    );
    if (pass.output.solution.Status !== "Optimal") {
      return pass;
    }
    const { ratio } = computeSolutionRatio(pass.model, pass.output, denNut);
    if (!Number.isFinite(ratio) || Math.abs(ratio - lambda) < DINKELBACH_TOL) {
      return pass;
    }
    lambda = ratio;
    lastPass = pass;
  }
  return lastPass;
}

export async function solveFormulationWithRunner(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  options: SolveOptions = {},
): Promise<FormulationResult> {
  const groupLimits = options.groupLimits ?? [];

  const precheck = runPrecheck(ingredients, requirement, config, groupLimits);
  const warnings = precheck.diagnostics.filter((d) => d.severity === "warning");

  const structuralErrors = precheck.diagnostics.filter(isStructuralPrecheckError);
  if (structuralErrors.length > 0) {
    const firstErr = structuralErrors[0]!;
    return buildInfeasibleResult(
      config,
      precheck.diagnostics,
      [firstErr.message],
      await withIis(ingredients, requirement, config, solveLp, groupLimits),
    );
  }

  const useSlp =
    config.fractionalObjective === undefined && hasStochasticData(ingredients, requirement, config);

  const solveOne = (elastic: boolean) =>
    config.fractionalObjective
      ? runDinkelbach(ingredients, requirement, config, solveLp, groupLimits, warnings, elastic)
      : useSlp
        ? runStochasticSlp(
            ingredients,
            requirement,
            config,
            solveLp,
            groupLimits,
            warnings,
            elastic,
          )
        : runPass(ingredients, requirement, config, solveLp, groupLimits, warnings, elastic);

  const finalize = async (r: PassResult): Promise<FormulationResult> => {
    const slp = r as Partial<{ iterations: number; converged: boolean }>;
    let result: FormulationResult = r.parsed;

    // PR-04: laporkan peringatan non-konvergensi bila SLP mencapai batas iterasi.
    if (
      slp.iterations !== undefined &&
      slp.converged === false &&
      (config.stochasticMaxIter ?? 12) > 1
    ) {
      const unstableWarn: ConflictDiagnostic = {
        code: "STOCHASTIC_UNSTABLE",
        severity: "warning",
        message: `SLP stokastik belum konvergen penuh setelah ${slp.iterations} iterasi.`,
        suggestion: "Naikkan batas iterasi SLP atau turunkan faktor redaman α.",
      };
      result = {
        ...result,
        conflicts: [...(result.conflicts ?? []), unstableWarn],
      };
    }

    // PR-02: bila ada baris nutrien degenerat pada solusi optimal, hitung directional shadow price (±δ).
    if (
      result.status === "optimal" &&
      result.costPerKg !== null &&
      !config.fractionalObjective &&
      !useSlp &&
      result.nutrients.some((n) => n.isDegenerate)
    ) {
      result = await attachDirectionalShadowPrices(
        ingredients,
        requirement,
        config,
        solveLp,
        groupLimits,
        result,
      );
    }

    return slp.iterations !== undefined
      ? { ...result, stochasticIterations: slp.iterations }
      : result;
  };

  const hard = await solveOne(false);
  if (hard.parsed.status === "optimal" || !config.enableElasticFallback) {
    if (hard.parsed.status === "infeasible") {
      const baseRes = await finalize(hard);
      return {
        ...baseRes,
        ...(await withIis(ingredients, requirement, config, solveLp, groupLimits)),
      };
    }
    return finalize(hard);
  }

  const elastic = await solveOne(true);
  if (elastic.parsed.status === "infeasible") {
    const baseRes = await finalize(elastic);
    return {
      ...baseRes,
      ...(await withIis(ingredients, requirement, config, solveLp, groupLimits)),
    };
  }
  return finalize(elastic);
}

/**
 * PR-02: Hitung directional shadow price (shadowPriceUp / shadowPriceDown)
 * melalui perturbasi RHS ±δ khusus untuk kendala nutrien yang terdeteksi degenerat.
 */
async function attachDirectionalShadowPrices(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  groupLimits: readonly GroupLimitRule[],
  baseResult: FormulationResult,
): Promise<FormulationResult> {
  const baseCost = baseResult.costPerKg;
  if (baseCost === null) return baseResult;

  const updatedNutrients = await Promise.all(
    baseResult.nutrients.map(async (nutRes) => {
      if (!nutRes.isDegenerate) return nutRes;
      const constraint = requirement.constraints.find((c) => c.nutrientId === nutRes.nutrientId);
      if (!constraint) return nutRes;

      const minVal = constraint.min;
      const maxVal = constraint.max;
      const isEq =
        minVal !== undefined && maxVal !== undefined && Math.abs(minVal - maxVal) <= 1e-6;
      const atMin = minVal !== undefined && Math.abs(nutRes.value - minVal) <= 1e-4;
      const atMax = maxVal !== undefined && Math.abs(nutRes.value - maxVal) <= 1e-4;

      let ref: number | undefined;
      if ((isEq || atMin) && minVal !== undefined) {
        ref = minVal;
      } else if (atMax && maxVal !== undefined) {
        ref = maxVal;
      }
      if (ref === undefined) return nutRes;
      const delta = Math.max(1e-3, Math.abs(ref) * 1e-3);

      const probeCost = async (shift: number): Promise<number | null> => {
        const nextReq: Requirement = {
          ...requirement,
          constraints: requirement.constraints.map((c) => {
            if (c.nutrientId !== nutRes.nutrientId) return c;
            if (isEq) {
              return { ...c, min: (c.min ?? 0) + shift, max: (c.max ?? 0) + shift };
            }
            if (atMin) {
              return { ...c, min: (c.min ?? 0) + shift };
            }
            return { ...c, max: (c.max ?? 0) + shift };
          }),
        };
        const pass = await runPass(ingredients, nextReq, config, solveLp, groupLimits, [], false);
        return pass.parsed.status === "optimal" ? pass.parsed.costPerKg : null;
      };

      const [costUp, costDown] = await Promise.all([probeCost(delta), probeCost(-delta)]);
      const shadowPriceUp = costUp !== null ? (costUp - baseCost) / delta : null;
      const shadowPriceDown = costDown !== null ? (baseCost - costDown) / delta : null;

      return {
        ...nutRes,
        shadowPriceUp,
        shadowPriceDown,
      };
    }),
  );

  return {
    ...baseResult,
    nutrients: updatedNutrients,
  };
}
