import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_INGREDIENTS, MOCK_REQUIREMENTS, MOCK_SAVED_RECIPES } from "../src/data/mock-state";
import { usePrototypeStore } from "../src/hooks/use-prototype-store";
import {
  clearAllUserData,
  getStorageStatsFromDb,
  hydrateOrSeedDatabase,
  OPEN_FORMUL_DB_NAME,
  resetAllSampleData,
  saveActiveSessionToDb,
  saveIngredientsToDb,
  savePreferencesToDb,
  saveRecipesToDb,
} from "../src/storage";
import { serializeRecipeToFeedJson } from "../src/storage/recipeTransfer";
import { parseAndMergeIngredientsCsv } from "../src/utils/ingredientCsvImport";

function makeUniqueDbName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("Task 3 — IndexedDB Persistence & Non-Destructive Store Integration (STG-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("membuat DB v1 dengan 5 object store & melakukan seed idempoten dataset bawaan termasuk Hartadi + Kearl", async () => {
    const dbName = makeUniqueDbName("openformul-seed");
    const first = await hydrateOrSeedDatabase(dbName);

    expect(first.storageMode).toBe("indexeddb");
    expect(first.ingredients.length).toBe(MOCK_INGREDIENTS.length);
    expect(first.requirements.length).toBe(MOCK_REQUIREMENTS.length);
    expect(first.savedRecipes.length).toBe(MOCK_SAVED_RECIPES.length);

    const rawDb = await openDB(dbName, 1);
    expect(Array.from(rawDb.objectStoreNames).sort()).toEqual([
      "active_session",
      "ingredients",
      "preferences",
      "recipes",
      "requirements",
    ]);
    rawDb.close();

    // Panggilan kedua idempoten — tidak menggandakan record
    const second = await hydrateOrSeedDatabase(dbName);
    expect(second.ingredients.length).toBe(MOCK_INGREDIENTS.length);
    expect(second.requirements.length).toBe(MOCK_REQUIREMENTS.length);
    expect(second.savedRecipes.length).toBe(MOCK_SAVED_RECIPES.length);
  });

  it("menyimpan & memuat ulang perubahan bahan, sesi aktif (override), resep, dan preferensi lintas instansi DB", async () => {
    const dbName = makeUniqueDbName("openformul-persist");
    const initial = await hydrateOrSeedDatabase(dbName);

    const modifiedIngredients = initial.ingredients.map((item) =>
      item.id === "corn-ground" ? { ...item, priceOverride: 6250 } : item,
    );
    await saveIngredientsToDb(modifiedIngredients, dbName);

    await savePreferencesToDb(
      { ...initial.preferences, language: "en", theme: "dark", defaultBatchKg: 250 },
      dbName,
    );

    const customReqOverride = {
      ...initial.requirements[0]!,
      name: "Target Sesi Kustom Broiler",
    };
    await saveActiveSessionToDb(
      {
        id: "current",
        activeRequirementId: initial.activeSession.activeRequirementId,
        activeRequirementOverride: customReqOverride,
        config: { ...initial.activeSession.config, batchSizeKg: 250 },
        updatedAt: "2026-11-15T10:00:00.000Z",
      },
      dbName,
    );

    const customRecipe = {
      ...MOCK_SAVED_RECIPES[0]!,
      id: "recipe-user-custom-1",
      name: "Formula Pengguna Khusus",
    };
    await saveRecipesToDb([...initial.savedRecipes, customRecipe], dbName);

    const reloaded = await hydrateOrSeedDatabase(dbName);
    expect(reloaded.ingredients.find((i) => i.id === "corn-ground")?.priceOverride).toBe(6250);
    expect(reloaded.preferences.language).toBe("en");
    expect(reloaded.preferences.theme).toBe("dark");
    expect(reloaded.activeSession.config.batchSizeKg).toBe(250);
    expect(reloaded.activeSession.activeRequirementOverride?.name).toBe(
      "Target Sesi Kustom Broiler",
    );
    expect(reloaded.savedRecipes.some((r) => r.id === "recipe-user-custom-1")).toBe(true);

    const stats = await getStorageStatsFromDb(dbName);
    expect(stats.storageMode).toBe("indexeddb");
    expect(stats.ingredientCount).toBe(MOCK_INGREDIENTS.length);
    expect(stats.recipeCount).toBe(MOCK_SAVED_RECIPES.length + 1);
    expect(stats.estimatedBytes).toBeGreaterThan(1000);
  });

  it("tahan terhadap record korup di IndexedDB & tetap fallback aman saat indexedDB tidak tersedia", async () => {
    const dbName = makeUniqueDbName("openformul-corrupt");
    await hydrateOrSeedDatabase(dbName);

    // Sisipkan record rusak langsung ke store IndexedDB
    const rawDb = await openDB(dbName, 1);
    await rawDb.put("ingredients", { id: "corrupt-row", name: "", dryMatter: -10, pricePerKg: -5 });
    await rawDb.put("recipes", { id: "corrupt-recipe", schemaVersion: 99, name: "Rusak" });
    rawDb.close();

    const recovered = await hydrateOrSeedDatabase(dbName);
    expect(recovered.ingredients.some((i) => i.id === "corrupt-row")).toBe(false);
    expect(recovered.savedRecipes.some((r) => r.id === "corrupt-recipe")).toBe(false);
    expect(recovered.warnings.length).toBeGreaterThan(0);

    // Fallback aman bila indexedDB tidak tersedia (mode privat / test tanpa shim)
    vi.stubGlobal("indexedDB", undefined);
    const fallback = await hydrateOrSeedDatabase(dbName);
    expect(fallback.storageMode).toBe("memory");
    expect(fallback.ingredients.length).toBe(MOCK_INGREDIENTS.length);
  });

  it("resetAllSampleData menjaga resep tersimpan pengguna, sedangkan clearAllUserData menghapus bersih lalu seed ulang", async () => {
    const dbName = makeUniqueDbName("openformul-reset");
    const seeded = await hydrateOrSeedDatabase(dbName);

    await saveIngredientsToDb(
      seeded.ingredients.map((i) => (i.id === "corn-ground" ? { ...i, priceOverride: 9999 } : i)),
      dbName,
    );
    await saveRecipesToDb(
      [
        ...seeded.savedRecipes,
        {
          ...MOCK_SAVED_RECIPES[0]!,
          id: "user-kept-recipe",
          name: "Resep Tersimpan Milik Peternak",
        },
      ],
      dbName,
    );

    const afterResetSample = await resetAllSampleData(dbName);
    expect(
      afterResetSample.ingredients.find((i) => i.id === "corn-ground")?.priceOverride,
    ).toBeUndefined();
    expect(afterResetSample.savedRecipes.some((r) => r.id === "user-kept-recipe")).toBe(true);

    const afterClearAll = await clearAllUserData(dbName);
    expect(afterClearAll.savedRecipes.some((r) => r.id === "user-kept-recipe")).toBe(false);
    expect(afterClearAll.savedRecipes.length).toBe(MOCK_SAVED_RECIPES.length);
  });

  it("usePrototypeStore: memuat resep secara non-destruktif (backup snapshot 1A), impor .feed.json tanpa kolisi ID, partial CSV merge, & reset priceOverride bersih", async () => {
    await clearAllUserData(OPEN_FORMUL_DB_NAME);

    const { result } = renderHook(() => usePrototypeStore());

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    expect(result.current.storageMode).toBe("indexeddb");

    // 1. Modifikasi sesi aktif pengguna dulu agar trigger snapshot backup 1A saat loadRecipe dipanggil
    act(() => {
      result.current.updateIngredient("corn-ground", { priceOverride: 6150 });
    });
    const customFeedJson = serializeRecipeToFeedJson({
      ...MOCK_SAVED_RECIPES[0]!,
      id: "recipe-broiler-hemat", // sengaja tabrakan ID dengan resep bawaan
      name: "Formula Broiler Kiriman Konsultan",
      ingredients: [
        {
          ...MOCK_INGREDIENTS[0]!,
          id: "corn-ground",
          pricePerKg: 5800,
          isActive: true,
        },
        {
          ...MOCK_INGREDIENTS[1]!,
          id: "sbm-44",
          pricePerKg: 11200,
          isActive: true,
        },
      ],
      requirement: {
        ...MOCK_REQUIREMENTS[0]!,
        constraints: MOCK_REQUIREMENTS[0]!.constraints.map((c) =>
          c.nutrientId === "cp" ? { ...c, min: 22.5 } : c,
        ),
      },
    });

    // 2. Impor .feed.json -> harus menghasilkan ID unik baru dan masuk daftar resep
    let importOutcome: ReturnType<typeof result.current.importFeedJson> | undefined;
    act(() => {
      importOutcome = result.current.importFeedJson(customFeedJson);
    });
    expect(importOutcome?.ok).toBe(true);
    if (importOutcome?.ok) {
      expect(importOutcome.data.wasIdRenamed).toBe(true);
      expect(importOutcome.data.recipe.id).not.toBe("recipe-broiler-hemat");
    }
    const importedId = importOutcome?.ok ? importOutcome.data.recipe.id : "";

    // 3. loadRecipe (1A):
    // - buat auto-backup sesi aktif sebelum diganti
    // - jangan hapus bahan katalog lain (jadikan isActive: false)
    // - jangan timpa preset induk MOCK_REQUIREMENTS[0] ("broiler-starter")
    const countBeforeLoad = result.current.recipes.length;
    act(() => {
      result.current.loadRecipe(importedId);
    });

    expect(result.current.recipes.length).toBeGreaterThanOrEqual(countBeforeLoad + 1);
    expect(result.current.recipes.some((r) => r.name.includes("Backup Sesi"))).toBe(true);
    expect(result.current.ingredients.length).toBe(MOCK_INGREDIENTS.length);
    expect(result.current.ingredients.find((i) => i.id === "fish-meal-local")?.isActive).toBe(
      false,
    );
    expect(
      result.current.activeRequirement.constraints.find((c) => c.nutrientId === "cp")?.min,
    ).toBe(22.5);

    // Pastikan preset master tetap utuh saat kembali memilih preset broiler-starter
    act(() => {
      result.current.selectPreset("broiler-starter");
    });
    expect(
      result.current.activeRequirement.constraints.find((c) => c.nutrientId === "cp")?.min,
    ).toBe(21);

    // 4. resetPriceOverride tidak meninggalkan key `priceOverride: undefined`
    act(() => {
      result.current.updateIngredient("corn-ground", { priceOverride: 6300 });
    });
    expect("priceOverride" in result.current.ingredients.find((i) => i.id === "corn-ground")!).toBe(
      true,
    );
    act(() => {
      result.current.resetPriceOverride("corn-ground");
    });
    const cornReset = result.current.ingredients.find((i) => i.id === "corn-ground")!;
    expect("priceOverride" in cornReset).toBe(false);

    // 5. Partial CSV merge import via store
    const csvResult = parseAndMergeIngredientsCsv(
      "Nama Bahan;Harga/kg;BK %;PK (%)\nJagung Giling Kuning;5.750;88,5;9,1",
      result.current.ingredients,
    );
    expect(csvResult.errors).toEqual([]);
    act(() => {
      result.current.importIngredients(csvResult.ingredients);
    });
    const cornAfterCsv = result.current.ingredients.find((i) => i.id === "corn-ground")!;
    expect(cornAfterCsv.pricePerKg).toBe(5750);
    expect(cornAfterCsv.nutrients.lys).toBe(0.26);
  });
});
