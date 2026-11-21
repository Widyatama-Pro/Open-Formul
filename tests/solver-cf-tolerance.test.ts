import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, MOCK_INGREDIENTS, MOCK_REQUIREMENTS } from "../src/data/mock-state";
import { buildLpModel } from "../src/solver/buildModel";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";
import type { FormulationConfig, Ingredient, Requirement } from "../src/types";
import { solveLpInNode } from "../src/solver/highsNodeRunner";

describe("Serat Kasar (CF) Asymmetric Tolerance & +15% Hard Ceiling", () => {
  const highFiberIngredients: readonly Ingredient[] = MOCK_INGREDIENTS.map((ing) => {
    const active = ing.id === "rice-bran" || ing.id === "palm-kernel-meal";
    return {
      ...ing,
      isActive: active,
      ...(active ? { inclusion: { min: 0, max: 100 } } : {}),
    };
  });

  const elasticConfig: FormulationConfig = {
    ...DEFAULT_CONFIG,
    activeBasis: "as_fed",
    enableElasticFallback: true,
    targetInputMode: "range",
  };

  it("menerima kekurangan SK di bawah min lebih longgar saat Toleransi Target aktif", async () => {
    const lowFiberOnly: readonly Ingredient[] = MOCK_INGREDIENTS.map((ing) => {
      const active = ing.id === "corn-ground" || ing.id === "sbm-44";
      return {
        ...ing,
        isActive: active,
        ...(active ? { inclusion: { min: 0, max: 100 } } : {}),
      };
    });

    // corn-ground SK=2.2%, sbm-44 SK=7.0%. Jika target SK min=15%, kekurangan jauh (>15%) tetap diizinkan near_feasible!
    const reqHighCfMin: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "cp", min: 15, enabled: true },
        { nutrientId: "cf", min: 15, max: 25, enabled: true },
      ],
      ratios: [],
    };

    const res = await solveFormulationWithRunner(
      lowFiberOnly,
      reqHighCfMin,
      elasticConfig,
      solveLpInNode,
    );
    expect(res.status).toBe("near_feasible");
    const cf = res.nutrients.find((n) => n.nutrientId === "cf")!;
    expect(cf.status).toBe("below_min");
    expect(cf.value).toBeLessThan(15);
  });

  it("menerima kelebihan SK hingga <= +15% di atas max sebagai near_feasible dan menolak keras > +15% sebagai infeasible", async () => {
    // rice-bran As-Fed SK = 11.4% (min fiber achievable dalam highFiberIngredients)
    // Case A: max = 10.0 -> plafon 10.0 * 1.15 = 11.5% >= 11.4% -> near_feasible!
    const withinCapReq: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "cp", min: 12, enabled: true },
        { nutrientId: "cf", max: 10.0, enabled: true },
      ],
      ratios: [],
    };
    const withinRes = await solveFormulationWithRunner(
      highFiberIngredients,
      withinCapReq,
      elasticConfig,
      solveLpInNode,
    );
    expect(withinRes.status).toBe("near_feasible");
    const withinCf = withinRes.nutrients.find((n) => n.nutrientId === "cf")!;
    expect(withinCf.status).toBe("above_max");
    expect(withinCf.value).toBeLessThanOrEqual(10.0 * 1.15 + 1e-6);

    // Case B: max = 9.5 -> plafon 9.5 * 1.15 = 10.925% < 11.4% -> infeasible meski elastic fallback aktif!
    const overCapReq: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        { nutrientId: "cp", min: 12, enabled: true },
        { nutrientId: "cf", max: 9.5, enabled: true },
      ],
      ratios: [],
    };
    const overRes = await solveFormulationWithRunner(
      highFiberIngredients,
      overCapReq,
      elasticConfig,
      solveLpInNode,
    );
    expect(overRes.status).toBe("infeasible");
  });

  it("memasang batas slackPosVar cf <= max * 0.15 dan penalti neg lebih rendah pada buildLpModel", () => {
    const req: Requirement = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [{ nutrientId: "cf", min: 10, max: 20, enabled: true }],
      ratios: [],
    };
    const model = buildLpModel(MOCK_INGREDIENTS, req, elasticConfig, { elastic: true });
    const cfMinRow = model.rows.find(
      (r) => r.meta.kind === "nutrient_min" && r.meta.nutrientId === "cf",
    );
    const cfMaxRow = model.rows.find(
      (r) => r.meta.kind === "nutrient_max" && r.meta.nutrientId === "cf",
    );
    const cfNegSlack = model.variables.find((v) => v.varName === cfMinRow?.slackNegVar);
    const cfPosSlack = model.variables.find((v) => v.varName === cfMaxRow?.slackPosVar);

    expect(cfNegSlack).toBeDefined();
    expect(cfPosSlack).toBeDefined();
    expect(cfPosSlack!.upper).toBeCloseTo(20 * 0.15, 6);
    expect(cfPosSlack!.objectiveCoeff).toBeGreaterThan(cfNegSlack!.objectiveCoeff * 10);
  });
});
