import type {
  Basis,
  ConflictDiagnostic,
  Ingredient,
  IngredientCategory,
  OptimizationMode,
} from "../types";

export type LpConstraintSense = ">=" | "<=" | "=";

export interface LpTerm {
  readonly varName: string;
  readonly coeff: number;
}

export type LpRowMeta =
  | { readonly kind: "sum_to_one" }
  | { readonly kind: "nutrient_min"; readonly nutrientId: string; readonly boundValue: number }
  | { readonly kind: "nutrient_max"; readonly nutrientId: string; readonly boundValue: number }
  | { readonly kind: "nutrient_eq"; readonly nutrientId: string; readonly boundValue: number }
  | {
      readonly kind: "ratio_min";
      readonly numeratorId: string;
      readonly denominatorId: string;
      readonly targetRatio: number;
    }
  | {
      readonly kind: "ratio_max";
      readonly numeratorId: string;
      readonly denominatorId: string;
      readonly targetRatio: number;
    }
  | { readonly kind: "group_min"; readonly category: IngredientCategory; readonly boundPct: number }
  | { readonly kind: "group_max"; readonly category: IngredientCategory; readonly boundPct: number }
  | { readonly kind: "goal_deviation"; readonly nutrientId: string; readonly target: number };

export interface LpRow {
  readonly name: string;
  readonly terms: readonly LpTerm[];
  readonly sense: LpConstraintSense;
  readonly rhs: number;
  readonly meta: LpRowMeta;
  readonly slackNegVar?: string;
  readonly slackPosVar?: string;
}

export type LpVariableRole = "ingredient" | "goal_pos" | "goal_neg" | "elastic_pos" | "elastic_neg";

export interface LpVariable {
  readonly varName: string;
  readonly role: LpVariableRole;
  readonly ingredientId?: string;
  readonly effectiveLowerPct?: number;
  readonly effectiveUpperPct?: number;
  /** Harga murni bahan per kg pada activeBasis, selalu terpisah dari bobot goal/penalti elastik. */
  readonly modelPricePerKg?: number;
  readonly objectiveCoeff: number;
  readonly lower: number;
  readonly upper: number | null;
}

export interface LpModel {
  readonly basis: Basis;
  readonly elasticMode: boolean;
  readonly elasticPenaltyM: number;
  readonly optimizationMode: OptimizationMode;
  readonly costObjFactor: number;
  readonly normalizedIngredients: readonly Ingredient[];
  readonly ingredientVarMap: ReadonlyMap<string, string>;
  readonly variables: readonly LpVariable[];
  readonly rows: readonly LpRow[];
}

export interface GroupLimitRule {
  readonly category: IngredientCategory;
  readonly minPct?: number;
  readonly maxPct?: number;
}

export interface BuildModelOptions {
  readonly elastic?: boolean;
  readonly elasticPenaltyM?: number;
  readonly priceOverrides?: Readonly<Record<string, number>>;
  readonly groupLimits?: readonly GroupLimitRule[];
}

export interface PrecheckResult {
  readonly hasErrors: boolean;
  readonly diagnostics: readonly ConflictDiagnostic[];
}
