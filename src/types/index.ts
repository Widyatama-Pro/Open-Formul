/**
 * Tipe domain kanonik Open Formul.
 * Sinkronkan setiap perubahan dengan docs/data-schema.md.
 */

export type NutrientUnit = "%" | "kcal/kg" | "MJ/kg" | "mg/kg" | "IU/kg" | "mEq/kg";
export type NutrientId = string;
export type Basis = "as_fed" | "dry_matter";

export type NutrientTier =
  "basic" | "amino_acid" | "fiber_carb" | "mineral_electrolyte" | "anf_physical";

export interface Nutrient {
  readonly id: NutrientId;
  readonly name: string;
  readonly nameEn?: string;
  readonly unit: NutrientUnit;
  readonly tier?: NutrientTier;
  readonly isDigestibleVariant?: boolean;
}

export type IngredientCategory =
  "energy" | "protein" | "mineral" | "premix" | "forage" | "additive" | "enzyme";

/** Batas dalam persen (0–100) atau satuan nutrien terkait. */
export interface Bounds {
  readonly min?: number;
  readonly max?: number;
}

export interface ZeroInclusionRule {
  readonly enforceNonZero: boolean;
  readonly minIfSelected?: number;
}

export interface Ingredient {
  readonly id: string;
  readonly name: string;
  readonly nameEn?: string;
  readonly category: IngredientCategory;
  /** Harga pasaran acuan per kg As-Fed (IDR). */
  readonly pricePerKg: number;
  /** Harga custom sesi pengguna yang menimpa harga acuan (IDR). */
  readonly priceOverride?: number;
  /** Bahan kering, % (0–100]. */
  readonly dryMatter: number;
  readonly basis: Basis;
  readonly isActive?: boolean;
  /**
   * Nilai nutrien pada basis bahan (`null` = data lab tidak tersedia / N/A;
   * `0` = memang tidak mengandung nutrien tersebut).
   */
  readonly nutrients: Readonly<Record<NutrientId, number | null>>;
  /** Standar deviasi (sigma) per nutrien untuk formulasi stokastik. */
  readonly stdDev?: Readonly<Record<NutrientId, number>>;
  readonly inclusion?: Bounds;
  readonly zeroInclusionRule?: ZeroInclusionRule;
  readonly groupId?: string;
  readonly phytateP?: number;
  readonly source: string;
}

export interface NutrientConstraint extends Bounds {
  readonly nutrientId: NutrientId;
  readonly isAdvance?: boolean;
  readonly enabled?: boolean;
  /** Titik tengah target ideal untuk Mode 5 (Presisi Tinggi). */
  readonly idealTarget?: number;
}

export interface RatioConstraint extends Bounds {
  readonly id?: string;
  readonly label?: string;
  readonly numerator: NutrientId;
  readonly denominator: NutrientId;
}

export interface IngredientGroupConstraint extends Bounds {
  readonly id: string;
  readonly name: string;
  readonly ingredientIds: readonly string[];
}

export interface Requirement {
  readonly id: string;
  readonly name: string;
  readonly nameEn?: string;
  readonly species: string;
  readonly phase?: string;
  readonly basis: Basis;
  readonly constraints: readonly NutrientConstraint[];
  readonly ratios?: readonly RatioConstraint[];
  readonly ingredientGroups?: readonly IngredientGroupConstraint[];
  readonly source?: string;
}

/** 1=Hemat, 2=Agak Hemat, 3=Seimbang, 4=Presisi, 5=Presisi Tinggi */
export type OptimizationMode = 1 | 2 | 3 | 4 | 5;

export interface FormulationConfig {
  readonly optimizationMode: OptimizationMode;
  readonly activeBasis: Basis;
  readonly batchSizeKg: number;
  readonly enableAdvanceNutrients: boolean;
  readonly enableDigestibleBasis: boolean;
  readonly enableElasticFallback: boolean;
  readonly globalZeroInclusion: ZeroInclusionRule;
  readonly manualLocks?: Readonly<Record<string, number>>;
}

export type FormulationStatus = "optimal" | "near_feasible" | "infeasible" | "error";
export type NutrientStatus = "met" | "below_min" | "above_max" | "unconstrained";

export interface PriceRange {
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
}

export interface CompositionItem {
  readonly ingredientId: string;
  /** Fraksi 0–1 dalam basis model aktif. */
  readonly fraction: number;
  /** Proporsi dalam basis As-Fed (fraksi 0–1) untuk penimbangan aktual. */
  readonly asFedFraction?: number;
  readonly weightKg?: number;
  readonly costContribution?: number;
  readonly priceRange?: PriceRange;
}

export interface NutrientResult extends Bounds {
  readonly nutrientId: NutrientId;
  readonly value: number;
  readonly status: NutrientStatus;
  readonly deviation?: number;
  readonly shadowPrice?: number | null;
}

export interface OpportunityCostItem {
  readonly ingredientId: string;
  readonly currentPrice: number;
  readonly opportunityPrice: number;
  readonly reducedCost: number;
}

export interface BoundDualItem {
  readonly ingredientId: string;
  readonly boundHit: "min" | "max";
  readonly dualValue: number;
}

export interface ConflictDiagnostic {
  readonly code:
    | "MIN_GT_MAX"
    | "INCLUSION_SUM_EXCEEDS_100"
    | "INCLUSION_MAX_UNDER_100"
    | "NUTRIENT_UNREACHABLE"
    | "ANTI_NOL_CONFLICT"
    | "ADVANCE_NULL_DATA"
    | "SOLVER_INFEASIBLE";
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly targetId?: string;
  readonly suggestion?: string;
}

export interface FormulationResult {
  readonly status: FormulationStatus;
  readonly basis: Basis;
  readonly costPerKg: number | null;
  readonly batchTotalCost?: number | null;
  readonly batchSizeKg?: number;
  readonly composition: readonly CompositionItem[];
  readonly nutrients: readonly NutrientResult[];
  readonly opportunityCosts?: readonly OpportunityCostItem[];
  readonly boundDuals?: readonly BoundDualItem[];
  readonly conflicts?: readonly ConflictDiagnostic[];
  readonly messages: readonly string[];
  readonly solvedAt: string;
}

export interface Recipe {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly notes?: string;
  readonly ingredients: readonly Ingredient[];
  readonly requirement: Requirement;
  readonly config?: FormulationConfig;
  readonly result: FormulationResult | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AppLanguage = "id" | "en";
export type ThemeMode = "light" | "dark";

export interface UserPreferences {
  readonly language: AppLanguage;
  readonly theme: ThemeMode;
  readonly defaultBasis: Basis;
  readonly defaultBatchKg: number;
  readonly zeroInclusionDefaultPct: number;
}
