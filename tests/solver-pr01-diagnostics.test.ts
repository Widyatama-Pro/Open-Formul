import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/data/mock-state";
import { buildLpModel } from "../src/solver/buildModel";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { findMinimalIis } from "../src/solver/iis";
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

const sbm: Ingredient = {
  id: "sbm",
  name: "Bungkil Kedelai",
  category: "protein",
  pricePerKg: 8200,
  dryMatter: 89,
  basis: "as_fed",
  isActive: true,
  inclusion: { min: 0, max: 100 },
  nutrients: { cp: 44, ca: 0.29, p: 0.65, me_poultry: 2240 },
  source: "fixture",
};

const limestone: Ingredient = {
  id: "limestone",
  name: "Tepung Kapur",
  category: "mineral",
  pricePerKg: 1200,
  dryMatter: 99,
  basis: "as_fed",
  isActive: true,
  inclusion: { min: 0, max: 100 },
  nutrients: { cp: 0, ca: 38, p: 0, me_poultry: 0 },
  source: "fixture",
};

const config: FormulationConfig = {
  ...DEFAULT_CONFIG,
  activeBasis: "as_fed",
  optimizationMode: 1,
  enableAdvanceNutrients: false,
  enableDigestibleBasis: false,
  enableElasticFallback: false,
  manualLocks: {},
};

/**
 * Konflik tersembunyi: Ca >= 1,0% hanya bisa dicapai dominasi kapur (P = 0),
 * tetapi rasio Ca:P <= 0,5 menuntut P tinggi. Masing-masing kendala feasible
 * sendiri-sendiri, dan precheck tidak menangkapnya (Ca maks-capai 38%, P ada).
 */
const conflictReq: Requirement = {
  id: "req-conflict",
  name: "Konflik Rasio vs Mineral",
  species: "poultry",
  basis: "as_fed",
  constraints: [{ nutrientId: "ca", min: 1.0, enabled: true }],
  ratios: [{ id: "ca-p", numerator: "ca", denominator: "p", max: 0.5 }],
};

describe("PR-01: Minimal IIS (Chinneck Deletion Filter)", () => {
  it("mengembalikan IIS minimal berisi tepat pasangan kendala yang bertabrakan", async () => {
    const iis = await findMinimalIis([corn, sbm, limestone], conflictReq, config, solveLpInNode);

    expect(iis.length).toBe(2);
    const ids = iis.map((i) => i.targetId).sort();
    expect(ids).toEqual(["ca", "ca:p"]);

    // Baris mineral lain (mis. jika ada batas Ca maksimum) tidak boleh masuk IIS.
    expect(iis.filter((i) => i.targetId === "ca")).toHaveLength(1);
    expect(iis.find((i) => i.targetId === "ca")?.bound).toBe("min");
  });

  it("menghasilkan IIS kosong untuk model yang feasible", async () => {
    const okReq: Requirement = {
      ...conflictReq,
      constraints: [{ nutrientId: "ca", max: 1.0, enabled: true }],
      ratios: [{ id: "ca-p", numerator: "ca", denominator: "p", max: 2.0 }],
    };
    const iis = await findMinimalIis([corn, sbm, limestone], okReq, config, solveLpInNode);
    expect(iis).toHaveLength(0);
  });

  it("memetakan konflik ingredientGroups ke IIS minimal bersama kendala nutrien", async () => {
    const grpReq: Requirement = {
      id: "req-grp",
      name: "Konflik Grup",
      species: "poultry",
      basis: "as_fed",
      constraints: [{ nutrientId: "cp", min: 30, enabled: true }],
      ingredientGroups: [
        {
          id: "grp-protein",
          name: "Sumber Protein",
          ingredientIds: ["sbm"],
          max: 40, // 40% SBM + 60% Jagung => max CP = 0.4*44 + 0.6*8.5 = 22.7% < 30%
          tier: "tier2",
        },
      ],
    };
    const iis = await findMinimalIis([corn, sbm], grpReq, config, solveLpInNode);
    expect(iis.some((i) => i.kind === "nutrient" && i.targetId === "cp")).toBe(true);
    expect(iis.some((i) => i.kind === "group" && i.targetId === "grp-protein")).toBe(true);
  });
});

describe("PR-01: Priority Tiers relaksasi elastik", () => {
  const tierReq = (tier?: "tier0" | "tier1" | "tier2" | "tier3"): Requirement => ({
    id: "req-tier",
    name: "Tier",
    species: "poultry",
    basis: "as_fed",
    constraints: [
      // CP 50% mustahil dicapai (max 44% dari SBM) -> pemicu relaksasi.
      { nutrientId: "cp", min: 50, enabled: true, ...(tier ? { tier } : {}) },
      { nutrientId: "me_poultry", min: 3250, max: 3350, enabled: true },
    ],
  });

  it("Tier-0 tetap kaku: baris tanpa slack dan hasil akhir infeasible", async () => {
    const model = buildLpModel([corn, sbm], tierReq("tier0"), config, { elastic: true });
    const cpMinRow = model.rows.find(
      (r) => r.meta.kind === "nutrient_min" && r.meta.nutrientId === "cp",
    );
    const meMinRow = model.rows.find(
      (r) => r.meta.kind === "nutrient_min" && r.meta.nutrientId === "me_poultry",
    );
    expect(cpMinRow?.slackNegVar).toBeUndefined();
    expect(meMinRow?.slackNegVar).toBeDefined();

    const res = await solveFormulationWithRunner(
      [corn, sbm],
      tierReq("tier0"),
      { ...config, enableElasticFallback: true },
      solveLpInNode,
    );
    expect(res.status).toBe("infeasible");
  });

  it("Tier-1 lebih ketat daripada Tier-3 pada pelanggaran yang sama", () => {
    const t1 = buildLpModel([corn, sbm], tierReq("tier1"), config, { elastic: true });
    const t3 = buildLpModel([corn, sbm], tierReq("tier3"), config, { elastic: true });
    const coeff = (m: typeof t1) =>
      m.variables.find((v) => v.role === "elastic_neg")?.objectiveCoeff ?? 0;
    expect(coeff(t1)).toBeGreaterThan(coeff(t3));
  });

  it("Tier lunak dilonggarkan dan melaporkan total penalti relaksasi", async () => {
    const res = await solveFormulationWithRunner(
      [corn, sbm],
      tierReq("tier3"),
      { ...config, enableElasticFallback: true },
      solveLpInNode,
    );
    expect(res.status).toBe("near_feasible");
    expect(res.relaxationPenalty).toBeGreaterThan(0);
  });
});

describe("PR-01: Chebyshev minimax Mode 5", () => {
  const req: Requirement = {
    id: "req-cheb",
    name: "Chebyshev",
    species: "poultry",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20, max: 24, idealTarget: 22, enabled: true },
      { nutrientId: "me_poultry", min: 2950, max: 3150, idealTarget: 3050, enabled: true },
    ],
  };

  it("membangun variabel D minimax plus baris pembatas deviasi ternormalisasi", () => {
    const model = buildLpModel([corn, sbm], req, { ...config, optimizationMode: 5 });
    const dVar = model.variables.find((v) => v.role === "chebyshev");
    expect(dVar).toBeDefined();
    expect(dVar?.objectiveCoeff).toBeGreaterThan(0);

    const chebRows = model.rows.filter((r) => r.meta.kind === "chebyshev");
    expect(chebRows).toHaveLength(2);
  });

  it("menekan deviasi ternormalisasi maksimum dibanding Mode 1", async () => {
    const res1 = await solveFormulationWithRunner(
      [corn, sbm],
      req,
      { ...config, optimizationMode: 1 },
      solveLpInNode,
    );
    const res5 = await solveFormulationWithRunner(
      [corn, sbm],
      req,
      { ...config, optimizationMode: 5 },
      solveLpInNode,
    );

    expect(res1.status).toBe("optimal");
    expect(res5.status).toBe("optimal");

    const maxRelDev = (r: typeof res1) => {
      const cp = r.nutrients.find((n) => n.nutrientId === "cp")?.value ?? 0;
      const me = r.nutrients.find((n) => n.nutrientId === "me_poultry")?.value ?? 0;
      return Math.max(Math.abs(cp - 22) / 22, Math.abs(me - 3050) / 3050);
    };

    expect(maxRelDev(res5)).toBeLessThanOrEqual(maxRelDev(res1) + 1e-6);
  });
});
