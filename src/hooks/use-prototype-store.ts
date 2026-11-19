import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  MOCK_SAVED_RECIPES,
  evaluateMockFormulation,
} from "../data/mock-state";
import { prewarmSolver, solveFormulation } from "../solver";
import {
  clearAllUserData as clearAllUserDataDb,
  estimateSnapshotBytes,
  hydrateOrSeedDatabase,
  parseFeedJson,
  resetAllSampleData as resetAllSampleDataDb,
  saveActiveSessionToDb,
  saveIngredientsToDb,
  savePreferencesToDb,
  saveRecipesToDb,
  saveRequirementsToDb,
  type StorageStats,
} from "../storage";
import type {
  AppLanguage,
  Basis,
  ConstraintTier,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  NutrientConstraint,
  NutrientUnit,
  OptimizationMode,
  Recipe,
  Requirement,
  ThemeMode,
  UserPreferences,
} from "../types";
import type { ValidationResult } from "../utils/validators";

export type AppRoute =
  "formulation" | "ingredients" | "requirements" | "recipes" | "advanced" | "settings";

export interface ConstraintPatch {
  readonly min?: number | null;
  readonly max?: number | null;
  readonly enabled?: boolean;
  readonly tier?: ConstraintTier;
  readonly requirementStdDev?: number | null;
  readonly targetProbability?: number | null;
  readonly useCantelli?: boolean;
}

const KEARL_HARTADI_STARTER_IDS = new Set([
  "hartadi-rumput-gajah",
  "hartadi-jerami-padi",
  "hartadi-lamtoro",
  "hartadi-bungkil-kelapa",
  "hartadi-pollard",
  "hartadi-onggok-kering",
  "hartadi-molases",
  "hartadi-bis-ekspeller",
]);

const POULTRY_STARTER_IDS = new Set([
  "corn-ground",
  "sbm-44",
  "rice-bran",
  "fish-meal-local",
  "cpo-oil",
  "limestone",
  "dcp-mineral",
  "dl-methionine",
  "premix-vitmin",
]);

function mergeRecipeIngredientsNonDestructive(
  catalog: readonly Ingredient[],
  recipeIngredients: readonly Ingredient[],
): readonly Ingredient[] {
  const byRecipeId = new Map(recipeIngredients.map((item) => [item.id, item]));
  const merged = catalog.map((catItem) => {
    const match = byRecipeId.get(catItem.id);
    if (!match) {
      return { ...catItem, isActive: false };
    }
    return {
      ...catItem,
      ...match,
      isActive: match.isActive ?? true,
    };
  });

  const existingIds = new Set(catalog.map((c) => c.id));
  for (const rItem of recipeIngredients) {
    if (!existingIds.has(rItem.id)) {
      merged.push({
        ...rItem,
        isActive: rItem.isActive ?? true,
      });
    }
  }
  return merged;
}

export interface PrototypeStore {
  readonly route: AppRoute;
  readonly setRoute: (route: AppRoute) => void;
  readonly ingredients: readonly Ingredient[];
  readonly requirements: readonly Requirement[];
  readonly allNutrients: readonly Nutrient[];
  readonly activeRequirement: Requirement;
  readonly hasActiveRequirementOverride: boolean;
  readonly config: FormulationConfig;
  readonly result: ReturnType<typeof evaluateMockFormulation>;
  readonly isSolving: boolean;
  readonly isHydrated: boolean;
  readonly storageMode: "indexeddb" | "memory";
  readonly storageStats: StorageStats;
  readonly storageWarnings: readonly string[];
  readonly recipes: readonly Recipe[];
  readonly preferences: UserPreferences;
  readonly demoScenario: "auto" | "optimal" | "near_feasible" | "infeasible";
  readonly setDemoScenario: (scenario: "auto" | "optimal" | "near_feasible" | "infeasible") => void;
  readonly selectPreset: (requirementId: string) => void;
  readonly updateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly importIngredients: (nextIngredients: readonly Ingredient[]) => void;
  readonly addIngredient: (ingredient: Ingredient) => void;
  readonly resetPriceOverride: (id: string) => void;
  readonly updateConstraint: (nutrientId: string, patch: ConstraintPatch) => void;
  readonly addCustomNutrient: (input: {
    readonly name: string;
    readonly unit: NutrientUnit;
    readonly defaultBasis?: Basis;
    readonly min?: number;
    readonly max?: number;
  }) => { readonly ok: boolean; readonly error?: string };
  readonly removeCustomNutrient: (nutrientId: string) => void;
  readonly updateCustomNutrientBasis: (nutrientId: string, defaultBasis: Basis) => void;
  readonly addRequirement: (requirement: Requirement) => void;
  readonly setActiveBasis: (basis: Basis) => void;
  readonly setOptimizationMode: (mode: OptimizationMode) => void;
  readonly setBatchSizeKg: (kg: number) => void;
  readonly toggleAdvanceNutrients: (enabled: boolean) => void;
  readonly toggleShowNdf: (enabled: boolean) => void;
  readonly toggleDigestibleBasis: (enabled: boolean) => void;
  readonly toggleElasticFallback: (enabled: boolean) => void;
  readonly updatePrecisionConfig: (patch: {
    readonly fractionalObjective?: FormulationConfig["fractionalObjective"] | null;
    readonly enableStochasticSlp?: boolean;
    readonly stochasticMaxIter?: number;
    readonly stochasticDamping?: number;
    readonly stochasticTolerance?: number;
    readonly enzymes?: FormulationConfig["enzymes"] | null;
    readonly enzymeSubAdditiveCap?: number | null;
  }) => void;
  readonly setGlobalZeroInclusion: (enforceNonZero: boolean, minIfSelected?: number) => void;
  readonly setManualLock: (ingredientId: string, pct: number | null) => void;
  readonly clearManualLocks: () => void;
  readonly saveCurrentRecipe: (name: string, notes?: string) => void;
  readonly loadRecipe: (recipeId: string) => void;
  readonly importFeedJson: (
    rawText: string,
  ) => ValidationResult<{ readonly recipe: Recipe; readonly wasIdRenamed: boolean }>;
  readonly deleteRecipe: (recipeId: string) => void;
  readonly exportAllBackupJson: () => string;
  readonly setLanguage: (language: AppLanguage) => void;
  readonly setTheme: (theme: ThemeMode) => void;
  readonly updatePreferences: (patch: Partial<UserPreferences>) => void;
  readonly resetAllMock: () => void;
  readonly resetAllSampleData: () => Promise<void>;
  readonly clearAllUserData: () => Promise<void>;
}

export function usePrototypeStore(): PrototypeStore {
  const [route, setRoute] = useState<AppRoute>("formulation");
  const [ingredients, setIngredients] = useState<readonly Ingredient[]>(MOCK_INGREDIENTS);
  const [requirements, setRequirements] = useState<readonly Requirement[]>(MOCK_REQUIREMENTS);
  const [activeReqId, setActiveReqId] = useState<string>(MOCK_REQUIREMENTS[0]!.id);
  const [activeRequirementOverride, setActiveRequirementOverride] = useState<Requirement | null>(
    null,
  );
  const [config, setConfig] = useState<FormulationConfig>(DEFAULT_CONFIG);
  const [recipes, setRecipes] = useState<readonly Recipe[]>(MOCK_SAVED_RECIPES);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [demoScenario, setDemoScenario] = useState<
    "auto" | "optimal" | "near_feasible" | "infeasible"
  >("auto");

  const [isHydrated, setIsHydrated] = useState(false);
  const [storageMode, setStorageMode] = useState<"indexeddb" | "memory">("memory");
  const [storageWarnings, setStorageWarnings] = useState<readonly string[]>([]);
  const [sessionDirty, setSessionDirty] = useState(false);

  // Hidrasi asinkron awal dari IndexedDB (graceful fallback bila IDB tidak tersedia)
  useEffect(() => {
    let active = true;
    void hydrateOrSeedDatabase().then((snapshot) => {
      if (!active) return;
      setIngredients(snapshot.ingredients);
      setRequirements(snapshot.requirements);
      setRecipes(snapshot.savedRecipes);
      setActiveReqId(snapshot.activeSession.activeRequirementId);
      setActiveRequirementOverride(snapshot.activeSession.activeRequirementOverride ?? null);
      setConfig(snapshot.activeSession.config);
      setPreferences(snapshot.preferences);
      setStorageMode(snapshot.storageMode);
      setStorageWarnings(snapshot.warnings);
      setIsHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persistensi ter-debounce ke IndexedDB hanya sesudah hidrasi awal selesai
  useEffect(() => {
    if (!isHydrated || storageMode !== "indexeddb") return;
    const timer = setTimeout(() => {
      void saveIngredientsToDb(ingredients);
    }, 200);
    return () => clearTimeout(timer);
  }, [isHydrated, storageMode, ingredients]);

  useEffect(() => {
    if (!isHydrated || storageMode !== "indexeddb") return;
    const timer = setTimeout(() => {
      void saveRequirementsToDb(requirements);
    }, 200);
    return () => clearTimeout(timer);
  }, [isHydrated, storageMode, requirements]);

  useEffect(() => {
    if (!isHydrated || storageMode !== "indexeddb") return;
    const timer = setTimeout(() => {
      void saveRecipesToDb(recipes);
    }, 200);
    return () => clearTimeout(timer);
  }, [isHydrated, storageMode, recipes]);

  useEffect(() => {
    if (!isHydrated || storageMode !== "indexeddb") return;
    const timer = setTimeout(() => {
      void saveActiveSessionToDb({
        id: "current",
        activeRequirementId: activeReqId,
        config,
        updatedAt: new Date().toISOString(),
        ...(activeRequirementOverride ? { activeRequirementOverride } : {}),
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [isHydrated, storageMode, activeReqId, activeRequirementOverride, config]);

  useEffect(() => {
    if (!isHydrated || storageMode !== "indexeddb") return;
    const timer = setTimeout(() => {
      void savePreferencesToDb(preferences);
    }, 200);
    return () => clearTimeout(timer);
  }, [isHydrated, storageMode, preferences]);

  const activeRequirement = useMemo(
    () =>
      activeRequirementOverride ??
      requirements.find((r) => r.id === activeReqId) ??
      requirements[0]!,
    [activeRequirementOverride, requirements, activeReqId],
  );

  const storageStats = useMemo<StorageStats>(
    () => ({
      storageMode,
      ingredientCount: ingredients.length,
      requirementCount: requirements.length,
      recipeCount: recipes.length,
      estimatedBytes: estimateSnapshotBytes({
        ingredients,
        requirements,
        savedRecipes: recipes,
        preferences,
      }),
    }),
    [storageMode, ingredients, requirements, recipes, preferences],
  );

  const selectPreset = useCallback(
    (requirementId: string) => {
      const target = requirements.find((r) => r.id === requirementId);
      if (!target) return;
      setActiveRequirementOverride(null);
      setActiveReqId(target.id);
      setConfig((prev) => ({
        ...prev,
        activeBasis: target.basis,
        manualLocks: {},
      }));
      setSessionDirty(false);

      if (
        target.id.startsWith("kearl") ||
        target.id.startsWith("nrc88-") ||
        target.id.startsWith("sni-3148") ||
        target.id.startsWith("sni-8819")
      ) {
        setIngredients((prev) =>
          prev.map((ing) => ({
            ...ing,
            isActive: KEARL_HARTADI_STARTER_IDS.has(ing.id),
          })),
        );
      } else if (target.species.startsWith("cattle")) {
        setIngredients((prev) =>
          prev.map((ing) => (ing.id === "napier-grass" ? { ...ing, isActive: true } : ing)),
        );
      } else if (
        target.species === "broiler" ||
        target.species === "layer" ||
        target.species === "buras" ||
        target.species === "duck"
      ) {
        setIngredients((prev) => {
          const hasPoultryEnergy = prev.some(
            (i) => i.isActive !== false && (i.nutrients.me_poultry ?? 0) > 0,
          );
          if (hasPoultryEnergy) return prev;
          return prev.map((ing) => ({
            ...ing,
            isActive: POULTRY_STARTER_IDS.has(ing.id),
          }));
        });
      }
    },
    [requirements],
  );

  const updateIngredient = useCallback((id: string, patch: Partial<Ingredient>) => {
    setSessionDirty(true);
    setIngredients((prev) => prev.map((ing) => (ing.id === id ? { ...ing, ...patch } : ing)));
  }, []);

  const importIngredients = useCallback((nextIngredients: readonly Ingredient[]) => {
    setSessionDirty(true);
    setIngredients(nextIngredients);
  }, []);

  const addIngredient = useCallback((ingredient: Ingredient) => {
    setSessionDirty(true);
    setIngredients((prev) => [ingredient, ...prev]);
  }, []);

  const resetPriceOverride = useCallback((id: string) => {
    setSessionDirty(true);
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        const { priceOverride: _removed, ...rest } = ing;
        void _removed;
        return rest;
      }),
    );
  }, []);

  const updateConstraint = useCallback(
    (nutrientId: string, patch: ConstraintPatch) => {
      setSessionDirty(true);
      const mergeConstraint = (existing?: NutrientConstraint): NutrientConstraint => {
        const nextMin = patch.min === null ? undefined : (patch.min ?? existing?.min);
        const nextMax = patch.max === null ? undefined : (patch.max ?? existing?.max);
        const nextEnabled = patch.enabled ?? existing?.enabled ?? true;
        const nextTier = patch.tier ?? existing?.tier;
        const nextReqStd =
          patch.requirementStdDev === null
            ? undefined
            : (patch.requirementStdDev ?? existing?.requirementStdDev);
        const nextTargetProb =
          patch.targetProbability === null
            ? undefined
            : (patch.targetProbability ?? existing?.targetProbability);
        const nextUseCantelli = patch.useCantelli ?? existing?.useCantelli;
        return {
          nutrientId,
          enabled: nextEnabled,
          ...(nextMin !== undefined ? { min: nextMin } : {}),
          ...(nextMax !== undefined ? { max: nextMax } : {}),
          ...(existing?.isAdvance !== undefined ? { isAdvance: existing.isAdvance } : {}),
          ...(existing?.idealTarget !== undefined ? { idealTarget: existing.idealTarget } : {}),
          ...(nextTier !== undefined ? { tier: nextTier } : {}),
          ...(nextReqStd !== undefined ? { requirementStdDev: nextReqStd } : {}),
          ...(nextTargetProb !== undefined ? { targetProbability: nextTargetProb } : {}),
          ...(nextUseCantelli !== undefined ? { useCantelli: nextUseCantelli } : {}),
        };
      };

      const applyToRequirement = (req: Requirement): Requirement => {
        const exists = req.constraints.some((c) => c.nutrientId === nutrientId);
        const nextConstraints = exists
          ? req.constraints.map((c) => (c.nutrientId === nutrientId ? mergeConstraint(c) : c))
          : [...req.constraints, mergeConstraint()];
        return { ...req, constraints: nextConstraints };
      };

      if (activeRequirementOverride !== null) {
        setActiveRequirementOverride((prev) => (prev ? applyToRequirement(prev) : null));
        return;
      }

      setRequirements((prev) =>
        prev.map((req) => (req.id === activeRequirement.id ? applyToRequirement(req) : req)),
      );
    },
    [activeRequirement.id, activeRequirementOverride],
  );

  const addRequirement = useCallback((requirement: Requirement) => {
    setActiveRequirementOverride(null);
    setRequirements((prev) => [requirement, ...prev]);
    setActiveReqId(requirement.id);
    setConfig((prev) => ({ ...prev, activeBasis: requirement.basis }));
    setSessionDirty(false);
  }, []);

  const allNutrients = useMemo<readonly Nutrient[]>(
    () => [...MOCK_NUTRIENTS, ...(config.customNutrients ?? [])],
    [config.customNutrients],
  );

  const addCustomNutrient = useCallback(
    (input: {
      readonly name: string;
      readonly unit: NutrientUnit;
      readonly defaultBasis?: Basis;
      readonly min?: number;
      readonly max?: number;
    }): { readonly ok: boolean; readonly error?: string } => {
      const trimmedName = input.name.trim().slice(0, 100);
      if (!trimmedName) {
        return { ok: false, error: "Nama nutrien kustom wajib diisi." };
      }
      if (input.min !== undefined && input.max !== undefined && input.min > input.max) {
        return { ok: false, error: "Nilai Min tidak boleh lebih besar dari Max." };
      }
      const existingCustom = config.customNutrients ?? [];
      if (existingCustom.length >= 50) {
        return { ok: false, error: "Batas maksimal 50 nutrien kustom tercapai." };
      }

      const baseSlug =
        trimmedName
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 40) || "item";
      const usedIds = new Set([
        ...MOCK_NUTRIENTS.map((n) => n.id),
        ...existingCustom.map((n) => n.id),
      ]);
      let slug = `custom_${baseSlug}`;
      let seq = 2;
      while (usedIds.has(slug)) {
        slug = `custom_${baseSlug}_${seq}`;
        seq += 1;
      }

      const basisToUse = input.defaultBasis ?? config.activeBasis;
      const newNutrient: Nutrient = {
        id: slug,
        name: trimmedName,
        unit: input.unit,
        tier: "basic",
        isCustom: true,
        defaultBasis: basisToUse,
      };
      const newConstraint: NutrientConstraint = {
        nutrientId: slug,
        enabled: true,
        isAdvance: false,
        ...(input.min !== undefined ? { min: input.min } : {}),
        ...(input.max !== undefined ? { max: input.max } : {}),
      };

      setSessionDirty(true);
      setConfig((prev) => ({
        ...prev,
        customNutrients: [...(prev.customNutrients ?? []), newNutrient],
      }));

      const applyConstraint = (req: Requirement): Requirement => ({
        ...req,
        constraints: [...req.constraints, newConstraint],
      });
      if (activeRequirementOverride !== null) {
        setActiveRequirementOverride((prev) => (prev ? applyConstraint(prev) : null));
      } else {
        setRequirements((prev) =>
          prev.map((req) => (req.id === activeRequirement.id ? applyConstraint(req) : req)),
        );
      }
      return { ok: true };
    },
    [activeRequirement.id, activeRequirementOverride, config.activeBasis, config.customNutrients],
  );

  const removeCustomNutrient = useCallback(
    (nutrientId: string) => {
      setSessionDirty(true);
      setConfig((prev) => ({
        ...prev,
        customNutrients: (prev.customNutrients ?? []).filter((n) => n.id !== nutrientId),
      }));
      const stripConstraint = (req: Requirement): Requirement => ({
        ...req,
        constraints: req.constraints.filter((c) => c.nutrientId !== nutrientId),
      });
      if (activeRequirementOverride !== null) {
        setActiveRequirementOverride((prev) => (prev ? stripConstraint(prev) : null));
      } else {
        setRequirements((prev) =>
          prev.map((req) => (req.id === activeRequirement.id ? stripConstraint(req) : req)),
        );
      }
    },
    [activeRequirement.id, activeRequirementOverride],
  );

  const updateCustomNutrientBasis = useCallback((nutrientId: string, defaultBasis: Basis) => {
    setSessionDirty(true);
    setConfig((prev) => ({
      ...prev,
      customNutrients: (prev.customNutrients ?? []).map((n) =>
        n.id === nutrientId ? { ...n, defaultBasis } : n,
      ),
    }));
  }, []);

  const setActiveBasis = useCallback((basis: Basis) => {
    setSessionDirty(true);
    setConfig((prev) => ({ ...prev, activeBasis: basis }));
  }, []);

  const setOptimizationMode = useCallback((optimizationMode: OptimizationMode) => {
    setSessionDirty(true);
    setConfig((prev) => ({ ...prev, optimizationMode }));
  }, []);

  const setBatchSizeKg = useCallback((batchSizeKg: number) => {
    setSessionDirty(true);
    setConfig((prev) => ({ ...prev, batchSizeKg: Math.max(1, batchSizeKg) }));
  }, []);

  const toggleAdvanceNutrients = useCallback((enableAdvanceNutrients: boolean) => {
    setSessionDirty(true);
    setConfig((prev) => ({ ...prev, enableAdvanceNutrients }));
    setPreferences((prev) => ({ ...prev, simpleMode: !enableAdvanceNutrients }));
  }, []);

  const toggleShowNdf = useCallback((showNdf: boolean) => {
    setSessionDirty(true);
    setConfig((prev) => ({ ...prev, showNdf }));
  }, []);

  const toggleDigestibleBasis = useCallback((enableDigestibleBasis: boolean) => {
    setSessionDirty(true);
    setConfig((prev) => ({ ...prev, enableDigestibleBasis }));
  }, []);

  const toggleElasticFallback = useCallback((enableElasticFallback: boolean) => {
    setSessionDirty(true);
    setConfig((prev) => ({ ...prev, enableElasticFallback }));
  }, []);

  const updatePrecisionConfig = useCallback(
    (patch: {
      readonly fractionalObjective?: FormulationConfig["fractionalObjective"] | null;
      readonly enableStochasticSlp?: boolean;
      readonly stochasticMaxIter?: number;
      readonly stochasticDamping?: number;
      readonly stochasticTolerance?: number;
      readonly enzymes?: FormulationConfig["enzymes"] | null;
      readonly enzymeSubAdditiveCap?: number | null;
    }) => {
      setSessionDirty(true);
      setConfig((prev) => {
        const {
          fractionalObjective: prevFractional,
          enzymes: prevEnzymes,
          enzymeSubAdditiveCap: prevCap,
          ...rest
        } = prev;

        const nextFractional =
          "fractionalObjective" in patch
            ? (patch.fractionalObjective ?? undefined)
            : prevFractional;
        const nextEnzymes =
          "enzymes" in patch
            ? patch.enzymes && patch.enzymes.length > 0
              ? patch.enzymes
              : undefined
            : prevEnzymes;
        const nextCap =
          "enzymeSubAdditiveCap" in patch ? (patch.enzymeSubAdditiveCap ?? undefined) : prevCap;

        return {
          ...rest,
          ...(patch.enableStochasticSlp !== undefined
            ? { enableStochasticSlp: patch.enableStochasticSlp }
            : {}),
          ...(patch.stochasticMaxIter !== undefined
            ? { stochasticMaxIter: patch.stochasticMaxIter }
            : {}),
          ...(patch.stochasticDamping !== undefined
            ? { stochasticDamping: patch.stochasticDamping }
            : {}),
          ...(patch.stochasticTolerance !== undefined
            ? { stochasticTolerance: patch.stochasticTolerance }
            : {}),
          ...(nextFractional !== undefined ? { fractionalObjective: nextFractional } : {}),
          ...(nextEnzymes !== undefined ? { enzymes: nextEnzymes } : {}),
          ...(nextCap !== undefined ? { enzymeSubAdditiveCap: nextCap } : {}),
        };
      });
    },
    [],
  );

  const setGlobalZeroInclusion = useCallback((enforceNonZero: boolean, minIfSelected?: number) => {
    setSessionDirty(true);
    setConfig((prev) => ({
      ...prev,
      globalZeroInclusion: {
        enforceNonZero,
        ...(minIfSelected !== undefined
          ? { minIfSelected }
          : prev.globalZeroInclusion.minIfSelected !== undefined
            ? { minIfSelected: prev.globalZeroInclusion.minIfSelected }
            : {}),
      },
    }));
  }, []);

  const setManualLock = useCallback((ingredientId: string, pct: number | null) => {
    setSessionDirty(true);
    setConfig((prev) => {
      const current = { ...(prev.manualLocks ?? {}) };
      if (pct === null) {
        delete current[ingredientId];
      } else {
        current[ingredientId] = Math.max(0, Math.min(100, pct));
      }
      return { ...prev, manualLocks: current };
    });
  }, []);

  const clearManualLocks = useCallback(() => {
    setSessionDirty(true);
    setConfig((prev) => ({ ...prev, manualLocks: {} }));
  }, []);

  const overrideResult = useMemo<FormulationResult | null>(() => {
    if (demoScenario === "infeasible") {
      return {
        ...evaluateMockFormulation(ingredients, activeRequirement, {
          ...config,
          enableElasticFallback: false,
        }),
        status: "infeasible" as const,
        costPerKg: null,
        batchTotalCost: null,
        composition: [],
        conflicts: [
          {
            code: "NUTRIENT_UNREACHABLE" as const,
            severity: "error" as const,
            message:
              "Simulasi Infeasible: Target Protein Kasar (Min 26%) melampaui kapasitas campuran bahan aktif (batas Max SBM 40%).",
            suggestion:
              "Naikkan batas Max Bungkil Kedelai, aktifkan Tepung Ikan, atau nyalakan Mode Relaksasi Elastik.",
          },
        ],
        messages: ["Target nutrisi terlalu tinggi untuk kombinasi bahan aktif saat ini."],
      };
    }

    if (demoScenario === "near_feasible") {
      const base = evaluateMockFormulation(ingredients, activeRequirement, {
        ...config,
        enableElasticFallback: true,
      });
      return {
        ...base,
        status: "near_feasible" as const,
        nutrients: base.nutrients.map((n, idx) =>
          idx === 0
            ? {
                ...n,
                value: (n.min ?? n.value) - 0.85,
                status: "below_min" as const,
                deviation: -0.85,
              }
            : n,
        ),
        conflicts: [
          ...(base.conflicts ?? []),
          {
            code: "SOLVER_INFEASIBLE" as const,
            severity: "warning" as const,
            message:
              "Mode Relaksasi Elastik aktif: Protein Kasar meleset -0,85% di bawah batas minimal.",
            suggestion: "Tambahkan sumber protein konsentrat atau longgarkan target PK.",
          },
        ],
        messages: ["Formula terdekat ditemukan via relaksasi elastik (periksa penanda merah)."],
      };
    }

    if (demoScenario === "optimal") {
      const base = evaluateMockFormulation(ingredients, activeRequirement, config);
      return {
        ...base,
        status: "optimal" as const,
        nutrients: base.nutrients.map((n) => ({
          ...n,
          status: n.min !== undefined || n.max !== undefined ? ("met" as const) : n.status,
          deviation: 0,
        })),
        messages: [],
      };
    }

    return null;
  }, [ingredients, activeRequirement, config, demoScenario]);

  const [liveResult, setLiveResult] = useState<FormulationResult>(() =>
    evaluateMockFormulation(MOCK_INGREDIENTS, MOCK_REQUIREMENTS[0]!, DEFAULT_CONFIG),
  );
  const [isSolvingAsync, setIsSolvingAsync] = useState(false);
  const solveTicketRef = useRef(0);
  const isFirstSolveRef = useRef(true);

  useEffect(() => {
    prewarmSolver();
  }, []);

  useEffect(() => {
    if (demoScenario !== "auto") {
      solveTicketRef.current += 1;
      return;
    }

    const ticket = ++solveTicketRef.current;
    let cancelled = false;

    const delayMs = isFirstSolveRef.current ? 0 : 120;
    isFirstSolveRef.current = false;

    const timer = setTimeout(() => {
      if (cancelled || solveTicketRef.current !== ticket) return;
      setIsSolvingAsync(true);
      void solveFormulation(ingredients, activeRequirement, config)
        .then((solved) => {
          if (cancelled || solveTicketRef.current !== ticket) return;
          setLiveResult(solved);
          setIsSolvingAsync(false);
        })
        .catch(() => {
          if (cancelled || solveTicketRef.current !== ticket) return;
          setIsSolvingAsync(false);
        });
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ingredients, activeRequirement, config, demoScenario]);

  const result = overrideResult ?? liveResult;
  const isSolving = demoScenario === "auto" && isSolvingAsync;

  const saveCurrentRecipe = useCallback(
    (name: string, notes?: string) => {
      const now = new Date().toISOString();
      const newRecipe: Recipe = {
        schemaVersion: 1,
        id: `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        ...(notes ? { notes } : {}),
        ingredients,
        requirement: activeRequirement,
        config,
        result,
        createdAt: now,
        updatedAt: now,
      };
      setRecipes((prev) => [newRecipe, ...prev]);
      setSessionDirty(false);
    },
    [ingredients, activeRequirement, config, result],
  );

  // 1A Non-destructive load: auto-backup sesi bila kotor, merge bahan ke katalog, & isolasi override requirement
  const loadRecipe = useCallback(
    (recipeId: string) => {
      const found = recipes.find((r) => r.id === recipeId);
      if (!found) return;

      const now = new Date().toISOString();
      if (sessionDirty) {
        const backupRecipe: Recipe = {
          schemaVersion: 1,
          id: `recipe-backup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: `Backup Sesi (${activeRequirement.name})`,
          notes: "Snapshot otomatis sebelum memuat formula lain.",
          ingredients,
          requirement: activeRequirement,
          config,
          result,
          createdAt: now,
          updatedAt: now,
        };
        setRecipes((prev) => [backupRecipe, ...prev]);
      }

      setIngredients((prevCatalog) =>
        mergeRecipeIngredientsNonDestructive(prevCatalog, found.ingredients),
      );
      setActiveRequirementOverride(found.requirement);
      if (requirements.some((r) => r.id === found.requirement.id)) {
        setActiveReqId(found.requirement.id);
      }
      setConfig(found.config ?? DEFAULT_CONFIG);
      setSessionDirty(false);
      setRoute("formulation");
    },
    [recipes, sessionDirty, ingredients, activeRequirement, config, result, requirements],
  );

  const importFeedJson = useCallback(
    (
      rawText: string,
    ): ValidationResult<{ readonly recipe: Recipe; readonly wasIdRenamed: boolean }> => {
      const parsed = parseFeedJson(rawText);
      if (!parsed.ok) return parsed;

      const existingIds = new Set(recipes.map((r) => r.id));
      let nextId = parsed.data.id;
      let wasIdRenamed = false;
      if (existingIds.has(nextId)) {
        wasIdRenamed = true;
        let suffix = 1;
        let candidate = `${parsed.data.id}-import-${Date.now()}`;
        while (existingIds.has(candidate)) {
          suffix += 1;
          candidate = `${parsed.data.id}-import-${Date.now()}-${suffix}`;
        }
        nextId = candidate;
      }

      const finalRecipe: Recipe = {
        ...parsed.data,
        id: nextId,
        config: parsed.data.config ?? DEFAULT_CONFIG,
      };

      setRecipes((prev) => [finalRecipe, ...prev]);
      return {
        ok: true,
        data: { recipe: finalRecipe, wasIdRenamed },
      };
    },
    [recipes],
  );

  const deleteRecipe = useCallback((recipeId: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  }, []);

  const exportAllBackupJson = useCallback(() => {
    return JSON.stringify(
      {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        app: "OpenFormul",
        ingredients,
        requirements,
        recipes,
        preferences,
        activeSession: {
          activeRequirementId: activeReqId,
          config,
          ...(activeRequirementOverride ? { activeRequirementOverride } : {}),
        },
      },
      null,
      2,
    );
  }, [
    ingredients,
    requirements,
    recipes,
    preferences,
    activeReqId,
    config,
    activeRequirementOverride,
  ]);

  const setLanguage = useCallback((language: AppLanguage) => {
    setPreferences((prev) => ({ ...prev, language }));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setPreferences((prev) => ({ ...prev, theme }));
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
    if (patch.simpleMode !== undefined) {
      setSessionDirty(true);
      setConfig((prev) => ({ ...prev, enableAdvanceNutrients: !patch.simpleMode }));
    }
  }, []);

  const resetAllSampleData = useCallback(async () => {
    const snapshot = await resetAllSampleDataDb();
    setIngredients(snapshot.ingredients);
    setRequirements(snapshot.requirements);
    setRecipes(snapshot.savedRecipes);
    setActiveReqId(snapshot.activeSession.activeRequirementId);
    setActiveRequirementOverride(null);
    setConfig(snapshot.activeSession.config);
    setPreferences(snapshot.preferences);
    setStorageMode(snapshot.storageMode);
    setDemoScenario("auto");
    setSessionDirty(false);
  }, []);

  const resetAllMock = useCallback(() => {
    setIngredients(MOCK_INGREDIENTS);
    setRequirements(MOCK_REQUIREMENTS);
    setActiveReqId(MOCK_REQUIREMENTS[0]!.id);
    setActiveRequirementOverride(null);
    setConfig(DEFAULT_CONFIG);
    setDemoScenario("auto");
    setSessionDirty(false);
    void resetAllSampleDataDb().then((snapshot) => {
      setStorageMode(snapshot.storageMode);
    });
  }, []);

  const clearAllUserData = useCallback(async () => {
    const snapshot = await clearAllUserDataDb();
    setIngredients(snapshot.ingredients);
    setRequirements(snapshot.requirements);
    setRecipes(snapshot.savedRecipes);
    setActiveReqId(snapshot.activeSession.activeRequirementId);
    setActiveRequirementOverride(null);
    setConfig(snapshot.activeSession.config);
    setPreferences(snapshot.preferences);
    setStorageMode(snapshot.storageMode);
    setDemoScenario("auto");
    setSessionDirty(false);
  }, []);

  return {
    route,
    setRoute,
    ingredients,
    requirements,
    allNutrients,
    activeRequirement,
    hasActiveRequirementOverride: activeRequirementOverride !== null,
    config,
    result,
    isSolving,
    isHydrated,
    storageMode,
    storageStats,
    storageWarnings,
    recipes,
    preferences,
    demoScenario,
    setDemoScenario,
    selectPreset,
    updateIngredient,
    importIngredients,
    addIngredient,
    resetPriceOverride,
    updateConstraint,
    addCustomNutrient,
    removeCustomNutrient,
    updateCustomNutrientBasis,
    addRequirement,
    setActiveBasis,
    setOptimizationMode,
    setBatchSizeKg,
    toggleAdvanceNutrients,
    toggleShowNdf,
    toggleDigestibleBasis,
    toggleElasticFallback,
    updatePrecisionConfig,
    setGlobalZeroInclusion,
    setManualLock,
    clearManualLocks,
    saveCurrentRecipe,
    loadRecipe,
    importFeedJson,
    deleteRecipe,
    exportAllBackupJson,
    setLanguage,
    setTheme,
    updatePreferences,
    resetAllMock,
    resetAllSampleData,
    clearAllUserData,
  };
}

export { MOCK_NUTRIENTS };
