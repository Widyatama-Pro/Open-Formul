import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  MOCK_INGREDIENTS,
  MOCK_REQUIREMENTS,
  MOCK_SAVED_RECIPES,
  SNI_REQUIREMENTS,
} from "../data/mock-state";
import type { FormulationConfig, Ingredient, Recipe, Requirement, UserPreferences } from "../types";
import {
  validateFeedJson,
  validateFormulationConfig,
  validateIngredient,
  validateRequirement,
  validateUserPreferences,
} from "../utils/validators";

export const OPEN_FORMUL_DB_NAME = "openformul-db";
export const OPEN_FORMUL_DB_VERSION = 1;

export interface ActiveSessionRecord {
  readonly id: "current";
  readonly activeRequirementId: string;
  readonly activeRequirementOverride?: Requirement;
  readonly config: FormulationConfig;
  readonly updatedAt: string;
}

export interface StorageStats {
  readonly storageMode: "indexeddb" | "memory";
  readonly ingredientCount: number;
  readonly requirementCount: number;
  readonly recipeCount: number;
  readonly estimatedBytes: number;
}

export interface HydratedDatabaseState {
  readonly ingredients: readonly Ingredient[];
  readonly requirements: readonly Requirement[];
  readonly savedRecipes: readonly Recipe[];
  readonly activeSession: ActiveSessionRecord;
  readonly preferences: UserPreferences;
  readonly storageMode: "indexeddb" | "memory";
  readonly warnings: readonly string[];
}

interface OpenFormulDbSchema extends DBSchema {
  ingredients: {
    key: string;
    value: Ingredient;
  };
  requirements: {
    key: string;
    value: Requirement;
  };
  recipes: {
    key: string;
    value: Recipe;
  };
  active_session: {
    key: "current";
    value: ActiveSessionRecord;
  };
  preferences: {
    key: "user";
    value: UserPreferences;
  };
}

export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

export function createDefaultSession(): ActiveSessionRecord {
  return {
    id: "current",
    activeRequirementId: MOCK_REQUIREMENTS[0]!.id,
    config: DEFAULT_CONFIG,
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultState(
  storageMode: "indexeddb" | "memory",
  warnings: readonly string[] = [],
): HydratedDatabaseState {
  return {
    ingredients: MOCK_INGREDIENTS,
    requirements: MOCK_REQUIREMENTS,
    savedRecipes: MOCK_SAVED_RECIPES,
    activeSession: createDefaultSession(),
    preferences: DEFAULT_PREFERENCES,
    storageMode,
    warnings,
  };
}

async function openOpenFormulDb(dbName: string): Promise<IDBPDatabase<OpenFormulDbSchema>> {
  return openDB<OpenFormulDbSchema>(dbName, OPEN_FORMUL_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("ingredients")) {
        db.createObjectStore("ingredients", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("requirements")) {
        db.createObjectStore("requirements", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("recipes")) {
        db.createObjectStore("recipes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("active_session")) {
        db.createObjectStore("active_session");
      }
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences");
      }
    },
  });
}

async function seedDatabase(
  db: IDBPDatabase<OpenFormulDbSchema>,
  options: { readonly includeRecipesAndPrefs: boolean },
): Promise<HydratedDatabaseState> {
  const defaultSession = createDefaultSession();
  const stores = options.includeRecipesAndPrefs
    ? (["ingredients", "requirements", "recipes", "active_session", "preferences"] as const)
    : (["ingredients", "requirements", "active_session"] as const);

  const tx = db.transaction([...stores], "readwrite");

  const ingStore = tx.objectStore("ingredients");
  await ingStore.clear();
  for (const item of MOCK_INGREDIENTS) {
    await ingStore.put(item);
  }

  const reqStore = tx.objectStore("requirements");
  await reqStore.clear();
  for (const req of MOCK_REQUIREMENTS) {
    await reqStore.put(req);
  }

  const sessionStore = tx.objectStore("active_session");
  await sessionStore.put(defaultSession, "current");

  let savedRecipes: readonly Recipe[] = MOCK_SAVED_RECIPES;
  let preferences: UserPreferences = DEFAULT_PREFERENCES;

  if (options.includeRecipesAndPrefs) {
    const recStore = tx.objectStore("recipes");
    await recStore.clear();
    for (const rec of MOCK_SAVED_RECIPES) {
      await recStore.put(rec);
    }
    const prefStore = tx.objectStore("preferences");
    await prefStore.put(DEFAULT_PREFERENCES, "user");
  }

  await tx.done;

  if (!options.includeRecipesAndPrefs) {
    savedRecipes = await db.getAll("recipes");
    const existingPrefs = await db.get("preferences", "user");
    preferences = existingPrefs ?? DEFAULT_PREFERENCES;
  }

  return {
    ingredients: MOCK_INGREDIENTS,
    requirements: MOCK_REQUIREMENTS,
    savedRecipes,
    activeSession: defaultSession,
    preferences,
    storageMode: "indexeddb",
    warnings: [],
  };
}

function parseSessionRecord(
  raw: unknown,
  fallbackRequirementId: string,
  warnings: string[],
): ActiveSessionRecord {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return createDefaultSession();
  }
  const obj = raw as Record<string, unknown>;
  const reqId =
    typeof obj.activeRequirementId === "string" && obj.activeRequirementId.trim()
      ? obj.activeRequirementId
      : fallbackRequirementId;

  const cfgRes = validateFormulationConfig(obj.config);
  const config = cfgRes.ok ? cfgRes.data : DEFAULT_CONFIG;
  if (!cfgRes.ok) {
    warnings.push("Konfigurasi sesi tersimpan tidak valid dan dipulihkan ke standar.");
  }

  let overrideReq: Requirement | undefined;
  if (obj.activeRequirementOverride !== undefined) {
    const ovRes = validateRequirement(obj.activeRequirementOverride, "Override Kebutuhan Sesi");
    if (ovRes.ok) {
      overrideReq = ovRes.data;
    } else {
      warnings.push("Override target kebutuhan sesi rusak dan diabaikan.");
    }
  }

  const updatedAt =
    typeof obj.updatedAt === "string" && obj.updatedAt.trim()
      ? obj.updatedAt
      : new Date().toISOString();

  return {
    id: "current",
    activeRequirementId: reqId,
    config,
    updatedAt,
    ...(overrideReq ? { activeRequirementOverride: overrideReq } : {}),
  };
}

export async function hydrateOrSeedDatabase(
  dbName = OPEN_FORMUL_DB_NAME,
): Promise<HydratedDatabaseState> {
  if (!isIndexedDbAvailable()) {
    return createDefaultState("memory", [
      "IndexedDB tidak tersedia pada lingkungan ini; berjalan dalam mode memori sementara.",
    ]);
  }

  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    const [rawIngs, rawReqs, rawRecipes, rawSession, rawPrefs] = await Promise.all([
      db.getAll("ingredients"),
      db.getAll("requirements"),
      db.getAll("recipes"),
      db.get("active_session", "current"),
      db.get("preferences", "user"),
    ]);

    if (rawIngs.length === 0 && rawReqs.length === 0 && rawSession === undefined) {
      return await seedDatabase(db, { includeRecipesAndPrefs: true });
    }

    const warnings: string[] = [];

    const validIngredients: Ingredient[] = [];
    for (const row of rawIngs) {
      const check = validateIngredient(row);
      if (check.ok) {
        validIngredients.push(check.data);
      } else {
        warnings.push(`Data bahan korup dilewati (${check.errors[0] ?? "tidak valid"}).`);
      }
    }

    const validRequirements: Requirement[] = [];
    for (const row of rawReqs) {
      const check = validateRequirement(row);
      if (check.ok) {
        validRequirements.push(check.data);
      } else {
        warnings.push(`Standar kebutuhan korup dilewati (${check.errors[0] ?? "tidak valid"}).`);
      }
    }

    const validRecipes: Recipe[] = [];
    for (const row of rawRecipes) {
      const check = validateFeedJson(row);
      if (check.ok) {
        validRecipes.push(check.data);
      } else {
        warnings.push(`Resep tersimpan korup dilewati (${check.errors[0] ?? "tidak valid"}).`);
      }
    }

    const seedById = new Map(MOCK_INGREDIENTS.map((ing) => [ing.id, ing]));
    const finalIngredients: readonly Ingredient[] =
      validIngredients.length > 0
        ? validIngredients.map((ing) => {
            if (ing.nutrients["betn"] !== undefined) return ing;
            const seed = seedById.get(ing.id);
            if (!seed || seed.nutrients["betn"] === undefined) return ing;
            return {
              ...ing,
              nutrients: {
                ...ing.nutrients,
                betn: seed.nutrients["betn"],
              },
            };
          })
        : MOCK_INGREDIENTS;
    let finalRequirements: readonly Requirement[] =
      validRequirements.length > 0 ? validRequirements : MOCK_REQUIREMENTS;
    if (validRequirements.length > 0) {
      const existingReqIds = new Set(validRequirements.map((r) => r.id));
      const missingSni = SNI_REQUIREMENTS.filter((r) => !existingReqIds.has(r.id));
      if (missingSni.length > 0) {
        finalRequirements = [...validRequirements, ...missingSni];
      }
    }
    if (validIngredients.length === 0 && rawIngs.length > 0) {
      warnings.push("Seluruh data bahan korup; katalog awal dipulihkan.");
    }
    if (validRequirements.length === 0 && rawReqs.length > 0) {
      warnings.push("Seluruh standar kebutuhan korup; preset bawaan dipulihkan.");
    }

    const activeSession = parseSessionRecord(rawSession, finalRequirements[0]!.id, warnings);

    let preferences = DEFAULT_PREFERENCES;
    if (rawPrefs !== undefined) {
      const prefCheck = validateUserPreferences(rawPrefs);
      if (prefCheck.ok) {
        preferences = prefCheck.data;
      } else {
        warnings.push("Preferensi pengguna rusak dan dipulihkan ke standar.");
      }
    }

    return {
      ingredients: finalIngredients,
      requirements: finalRequirements,
      savedRecipes: validRecipes,
      activeSession,
      preferences,
      storageMode: "indexeddb",
      warnings,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuka IndexedDB";
    return createDefaultState("memory", [
      `IndexedDB tidak dapat diakses (${message}); memakai mode memori sementara.`,
    ]);
  } finally {
    db?.close();
  }
}

export async function saveIngredientsToDb(
  items: readonly Ingredient[],
  dbName = OPEN_FORMUL_DB_NAME,
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    const tx = db.transaction("ingredients", "readwrite");
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  } catch {
    // Graceful no-op pada lingkungan privat / kuota penuh
  } finally {
    db?.close();
  }
}

export async function saveRequirementsToDb(
  items: readonly Requirement[],
  dbName = OPEN_FORMUL_DB_NAME,
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    const tx = db.transaction("requirements", "readwrite");
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  } catch {
    // Graceful no-op
  } finally {
    db?.close();
  }
}

export async function saveRecipesToDb(
  items: readonly Recipe[],
  dbName = OPEN_FORMUL_DB_NAME,
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    const tx = db.transaction("recipes", "readwrite");
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  } catch {
    // Graceful no-op
  } finally {
    db?.close();
  }
}

export async function saveActiveSessionToDb(
  session: ActiveSessionRecord,
  dbName = OPEN_FORMUL_DB_NAME,
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    await db.put("active_session", session, "current");
  } catch {
    // Graceful no-op
  } finally {
    db?.close();
  }
}

export async function savePreferencesToDb(
  prefs: UserPreferences,
  dbName = OPEN_FORMUL_DB_NAME,
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    await db.put("preferences", prefs, "user");
  } catch {
    // Graceful no-op
  } finally {
    db?.close();
  }
}

export function estimateSnapshotBytes(snapshot: {
  readonly ingredients: readonly Ingredient[];
  readonly requirements: readonly Requirement[];
  readonly savedRecipes: readonly Recipe[];
  readonly preferences: UserPreferences;
}): number {
  const json = JSON.stringify(snapshot);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(json).length;
  }
  return json.length;
}

export async function getStorageStatsFromDb(dbName = OPEN_FORMUL_DB_NAME): Promise<StorageStats> {
  if (!isIndexedDbAvailable()) {
    return {
      storageMode: "memory",
      ingredientCount: MOCK_INGREDIENTS.length,
      requirementCount: MOCK_REQUIREMENTS.length,
      recipeCount: MOCK_SAVED_RECIPES.length,
      estimatedBytes: estimateSnapshotBytes({
        ingredients: MOCK_INGREDIENTS,
        requirements: MOCK_REQUIREMENTS,
        savedRecipes: MOCK_SAVED_RECIPES,
        preferences: DEFAULT_PREFERENCES,
      }),
    };
  }

  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    const [ingredients, requirements, savedRecipes, prefs] = await Promise.all([
      db.getAll("ingredients"),
      db.getAll("requirements"),
      db.getAll("recipes"),
      db.get("preferences", "user"),
    ]);
    return {
      storageMode: "indexeddb",
      ingredientCount: ingredients.length,
      requirementCount: requirements.length,
      recipeCount: savedRecipes.length,
      estimatedBytes: estimateSnapshotBytes({
        ingredients,
        requirements,
        savedRecipes,
        preferences: prefs ?? DEFAULT_PREFERENCES,
      }),
    };
  } catch {
    return {
      storageMode: "memory",
      ingredientCount: MOCK_INGREDIENTS.length,
      requirementCount: MOCK_REQUIREMENTS.length,
      recipeCount: MOCK_SAVED_RECIPES.length,
      estimatedBytes: 0,
    };
  } finally {
    db?.close();
  }
}

export async function resetAllSampleData(
  dbName = OPEN_FORMUL_DB_NAME,
): Promise<HydratedDatabaseState> {
  if (!isIndexedDbAvailable()) {
    return createDefaultState("memory");
  }

  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    return await seedDatabase(db, { includeRecipesAndPrefs: false });
  } catch {
    return createDefaultState("memory");
  } finally {
    db?.close();
  }
}

export async function clearAllUserData(
  dbName = OPEN_FORMUL_DB_NAME,
): Promise<HydratedDatabaseState> {
  if (!isIndexedDbAvailable()) {
    return createDefaultState("memory");
  }

  let db: IDBPDatabase<OpenFormulDbSchema> | null = null;
  try {
    db = await openOpenFormulDb(dbName);
    const tx = db.transaction(
      ["ingredients", "requirements", "recipes", "active_session", "preferences"],
      "readwrite",
    );
    await Promise.all([
      tx.objectStore("ingredients").clear(),
      tx.objectStore("requirements").clear(),
      tx.objectStore("recipes").clear(),
      tx.objectStore("active_session").clear(),
      tx.objectStore("preferences").clear(),
    ]);
    await tx.done;
    return await seedDatabase(db, { includeRecipesAndPrefs: true });
  } catch {
    return createDefaultState("memory");
  } finally {
    db?.close();
  }
}
