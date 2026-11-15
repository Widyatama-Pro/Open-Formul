import type {
  ConflictDiagnostic,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Requirement,
} from "../types";
import { buildLpModel } from "./buildModel";
import type { LpRunner } from "./highsTypes";
import { buildInfeasibleResult, parseHighsResult } from "./parseResult";
import { runPrecheck } from "./precheck";
import { toLpString } from "./toLpString";
import type { GroupLimitRule } from "./types";

export interface SolveOptions {
  readonly groupLimits?: readonly GroupLimitRule[];
}

function isStructuralPrecheckError(d: ConflictDiagnostic): boolean {
  if (d.severity !== "error") return false;
  // Target unreachable masih bisa dicoba relaksasi L1 apabila enableElasticFallback aktif,
  // kecuali konflik rasio 0/0 atau batas inklusi/DM invalid.
  if (d.code === "NUTRIENT_UNREACHABLE" && !d.message.includes("Rasio ")) {
    return false;
  }
  return true;
}

/**
 * Orkestrasi end-to-end solver formulasi pakan:
 * 1) Pre-check cepat -> blokir jika error struktural
 * 2) Susun model LP normal & selesaikan lewat HiGHS runner
 * 3) Jika infeasible dan `enableElasticFallback` aktif -> bangun model slack L1
 * 4) Verifikasi pasca-solve toleransi 1e-6 & pisahkan biaya riil dari penalti.
 */
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
  if (structuralErrors.length > 0 || (precheck.hasErrors && !config.enableElasticFallback)) {
    const firstErr = precheck.diagnostics.find((d) => d.severity === "error");
    return buildInfeasibleResult(
      config,
      precheck.diagnostics,
      firstErr ? [firstErr.message] : ["Validasi awal gagal sebelum optimasi."],
    );
  }

  if (!precheck.hasErrors) {
    const hardModel = buildLpModel(ingredients, requirement, config, {
      elastic: false,
      groupLimits,
    });
    const hardLp = toLpString(hardModel);
    const hardOutput = await solveLp(hardLp);

    const hardParsed = parseHighsResult(
      hardModel,
      hardOutput,
      ingredients,
      requirement,
      config,
      warnings,
    );

    if (hardParsed.status === "optimal" || !config.enableElasticFallback) {
      return hardParsed;
    }
  }

  const elasticModel = buildLpModel(ingredients, requirement, config, {
    elastic: true,
    groupLimits,
  });
  const elasticLp = toLpString(elasticModel);
  const elasticOutput = await solveLp(elasticLp);

  return parseHighsResult(elasticModel, elasticOutput, ingredients, requirement, config, warnings);
}
