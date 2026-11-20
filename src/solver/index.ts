export { buildLpModel } from "./buildModel";
export { computeCriticalRegionStepping, type CriticalStep } from "./criticalStepping";
export { computeEnzymeUplift, computeIngredientEnzymeUplift } from "./enzymes";
export { findMinimalIis } from "./iis";
export {
  detectNutrientGaps,
  getIndonesiaAvailabilityTier,
  recommendIngredientsForGaps,
  type IndonesiaAvailabilityTier,
  type IngredientSuggestion,
  type NutrientGapInfo,
} from "./ingredientAdvisor";
export {
  isUpperBoundOnlyNutrient,
  resolveEffectiveConstraintBounds,
  resolveSingleTargetValue,
} from "./modelHelpers";
export { runPrecheck } from "./precheck";
export { evaluateRumenBiology, isRumenEvaluationRelevant } from "./rumenEvaluator";
export { solveFormulationWithRunner, type SolveOptions } from "./solveFormulation";
export { computeCriticalPriceLadder, prewarmSolver, solveFormulation } from "./solverClient";
export { toLpString } from "./toLpString";
export type { LpRunner, LpSolveOutput, LpSolveRanging } from "./highsTypes";
export type {
  BuildModelOptions,
  GroupLimitRule,
  LpConstraintSense,
  LpModel,
  LpRow,
  LpRowMeta,
  LpTerm,
  LpVariable,
  LpVariableRole,
  PrecheckResult,
} from "./types";
