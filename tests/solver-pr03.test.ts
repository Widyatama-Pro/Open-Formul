import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/data/mock-state";
import { buildLpModel } from "../src/solver/buildModel";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";
import type { FormulationConfig, Ingredient, Requirement } from "../src/types";

const corn: Ingredient = {
  id: "corn",
  name: "Jagung",
  category: "energy",
  pricePerKg: 5500,
  dryMatter: 86,
  basis: "as_fed",
  isActive: true,
  inclusion: { min: 0, max: 100 },
  nutrients: { cp: 8.5, ca: 0.02, p: 0.28, me_poultry: 3300 },
  source: "fixture",
};

/** Murah per kg, tapi buruk per kkal: biaya/ME = 12000/8800 = 1.36 < jagung 1.67. */
const tallow: Ingredient = {
  id: "tallow",
  name: "Lemak Hewan",
  category: "energy",
  pricePerKg: 12000,
  dryMatter: 99,
  basis: "as_fed",
  isActive: true,
  inclusion: { min: 0, max: 100 },
  nutrients: { cp: 0, ca: 0, p: 0, me_poultry: 8800 },
  source: "fixture",
};

const baseConfig: FormulationConfig = {
  ...DEFAULT_CONFIG,
  activeBasis: "as_fed",
  optimizationMode: 1,
  enableAdvanceNutrients: false,
  enableDigestibleBasis: false,
  enableElasticFallback: false,
  manualLocks: {},
};

/** Tanpa kendala nutrien: mutlak -> 100% jagung (termurah); fraksional -> 100% lemak (ME/IDR terbaik). */
const freeReq: Requirement = {
  id: "req-pr03-free",
  name: "PR-03 bebas",
  species: "poultry",
  basis: "as_fed",
  constraints: [],
};

const ratioOf = (
  r: { costPerKg: number | null; nutrients: readonly { nutrientId: string; value: number }[] },
  id: string,
) => (r.costPerKg ?? 0) / (r.nutrients.find((n) => n.nutrientId === id)?.value ?? 0);

describe("PR-03: fractional objective (Charnes–Cooper / Dinkelbach)", () => {
  it("cost-per-ME memilih lemak, sedangkan least-cost memilih jagung", async () => {
    const abs = await solveFormulationWithRunner(
      [corn, tallow],
      freeReq,
      baseConfig,
      solveLpInNode,
    );
    const frac = await solveFormulationWithRunner(
      [corn, tallow],
      freeReq,
      {
        ...baseConfig,
        fractionalObjective: { mode: "cost_per_nutrient", nutrientId: "me_poultry" },
      },
      solveLpInNode,
    );

    expect(abs.status).toBe("optimal");
    expect(frac.status).toBe("optimal");

    expect(abs.composition[0]!.ingredientId).toBe("corn");
    expect(frac.composition[0]!.ingredientId).toBe("tallow");

    expect(ratioOf(frac, "me_poultry")).toBeLessThan(ratioOf(abs, "me_poultry") - 0.1);
    expect(frac.fractionalCost).toBeCloseTo(ratioOf(frac, "me_poultry"), 4);
    expect(abs.fractionalCost).toBeUndefined();
    expect(frac.composition.reduce((s, c) => s + c.fraction, 0)).toBeCloseTo(1, 6);
  });

  it("guard 0/0: penyebut tanpa minimum eksplisit mendapat lantai epsilon di model", () => {
    const model = buildLpModel([corn, tallow], freeReq, baseConfig, {});
    expect(model.rows.some((r) => r.meta.kind === "denominator_floor")).toBe(false);

    const withFrac = buildLpModel(
      [corn, tallow],
      freeReq,
      {
        ...baseConfig,
        fractionalObjective: { mode: "cost_per_nutrient", nutrientId: "me_poultry" },
      },
      {},
    );
    const floor = withFrac.rows.find((r) => r.meta.kind === "denominator_floor");
    expect(floor).toBeDefined();
    expect(floor!.sense).toBe(">=");
    expect(floor!.rhs).toBeGreaterThan(0);
  });

  it("penyebut yang seluruhnya nol -> infeasible + FRACTIONAL_DENOMINATOR_ZERO, bukan NaN", async () => {
    const res = await solveFormulationWithRunner(
      [corn, tallow],
      freeReq,
      { ...baseConfig, fractionalObjective: { mode: "cost_per_nutrient", nutrientId: "lys" } },
      solveLpInNode,
    );
    expect(res.status).toBe("infeasible");
    expect((res.conflicts ?? []).some((c) => c.code === "FRACTIONAL_DENOMINATOR_ZERO")).toBe(true);
    expect(res.costPerKg).toBeNull();
  });
});

describe("PR-03: kendala aktif dEB/DCAD", () => {
  it("membangun baris DCAD dari Na/K/Cl/S (mg/kg) dan menegakkan batasnya", async () => {
    const a: Ingredient = {
      id: "a",
      name: "A",
      category: "energy",
      pricePerKg: 1000,
      dryMatter: 90,
      basis: "as_fed",
      isActive: true,
      inclusion: { min: 0, max: 100 },
      nutrients: { cp: 10, me_poultry: 3000, na: 2000, k: 8000, cl: 2000, s: 1500 },
      source: "fixture",
    };
    const b: Ingredient = {
      id: "b",
      name: "B",
      category: "protein",
      pricePerKg: 1500,
      dryMatter: 90,
      basis: "as_fed",
      isActive: true,
      inclusion: { min: 0, max: 100 },
      nutrients: { cp: 10, me_poultry: 3000, na: 500, k: 4000, cl: 4000, s: 3000 },
      source: "fixture",
    };
    const dcadA = 2000 / 23.0 + 8000 / 39.1 - 2000 / 35.5 - (2 * 1500) / 32.1;
    const dcadB = 500 / 23.0 + 4000 / 39.1 - 4000 / 35.5 - (2 * 3000) / 32.1;
    expect(dcadA).toBeGreaterThan(120);
    expect(dcadB).toBeLessThan(100);

    const req: Requirement = {
      id: "dcad",
      name: "DCAD",
      species: "dairy",
      basis: "as_fed",
      constraints: [
        { nutrientId: "cp", min: 10, enabled: true },
        { nutrientId: "dcad", min: 100, max: 120, enabled: true },
      ],
    };
    const res = await solveFormulationWithRunner([a, b], req, baseConfig, solveLpInNode);

    expect(res.status).toBe("optimal");
    const dcad = res.nutrients.find((n) => n.nutrientId === "dcad");
    expect(dcad).toBeDefined();
    expect(dcad!.value).toBeGreaterThanOrEqual(100 - 1e-6);
    expect(dcad!.value).toBeLessThanOrEqual(120 + 1e-6);
    // Solusinya harus campuran, bukan salah satu bahan saja.
    expect(res.composition.filter((c) => c.fraction > 1e-6)).toHaveLength(2);
  });

  it("DCAD tidak butuh mode Advance (nutrien turunan selalu aktif)", () => {
    const req: Requirement = {
      id: "dcad-only",
      name: "DCAD",
      species: "dairy",
      basis: "as_fed",
      constraints: [{ nutrientId: "dcad", min: 0, enabled: true }],
    };
    const model = buildLpModel([corn, tallow], req, baseConfig, {});
    expect(
      model.rows.some((r) => r.meta.kind === "nutrient_min" && r.meta.nutrientId === "dcad"),
    ).toBe(true);
  });
});
