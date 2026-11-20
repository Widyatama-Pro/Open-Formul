import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../src/data/mock-state";
import { buildLpModel } from "../src/solver/buildModel";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { resolveActiveConstraints } from "../src/solver/modelHelpers";
import { runPrecheck } from "../src/solver/precheck";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";
import { toLpString } from "../src/solver/toLpString";
import type { FormulationConfig, Ingredient, Requirement } from "../src/types";

function makeTwoFeedFixture(): {
  ingredients: readonly Ingredient[];
  requirement: Requirement;
  config: FormulationConfig;
} {
  const corn: Ingredient = {
    id: "corn",
    name: "Jagung Kuning (99% Khusus / @Mix)",
    category: "energy",
    pricePerKg: 5500,
    dryMatter: 86,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 100 },
    nutrients: { cp: 8.5, ca: 0.02, p: 0.28 },
    source: "Test fixture",
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
    source: "Test fixture",
  };
  const requirement: Requirement = {
    id: "req-test",
    name: "Broiler Uji 2 Bahan",
    species: "poultry",
    phase: "starter",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20, max: 24 },
      { nutrientId: "ca", min: 0.05, max: 0.5 },
      { nutrientId: "p", min: 0.3, max: 0.8 },
    ],
    ratios: [{ id: "ca_p", numerator: "ca", denominator: "p", min: 0.1, max: 1.5 }],
  };
  return {
    ingredients: [corn, sbm],
    requirement,
    config: {
      ...DEFAULT_CONFIG,
      activeBasis: "as_fed",
      optimizationMode: 1,
      enableAdvanceNutrients: false,
      enableDigestibleBasis: false,
      enableElasticFallback: false,
      manualLocks: {},
    },
  };
}

describe("ENG-04: Pre-check Validator (runPrecheck)", () => {
  it("lolos tanpa error untuk preset Broiler Starter bawaan", () => {
    const broilerReq = MOCK_REQUIREMENTS[0]!;
    const res = runPrecheck(MOCK_INGREDIENTS, broilerReq, DEFAULT_CONFIG);
    expect(res.hasErrors).toBe(false);
    expect(res.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("mendeteksi MIN_GT_MAX saat batas inklusi bahan atau constraint nutrien terbalik, serta DM <= 0", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const badIng: Ingredient = {
      ...ingredients[0]!,
      inclusion: { min: 60, max: 40 },
    };
    const resIng = runPrecheck([badIng, ingredients[1]!], requirement, config);
    expect(resIng.hasErrors).toBe(true);
    expect(resIng.diagnostics.some((d) => d.code === "MIN_GT_MAX")).toBe(true);

    const badDm: Ingredient = {
      ...ingredients[0]!,
      dryMatter: 0,
    };
    const resDm = runPrecheck([badDm, ingredients[1]!], requirement, config);
    expect(resDm.hasErrors).toBe(true);
    expect(resDm.diagnostics.some((d) => d.code === "MIN_GT_MAX")).toBe(true);

    const badReq: Requirement = {
      ...requirement,
      constraints: [{ nutrientId: "cp", min: 25, max: 18 }],
    };
    const resNut = runPrecheck(ingredients, badReq, config);
    expect(resNut.hasErrors).toBe(true);
    expect(resNut.diagnostics.some((d) => d.code === "MIN_GT_MAX")).toBe(true);
  });

  it("mendeteksi INCLUSION_SUM_EXCEEDS_100 dan INCLUSION_MAX_UNDER_100", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const overMin: readonly Ingredient[] = [
      { ...ingredients[0]!, inclusion: { min: 65, max: 100 } },
      { ...ingredients[1]!, inclusion: { min: 45, max: 100 } },
    ];
    const resOver = runPrecheck(overMin, requirement, config);
    expect(resOver.hasErrors).toBe(true);
    expect(resOver.diagnostics.some((d) => d.code === "INCLUSION_SUM_EXCEEDS_100")).toBe(true);

    const underMax: readonly Ingredient[] = [
      { ...ingredients[0]!, inclusion: { min: 0, max: 40 } },
      { ...ingredients[1]!, inclusion: { min: 0, max: 50 } },
    ];
    const resUnder = runPrecheck(underMax, requirement, config);
    expect(resUnder.hasErrors).toBe(true);
    expect(resUnder.diagnostics.some((d) => d.code === "INCLUSION_MAX_UNDER_100")).toBe(true);
  });

  it("mendeteksi ANTI_NOL_CONFLICT saat aktif * minInclusion > 50%", () => {
    const { requirement, config } = makeTwoFeedFixture();
    const antiNolConfig: FormulationConfig = {
      ...config,
      globalZeroInclusion: {
        enforceNonZero: true,
        minIfSelected: 6,
      },
    };
    // 10 bahan aktif * 6% = 60% > 50%
    const res = runPrecheck(MOCK_INGREDIENTS, requirement, antiNolConfig);
    expect(res.diagnostics.some((d) => d.code === "ANTI_NOL_CONFLICT")).toBe(true);
  });

  it("mendeteksi ADVANCE_NULL_DATA saat Mode Advance aktif & nutrien aktif punya data null", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const advIngs: readonly Ingredient[] = [
      {
        ...ingredients[0]!,
        nutrients: { ...ingredients[0]!.nutrients, lys: null },
      },
      {
        ...ingredients[1]!,
        nutrients: { ...ingredients[1]!.nutrients, lys: 2.8 },
      },
    ];
    const advReq: Requirement = {
      ...requirement,
      constraints: [...requirement.constraints, { nutrientId: "lys", min: 1.1, enabled: true }],
    };
    const advConfig: FormulationConfig = { ...config, enableAdvanceNutrients: true };
    const res = runPrecheck(advIngs, advReq, advConfig);
    const nullDiag = res.diagnostics.find((d) => d.code === "ADVANCE_NULL_DATA");
    expect(nullDiag).toBeDefined();
    expect(nullDiag?.severity).toBe("warning");
  });

  it("mendeteksi NUTRIENT_UNREACHABLE (batas tak terjangkau dan penyebut rasio 0)", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const impossibleReq: Requirement = {
      ...requirement,
      constraints: [{ nutrientId: "cp", min: 55 }], // max dari SBM cuma 44%
    };
    const resReach = runPrecheck(ingredients, impossibleReq, config);
    expect(resReach.hasErrors).toBe(true);
    expect(resReach.diagnostics.some((d) => d.code === "NUTRIENT_UNREACHABLE")).toBe(true);

    // Denominator p = 0 di seluruh bahan saat rasio ca:p aktif
    const zeroPIngs: readonly Ingredient[] = ingredients.map((ing) => ({
      ...ing,
      nutrients: { ...ing.nutrients, p: 0 },
    }));
    const resZeroRatio = runPrecheck(zeroPIngs, requirement, config);
    expect(resZeroRatio.hasErrors).toBe(true);
    expect(resZeroRatio.diagnostics.some((d) => d.code === "NUTRIENT_UNREACHABLE")).toBe(true);
  });
});

describe("ENG-02 & ENG-05: LP Model Builder (buildLpModel) & CPLEX Formatter (toLpString)", () => {
  it("menghasilkan nama variabel aman x0..xn tanpa nama bahan mentah dan menyingkirkan koefisien 0", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const model = buildLpModel(ingredients, requirement, config);
    const lp = toLpString(model);

    expect(lp).toContain("Minimize");
    expect(lp).toContain("Subject To");
    expect(lp).toContain("Bounds");
    expect(lp).toContain("End");
    expect(lp).not.toContain("Jagung");
    expect(lp).not.toContain("Khusus");
    expect(lp).not.toContain("@Mix");
    expect(lp).toContain("x0");
    expect(lp).toContain("x1");
    expect(lp).toContain("x0 +");
    expect(lp).toMatch(/=\s*1\b/);
  });

  it("menormalisasi koefisien dan harga sesuai activeBasis dry_matter tanpa mencampur basis", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const dmModel = buildLpModel(ingredients, requirement, {
      ...config,
      activeBasis: "dry_matter",
    });
    const x0 = dmModel.variables.find((v) => v.varName === "x0");
    // corn pricePerKg 5500 AF / 0.86 DM = 6395.348837...
    expect(x0?.modelPricePerKg).toBeCloseTo(5500 / 0.86, 4);
    expect(dmModel.normalizedIngredients[0]?.nutrients.cp).toBeCloseTo((8.5 / 86) * 100, 4);
  });

  it("menyertakan linearisasi rasio Ca:P serta mengunci batas Manual Lock", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const model = buildLpModel(ingredients, requirement, {
      ...config,
      manualLocks: { corn: 60 },
    });
    const x0 = model.variables.find((v) => v.varName === "x0");
    expect(x0?.lower).toBeCloseTo(0.6, 6);
    expect(x0?.upper).toBeCloseTo(0.6, 6);

    const hasRatioRows = model.rows.some(
      (r) => r.meta.kind === "ratio_min" || r.meta.kind === "ratio_max",
    );
    expect(hasRatioRows).toBe(true);
  });

  it("Mode 5 (Chebyshev minimax + ε-lexicographic) mempertahankan deviasi goal dan bobot biaya sangat kecil", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const model5 = buildLpModel(ingredients, requirement, {
      ...config,
      optimizationMode: 5,
    });
    const ingVars = model5.variables.filter((v) => v.role === "ingredient");
    const goalVars = model5.variables.filter((v) => v.role === "goal_pos" || v.role === "goal_neg");
    const chebVar = model5.variables.find((v) => v.role === "chebyshev");
    // ε-lexicographic: biaya sangat kecil (bukan 0) agar dual/opportunity cost tetap bermakna.
    expect(ingVars.every((v) => Math.abs(v.objectiveCoeff) < 1e-3)).toBe(true);
    expect(ingVars.some((v) => v.objectiveCoeff > 0)).toBe(true);
    expect(goalVars.length).toBeGreaterThan(0);
    expect(chebVar?.objectiveCoeff).toBe(1);
    expect(model5.rows.some((r) => r.meta.kind === "chebyshev")).toBe(true);
  });

  it("Mode Elastik L1 menambahkan variabel slack non-negatif berpenalti tinggi dan menjaga modelPricePerKg murni", () => {
    const { ingredients, requirement, config } = makeTwoFeedFixture();
    const elasticModel = buildLpModel(ingredients, requirement, config, { elastic: true });
    const elasticVars = elasticModel.variables.filter(
      (v) => v.role === "elastic_pos" || v.role === "elastic_neg",
    );
    expect(elasticVars.length).toBeGreaterThan(0);
    expect(elasticVars.every((v) => v.objectiveCoeff >= 1e5)).toBe(true);

    const x0 = elasticModel.variables.find((v) => v.varName === "x0");
    expect(x0?.modelPricePerKg).toBe(5500);
    expect(x0?.objectiveCoeff).toBe(5500);
  });

  it("mengevaluasi & menampilkan BETN serta NDF/ADF saat config.showBetn dan config.showNdf diaktifkan", async () => {
    const req = MOCK_REQUIREMENTS[0]!;
    const cfg: FormulationConfig = {
      ...DEFAULT_CONFIG,
      showBetn: true,
      showNdf: true,
      enableAdvanceNutrients: false,
    };

    const solved = await solveFormulationWithRunner(MOCK_INGREDIENTS, req, cfg, solveLpInNode);
    expect(solved.status).toBe("optimal");
    expect(solved.nutrients.some((n) => n.nutrientId === "betn")).toBe(true);
    expect(solved.nutrients.some((n) => n.nutrientId === "ndf")).toBe(true);
    expect(solved.nutrients.some((n) => n.nutrientId === "adf")).toBe(true);

    const reqWithBetnNdf: Requirement = {
      ...req,
      constraints: [
        ...req.constraints,
        { nutrientId: "betn", min: 20, max: 60, isAdvance: true, enabled: true },
        { nutrientId: "ndf", max: 25, isAdvance: true, enabled: true },
      ],
    };
    const activeIds = resolveActiveConstraints(reqWithBetnNdf, cfg).map((c) => c.nutrientId);
    expect(activeIds).toContain("betn");
    expect(activeIds).toContain("ndf");

    const mockEval = evaluateMockFormulation(MOCK_INGREDIENTS, req, cfg);
    expect(mockEval.nutrients.some((n) => n.nutrientId === "betn")).toBe(true);
    expect(mockEval.nutrients.some((n) => n.nutrientId === "ndf")).toBe(true);
  });
});
