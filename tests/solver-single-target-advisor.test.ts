import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
} from "../src/data/mock-state";
import {
  buildLpModel,
  detectNutrientGaps,
  getIndonesiaAvailabilityTier,
  isUpperBoundOnlyNutrient,
  recommendIngredientsForGaps,
  resolveEffectiveConstraintBounds,
  resolveSingleTargetValue,
  solveFormulationWithRunner,
} from "../src/solver";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import type { FormulationConfig, Ingredient, Requirement } from "../src/types";
import { computeDynamicBeefRequirement } from "../src/utils/cattle-requirements";
import { validateFormulationConfig } from "../src/utils/validators";

describe("Mode Pendekatan 1 Angka (Single-Target Precision) & Saran Bahan Indonesia", () => {
  it("mengenali batas maksimal khusus SK (cf) dan mengonversi batas efektif Range vs Single dengan akurat", () => {
    expect(isUpperBoundOnlyNutrient("cf")).toBe(true);
    expect(isUpperBoundOnlyNutrient("tannin")).toBe(true);
    expect(isUpperBoundOnlyNutrient("cp")).toBe(false);
    expect(isUpperBoundOnlyNutrient("cp", { max: 18 })).toBe(true);

    const cpRange = { nutrientId: "cp", min: 20, max: 22, idealTarget: 21 };
    expect(resolveSingleTargetValue(cpRange)).toBe(21);
    expect(resolveEffectiveConstraintBounds(cpRange, false)).toEqual({ min: 20, max: 22 });
    expect(resolveEffectiveConstraintBounds(cpRange, true)).toEqual({ min: 21 });

    const cfMax = { nutrientId: "cf", max: 5, idealTarget: 4 };
    expect(resolveSingleTargetValue(cfMax)).toBe(5);
    expect(resolveEffectiveConstraintBounds(cfMax, true)).toEqual({ max: 5 });
  });

  it("HiGHS Live: Mode 1 Angka menghasilkan formula Optimal, SK ketat <= target namun tetap mendekati target", async () => {
    const req: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "cp", min: 20, enabled: true },
        { nutrientId: "me_poultry", min: 2950, enabled: true },
        { nutrientId: "cf", max: 5.5, enabled: true },
        { nutrientId: "ca", min: 0.9, max: 1.05, idealTarget: 0.95, enabled: true },
        { nutrientId: "p", min: 0.65, max: 0.8, idealTarget: 0.7, enabled: true },
      ],
    };

    const rangeCfg: FormulationConfig = {
      ...DEFAULT_CONFIG,
      optimizationMode: 1,
      targetInputMode: "range",
      enableElasticFallback: false,
    };
    const singleCfg: FormulationConfig = {
      ...DEFAULT_CONFIG,
      optimizationMode: 1,
      targetInputMode: "single",
      enableElasticFallback: false,
    };

    const [rangeRes, singleRes] = await Promise.all([
      solveFormulationWithRunner(MOCK_INGREDIENTS, req, rangeCfg, solveLpInNode),
      solveFormulationWithRunner(MOCK_INGREDIENTS, req, singleCfg, solveLpInNode),
    ]);

    expect(rangeRes.status).toBe("optimal");
    expect(singleRes.status).toBe("optimal");

    // Verifikasi kesetimbangan massa & SK tidak pernah melebihi batas maksimal 5.5%
    const sumFrac = singleRes.composition.reduce((acc, item) => acc + item.fraction, 0);
    expect(Math.abs(sumFrac - 1)).toBeLessThan(1e-6);

    const cpSingle = singleRes.nutrients.find((n) => n.nutrientId === "cp")!;
    const cfSingle = singleRes.nutrients.find((n) => n.nutrientId === "cf")!;
    const cfRange = rangeRes.nutrients.find((n) => n.nutrientId === "cf")!;
    const caSingle = singleRes.nutrients.find((n) => n.nutrientId === "ca")!;

    expect(cpSingle.status).toBe("met");
    expect(cpSingle.value).toBeGreaterThanOrEqual(20 - 1e-6);
    expect(cfSingle.status).toBe("met");
    expect(cfSingle.value).toBeLessThanOrEqual(5.5 + 1e-6);
    // Pendekatan 1 angka membawa SK lebih dekat (atau sama dekat) ke batas 5.5% tanpa melampauinya
    expect(cfSingle.value).toBeGreaterThanOrEqual(cfRange.value - 1e-4);
    // Ca mendekati 0.95 (tidak melompat jauh)
    expect(caSingle.value).toBeGreaterThanOrEqual(0.95 - 1e-6);
  });

  it("HiGHS Live: menolak SK melampaui batas maksimal (infeasible bila toleransi nonaktif, near_feasible bila aktif)", async () => {
    const highFiberOnly: readonly Ingredient[] = MOCK_INGREDIENTS.map((ing) => {
      const active = ing.id === "rice-bran" || ing.id === "palm-kernel-meal";
      return {
        ...ing,
        isActive: active,
        ...(active ? { inclusion: { min: 0, max: 100 } } : {}),
      };
    });

    const strictReq: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "cp", min: 14, enabled: true },
        { nutrientId: "cf", max: 5, enabled: true }, // Kedua bahan aktif punya SK >= 11%
      ],
      ratios: [],
    };

    const hardRes = await solveFormulationWithRunner(
      highFiberOnly,
      strictReq,
      { ...DEFAULT_CONFIG, targetInputMode: "single", enableElasticFallback: false },
      solveLpInNode,
    );
    expect(hardRes.status).toBe("infeasible");

    const flexRes = await solveFormulationWithRunner(
      highFiberOnly,
      strictReq,
      { ...DEFAULT_CONFIG, targetInputMode: "single", enableElasticFallback: true },
      solveLpInNode,
    );
    expect(flexRes.status).toBe("near_feasible");
    const cfRes = flexRes.nutrients.find((n) => n.nutrientId === "cf")!;
    expect(cfRes.status).toBe("above_max");
  });

  it("Algoritma Saran Bahan memprioritaskan bahan mudah didapat di Indonesia, sesuai spesies, & patuh penolakan", async () => {
    // Cek klasifikasi ketersediaan lokal Indonesia
    const sbm = MOCK_INGREDIENTS.find((i) => i.id === "sbm-44")!;
    const cobalt = MOCK_INGREDIENTS.find((i) => i.id === "hartadi-t15-017");
    const snail = MOCK_INGREDIENTS.find((i) => i.id === "hartadi-t12-0001");
    expect(getIndonesiaAvailabilityTier(sbm)).toBe("high");
    if (cobalt) expect(getIndonesiaAvailabilityTier(cobalt)).toBe("low");
    if (snail) expect(getIndonesiaAvailabilityTier(snail)).toBe("low");

    // Skenario unggas kekurangan protein: hanya aktifkan Jagung & Dedak Padi (PK <= 12%, target 21%)
    const lowProteinPool: readonly Ingredient[] = MOCK_INGREDIENTS.map((ing) => ({
      ...ing,
      isActive: ing.id === "corn-ground" || ing.id === "rice-bran",
    }));

    const req = MOCK_REQUIREMENTS[0]!; // Broiler Starter (PK >= 21%)
    const cfg: FormulationConfig = {
      ...DEFAULT_CONFIG,
      targetInputMode: "single",
      enableElasticFallback: true,
    };

    const res = await solveFormulationWithRunner(lowProteinPool, req, cfg, solveLpInNode);

    const suggestions = recommendIngredientsForGaps(lowProteinPool, req, cfg, res, MOCK_NUTRIENTS);

    expect(suggestions.length).toBeGreaterThan(0);
    // Prioritas teratas wajib bahan mudah didapat di Indonesia (bukan bekicot / reagen)
    expect(suggestions[0]!.availabilityTier).toBe("high");
    expect(suggestions.some((s) => s.ingredient.id === "hartadi-t12-0001")).toBe(false);
    // Tidak menyarankan hijauan segar (rumput gajah/jerami) untuk ayam broiler
    expect(suggestions.every((s) => s.ingredient.category !== "forage")).toBe(true);

    // Saat pengguna memilih "Tidak" (dismiss), bahan tsb tidak disarankan lagi
    const dismissedId = suggestions[0]!.ingredient.id;
    const afterDismiss = recommendIngredientsForGaps(
      lowProteinPool,
      req,
      cfg,
      res,
      MOCK_NUTRIENTS,
      { dismissedIds: new Set([dismissedId]) },
    );
    expect(afterDismiss.some((s) => s.ingredient.id === dismissedId)).toBe(false);
  });

  it("Validator FormulationConfig menyimpan & memvalidasi targetInputMode dengan aman", () => {
    const validSingle = validateFormulationConfig({
      ...DEFAULT_CONFIG,
      targetInputMode: "single",
    });
    expect(validSingle.ok).toBe(true);
    if (validSingle.ok) {
      expect(validSingle.data.targetInputMode).toBe("single");
    }

    const validRange = validateFormulationConfig({
      ...DEFAULT_CONFIG,
      targetInputMode: "range",
    });
    expect(validRange.ok).toBe(true);
    if (validRange.ok) {
      expect(validRange.data.targetInputMode).toBe("range");
    }
  });

  it("Advisor Infeasible: memakai knapsack extrema batas inklusi dan mencegah duplikat keluarga bahan yang sudah aktif", async () => {
    // Tepung ikan aktif namun dibatasi Max 5%, sehingga PK max achievable jauh di bawah 21% meski cp bahan 55%
    const cappedPool: readonly Ingredient[] = MOCK_INGREDIENTS.map((ing) => {
      if (ing.id === "corn-ground") {
        return { ...ing, isActive: true, inclusion: { min: 0, max: 100 } };
      }
      if (ing.id === "rice-bran") {
        return { ...ing, isActive: true, inclusion: { min: 0, max: 100 } };
      }
      if (ing.id === "fish-meal-local") {
        return { ...ing, isActive: true, inclusion: { min: 0, max: 5 } };
      }
      if (ing.id === "limestone") {
        return { ...ing, isActive: true, inclusion: { min: 0, max: 3 } };
      }
      return { ...ing, isActive: false };
    });

    const req = MOCK_REQUIREMENTS[0]!;
    const cfg: FormulationConfig = {
      ...DEFAULT_CONFIG,
      targetInputMode: "single",
      enableElasticFallback: false,
    };

    const res = await solveFormulationWithRunner(cappedPool, req, cfg, solveLpInNode);
    expect(res.status).toBe("infeasible");

    const gaps = detectNutrientGaps(cappedPool, req, cfg, res);
    expect(gaps.some((g) => g.nutrientId === "cp" && g.direction === "increase")).toBe(true);

    const suggestions = recommendIngredientsForGaps(cappedPool, req, cfg, res, MOCK_NUTRIENTS, {
      maxSuggestions: 5,
    });
    expect(suggestions.length).toBeGreaterThan(0);
    // Wajib menyarankan sumber protein (mis. SBM), tidak menduplikasi jagung kuning / tepung ikan / kapur aktif
    expect(suggestions.some((s) => s.ingredient.id === "sbm-44")).toBe(true);
    expect(
      suggestions.some(
        (s) =>
          s.ingredient.id === "hartadi-jagung-kuning-bk" ||
          s.ingredient.id === "hartadi-t12-0491" ||
          s.ingredient.id === "hartadi-t15-009" ||
          s.ingredient.name.toLowerCase().includes("tepung ikan"),
      ),
    ).toBe(false);
  });

  it("Ruminansia (Sapi Potong BK) Mode 1 Angka: saran bahan sesuai spesies, bebas tepung ikan/daging hewani & bebas duplikat rumput gajah", async () => {
    const dynamicBeef = computeDynamicBeefRequirement({
      bodyWeightKg: 300,
      adgKgPerDay: 0.9,
      physiologicalState: "growth",
    }).requirement;

    // Hanya aktifkan Rumput Gajah + Jerami Padi -> defisit TDN & PK untuk PBBH 0.9 kg/hr
    const forageOnly: readonly Ingredient[] = MOCK_INGREDIENTS.map((ing) => ({
      ...ing,
      isActive: ing.id === "napier-grass" || ing.id === "hartadi-jerami-padi",
    }));

    const cfg: FormulationConfig = {
      ...DEFAULT_CONFIG,
      activeBasis: "dry_matter",
      targetInputMode: "single",
      enableElasticFallback: true,
    };

    const res = await solveFormulationWithRunner(forageOnly, dynamicBeef, cfg, solveLpInNode);
    const suggestions = recommendIngredientsForGaps(
      forageOnly,
      dynamicBeef,
      cfg,
      res,
      MOCK_NUTRIENTS,
      { maxSuggestions: 5 },
    );

    expect(suggestions.length).toBeGreaterThan(0);
    // Tidak boleh menduplikasi Rumput Gajah Hartadi saat napier-grass sudah aktif
    expect(suggestions.some((s) => s.ingredient.id === "hartadi-rumput-gajah")).toBe(false);
    // Tidak boleh menyarankan tepung ikan (termasuk varian koma), daging hewan, darah, kepiting, atau baris tanpa nama
    expect(
      suggestions.some((s) =>
        /tepung[\s,]+ikan|darah hewan|tepung daging,\s*sisa|kepiting|^\(\d+\)$/i.test(
          s.ingredient.name,
        ),
      ),
    ).toBe(false);
    // Bahan teratas tetap prioritas mudah didapat di Indonesia
    expect(suggestions[0]!.availabilityTier).toBe("high");
  });

  it("Mode 1 Angka mempromosikan batas maksimal SK (cf) minimal ke tier1 walau preset menandainya tier2", () => {
    const reqWithTier2Cf: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "cp", min: 21, tier: "tier2", enabled: true },
        { nutrientId: "cf", max: 5, tier: "tier2", enabled: true },
      ],
      ratios: [],
    };
    const model = buildLpModel(
      MOCK_INGREDIENTS,
      reqWithTier2Cf,
      { ...DEFAULT_CONFIG, targetInputMode: "single", enableElasticFallback: true },
      { elastic: true },
    );
    const cfRow = model.rows.find(
      (r) => r.meta.kind === "nutrient_max" && r.meta.nutrientId === "cf",
    );
    const cpRow = model.rows.find(
      (r) => r.meta.kind === "nutrient_min" && r.meta.nutrientId === "cp",
    );
    const cfSlack = model.variables.find((v) => v.varName === cfRow?.slackPosVar);
    const cpSlack = model.variables.find((v) => v.varName === cpRow?.slackNegVar);

    expect(cfSlack).toBeDefined();
    expect(cpSlack).toBeDefined();
    // Penalti tier1 (1e8 / 5) jauh lebih tinggi dibanding tier2 (1e6 / 21)
    expect(cfSlack!.objectiveCoeff).toBeGreaterThan(cpSlack!.objectiveCoeff * 50);
  });
});
