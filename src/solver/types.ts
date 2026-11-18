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
  | { readonly kind: "denominator_floor"; readonly nutrientId: string; readonly floor: number }
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
  | {
      readonly kind: "group_min";
      readonly category: IngredientCategory;
      readonly boundPct: number;
      readonly groupId?: string;
      readonly groupName?: string;
    }
  | {
      readonly kind: "group_max";
      readonly category: IngredientCategory;
      readonly boundPct: number;
      readonly groupId?: string;
      readonly groupName?: string;
    }
  | { readonly kind: "goal_deviation"; readonly nutrientId: string; readonly target: number }
  | { readonly kind: "chebyshev"; readonly nutrientId: string; readonly scale: number };

export interface LpRow {
  readonly name: string;
  readonly terms: readonly LpTerm[];
  readonly sense: LpConstraintSense;
  readonly rhs: number;
  readonly meta: LpRowMeta;
  readonly slackNegVar?: string;
  readonly slackPosVar?: string;
}

export type LpVariableRole =
  "ingredient" | "goal_pos" | "goal_neg" | "elastic_pos" | "elastic_neg" | "chebyshev";

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
  /** PR-03: true bila objektif adalah rasio biaya/nutrien (Dinkelbach) — dual bukan IDR/kg. */
  readonly fractionalActive: boolean;
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

export interface StochasticLinearization {
  /** varName -> x_j^(t): titik linearisasi Taylor saat ini (SLP Munford). */
  readonly xPrev: ReadonlyMap<string, number>;
}

export interface BuildModelOptions {
  readonly elastic?: boolean;
  readonly elasticPenaltyM?: number;
  readonly priceOverrides?: Readonly<Record<string, number>>;
  readonly groupLimits?: readonly GroupLimitRule[];
  /** PR-03 Dinkelbach: λ pada iterasi ini; koefisien objektif jadi (harga_j − λ·e_j). */
  readonly fractionalLambda?: number;
  /** PR-04 SLP: linearisasi Munford V_i(x) ≈ xᵀΣ⁽ⁱ⁾x + σ_bi² pada xPrev. */
  readonly stochastic?: StochasticLinearization;
}

export interface PrecheckResult {
  readonly hasErrors: boolean;
  readonly diagnostics: readonly ConflictDiagnostic[];
}
