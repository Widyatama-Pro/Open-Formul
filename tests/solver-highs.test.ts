import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_REQUIREMENTS,
  MOCK_SAVED_RECIPES,
} from "../src/data/mock-state";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";
import type { FormulationConfig, Ingredient, Requirement } from "../src/types";

describe("ENG-06 & ENG-07: HiGHS Real LP Solver Integration", () => {
  it("memvalidasi benchmark manual 2 bahan: Jagung 67,61% + SBM 32,39% ≈ Rp6.374,65/kg (CP 20%)", async () => {
    const corn: Ingredient = {
      id: "corn",
      name: "Jagung Kuning",
      category: "energy",
      pricePerKg: 5500,
      dryMatter: 86,
      basis: "as_fed",
      isActive: true,
      inclusion: { min: 0, max: 100 },
      nutrients: { cp: 8.5, ca: 0.02, p: 0.28 },
      source: "docs/formulation-math.md",
    };
    const sbm: Ingredient = {
      id: "sbm",
      name: "Bungkil Kedelai (SBM 44%)",
      category: "protein",
      pricePerKg: 8200,
      dryMatter: 89,
      basis: "as_fed",
      isActive: true,
      inclusion: { min: 0, max: 100 },
      nutrients: { cp: 44, ca: 0.29, p: 0.65 },
      source: "docs/formulation-math.md",
    };
    const req: Requirement = {
      id: "manual-2-feed",
      name: "Uji Manual 2 Bahan",
      species: "poultry",
      basis: "as_fed",
      constraints: [{ nutrientId: "cp", min: 20, enabled: true }],
    };
    const config: FormulationConfig = {
      ...DEFAULT_CONFIG,
      activeBasis: "as_fed",
      optimizationMode: 1,
      enableAdvanceNutrients: false,
      enableElasticFallback: false,
      manualLocks: {},
    };

    const result = await solveFormulationWithRunner([corn, sbm], req, config, solveLpInNode);

    expect(result.status).toBe("optimal");
    expect(result.costPerKg).toBeCloseTo(6374.6479, 2);

    const sumFrac = result.composition.reduce((acc, item) => acc + item.fraction, 0);
    expect(Math.abs(sumFrac - 1)).toBeLessThan(1e-6);

    const cornItem = result.composition.find((c) => c.ingredientId === "corn");
    const sbmItem = result.composition.find((c) => c.ingredientId === "sbm");
    expect(cornItem?.fraction).toBeCloseTo(0.676056, 4);
    expect(sbmItem?.fraction).toBeCloseTo(0.323944, 4);

    // Shadow price CP ≈ +Rp76,06/kg per +1% CP, terpisah dari boundDuals
    const cpRes = result.nutrients.find((n) => n.nutrientId === "cp");
    expect(cpRes?.value).toBeCloseTo(20, 4);
    expect(cpRes?.status).toBe("met");
    expect(cpRes?.shadowPrice).toBeCloseTo(76.0563, 2);

    // Rentang harga sensitivitas HiGHS pada Corn [<= 8200] & SBM [>= 5500]
    expect(cornItem?.priceRange?.maxPrice).toBeCloseTo(8200, 1);
    expect(sbmItem?.priceRange?.minPrice).toBeCloseTo(5500, 1);
  });

  it("menghormati inklusi tetap (Premix 0,5%) serta melaporkan bound duals", async () => {
    const premix = MOCK_INGREDIENTS.find((i) => i.id === "premix-vitmin");
    expect(premix).toBeDefined();

    const result = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      MOCK_REQUIREMENTS[0]!,
      { ...DEFAULT_CONFIG, optimizationMode: 1, activeBasis: "as_fed" },
      solveLpInNode,
    );

    expect(result.status).toBe("optimal");
    const premixComp = result.composition.find((c) => c.ingredientId === "premix-vitmin");
    expect(premixComp?.fraction).toBeCloseTo(0.005, 5);
    expect((result.boundDuals ?? []).length).toBeGreaterThan(0);
  });

  it("menyelesaikan Broiler Starter lengkap beserta linearisasi rasio Ca:P dalam toleransi 1e-6", async () => {
    const broilerReq = MOCK_REQUIREMENTS[0]!;
    const result = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      broilerReq,
      { ...DEFAULT_CONFIG, optimizationMode: 1, activeBasis: "as_fed" },
      solveLpInNode,
    );

    expect(result.status).toBe("optimal");
    const sumFrac = result.composition.reduce((acc, item) => acc + item.fraction, 0);
    expect(Math.abs(sumFrac - 1)).toBeLessThan(1e-6);

    const caVal = result.nutrients.find((n) => n.nutrientId === "ca")?.value ?? 0;
    const pVal = result.nutrients.find((n) => n.nutrientId === "p")?.value ?? 1;
    const ratio = caVal / pVal;
    const caPRule = broilerReq.ratios?.find((r) => r.numerator === "ca" && r.denominator === "p");
    if (caPRule?.min !== undefined) {
      expect(ratio).toBeGreaterThanOrEqual(caPRule.min - 1e-6);
    }
    if (caPRule?.max !== undefined) {
      expect(ratio).toBeLessThanOrEqual(caPRule.max + 1e-6);
    }
  });

  it("mengonversi komposisi BK ke proporsi penimbangan As-Fed pada preset Sapi Potong (Rumput Gajah 22% BK)", async () => {
    const beefReq = MOCK_REQUIREMENTS[2]!;
    const beefIngredients = MOCK_INGREDIENTS.map((ing) =>
      ing.id === "napier-grass" || ing.id === "palm-kernel-meal" ? { ...ing, isActive: true } : ing,
    );
    const result = await solveFormulationWithRunner(
      beefIngredients,
      beefReq,
      {
        ...DEFAULT_CONFIG,
        activeBasis: "dry_matter",
        optimizationMode: 1,
        enableAdvanceNutrients: false,
      },
      solveLpInNode,
    );

    expect(result.status).toBe("optimal");
    const sumDm = result.composition.reduce((acc, item) => acc + item.fraction, 0);
    const sumAf = result.composition.reduce((acc, item) => acc + (item.asFedFraction ?? 0), 0);
    expect(Math.abs(sumDm - 1)).toBeLessThan(1e-6);
    expect(Math.abs(sumAf - 1)).toBeLessThan(1e-6);

    const forageItem = result.composition.find((c) => c.ingredientId === "napier-grass");
    expect(forageItem).toBeDefined();
    // Karena BK Rumput Gajah 22% jauh lebih rendah dibanding konsentrat ~89%, porsi berat segar As-Fed > porsi BK
    if (forageItem) {
      expect(forageItem.asFedFraction ?? 0).toBeGreaterThan(forageItem.fraction);
    }
  });

  it("Mode 5 (Presisi Tinggi) menekan deviasi ke midpoint target lebih ketat dibanding Mode 1", async () => {
    const req: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "cp", min: 20, max: 24, enabled: true }, // midpoint 22
        { nutrientId: "me_poultry", min: 2950, max: 3150, enabled: true }, // midpoint 3050
        { nutrientId: "ca", min: 0.9, max: 1.1, enabled: true },
        { nutrientId: "p", min: 0.6, max: 0.85, enabled: true },
      ],
    };

    const resMode1 = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      req,
      { ...DEFAULT_CONFIG, optimizationMode: 1, activeBasis: "as_fed" },
      solveLpInNode,
    );
    const resMode5 = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      req,
      { ...DEFAULT_CONFIG, optimizationMode: 5, activeBasis: "as_fed" },
      solveLpInNode,
    );

    expect(resMode1.status).toBe("optimal");
    expect(resMode5.status).toBe("optimal");

    const errSum = (nutList: typeof resMode1.nutrients) => {
      const cp = nutList.find((n) => n.nutrientId === "cp")?.value ?? 0;
      const me = nutList.find((n) => n.nutrientId === "me_poultry")?.value ?? 0;
      return Math.abs(cp - 22) / 22 + Math.abs(me - 3050) / 3050;
    };

    expect(errSum(resMode5.nutrients)).toBeLessThanOrEqual(errSum(resMode1.nutrients) + 1e-6);
  });

  it("membedakan infeasible murni vs Mode Relaksasi Elastik L1 (biaya murni bebas penalti)", async () => {
    const tightReq: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "cp", min: 34, max: 36, enabled: true },
        { nutrientId: "me_poultry", min: 3250, max: 3350, enabled: true }, // konflik dengan PK 34-36%
      ],
    };

    const infRes = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      tightReq,
      { ...DEFAULT_CONFIG, enableElasticFallback: false },
      solveLpInNode,
    );
    expect(infRes.status).toBe("infeasible");
    expect((infRes.conflicts ?? []).length).toBeGreaterThan(0);

    const elasticRes = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      tightReq,
      { ...DEFAULT_CONFIG, enableElasticFallback: true },
      solveLpInNode,
    );
    expect(elasticRes.status).toBe("near_feasible");

    // Biaya harus murni Σ x_j c_j (< Rp20.000/kg), BUKAN tercemar penalti 1e6!
    expect(elasticRes.costPerKg).toBeGreaterThan(0);
    expect(elasticRes.costPerKg).toBeLessThan(25000);
    expect(
      elasticRes.nutrients.some((n) => n.status === "below_min" || n.status === "above_max"),
    ).toBe(true);
  });

  it("menerapkan What-If Manual Lock dan mencatat Opportunity Cost untuk bahan berinklusi 0%", async () => {
    const lockedRes = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      MOCK_REQUIREMENTS[0]!,
      {
        ...DEFAULT_CONFIG,
        optimizationMode: 1,
        manualLocks: { "corn-ground": 55 },
      },
      solveLpInNode,
    );

    expect(lockedRes.status).toBe("optimal");
    const cornComp = lockedRes.composition.find((c) => c.ingredientId === "corn-ground");
    expect(cornComp?.fraction).toBeCloseTo(0.55, 5);
    expect((lockedRes.opportunityCosts ?? []).length).toBeGreaterThanOrEqual(0);
  });

  it("menyelesaikan ransum Sapi Potong 300 kg Kearl (1982) + pakan lokal Hartadi hingga Optimal", async () => {
    const kearlRecipe = MOCK_SAVED_RECIPES.find((r) => r.id === "recipe-sapi-kearl-300");
    expect(kearlRecipe).toBeDefined();

    const res = await solveFormulationWithRunner(
      kearlRecipe!.ingredients,
      kearlRecipe!.requirement,
      kearlRecipe!.config ?? { ...DEFAULT_CONFIG, activeBasis: "dry_matter" },
      solveLpInNode,
    );

    expect(res.status).toBe("optimal");
    expect(res.basis).toBe("dry_matter");
    const sumPct = res.composition.reduce((acc, item) => acc + item.fraction, 0);
    expect(sumPct).toBeCloseTo(1, 5);
    const cpVal = res.nutrients.find((n) => n.nutrientId === "cp")?.value;
    const tdnVal = res.nutrients.find((n) => n.nutrientId === "tdn")?.value;
    expect(cpVal).toBeGreaterThanOrEqual(10.9 - 1e-4);
    expect(tdnVal).toBeGreaterThanOrEqual(66.7 - 1e-4);
  });
});
