import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/data/mock-state";
import { buildLpModel } from "../src/solver/buildModel";
import { computeEnzymeUplift, computeIngredientEnzymeUplift } from "../src/solver/enzymes";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";
import type { FormulationConfig, Ingredient, Requirement } from "../src/types";

/** avp: jagung 0.08, SBM 0.20 -> avp maks 0.20 pada SBM murni. */
const corn: Ingredient = {
  id: "corn",
  name: "Jagung",
  category: "energy",
  pricePerKg: 5000,
  dryMatter: 86,
  basis: "as_fed",
  isActive: true,
  inclusion: { min: 0, max: 100 },
  nutrients: { cp: 8.5, me_poultry: 3300, avp: 0.08 },
  source: "fixture",
};

const sbm: Ingredient = {
  id: "sbm",
  name: "Bungkil Kedelai",
  category: "protein",
  pricePerKg: 9000,
  dryMatter: 89,
  basis: "as_fed",
  isActive: true,
  inclusion: { min: 0, max: 100 },
  nutrients: { cp: 44, me_poultry: 2400, avp: 0.2 },
  source: "fixture",
};

const baseConfig: FormulationConfig = {
  ...DEFAULT_CONFIG,
  activeBasis: "as_fed",
  optimizationMode: 1,
  enableAdvanceNutrients: true,
  enableDigestibleBasis: true,
  enableElasticFallback: false,
  manualLocks: {},
};

const reqAvp: Requirement = {
  id: "req-pr05",
  name: "PR-05",
  species: "poultry",
  basis: "as_fed",
  constraints: [
    { nutrientId: "cp", min: 20, enabled: true },
    { nutrientId: "avp", min: 0.15, enabled: true },
  ],
};

const avpOf = (r: { nutrients: readonly { nutrientId: string; value: number }[] }) =>
  r.nutrients.find((n) => n.nutrientId === "avp")?.value;

describe("PR-05: multi-enzyme sub-additive + thermal retention", () => {
  it("tanpa enzim: avp dipenuhi murni dari bahan (baseline)", async () => {
    const res = await solveFormulationWithRunner([corn, sbm], reqAvp, baseConfig, solveLpInNode);
    expect(res.status).toBe("optimal");
    // avp = 0.08 + 0.12 f >= 0.15 -> f >= 0.5833 (mengikat, bukan cp)
    expect(avpOf(res)).toBeGreaterThanOrEqual(0.15 - 1e-6);
    expect(avpOf(res)).toBeLessThan(0.16);
  });

  it("fitase meningkatkan avp efektif sehingga pakan jadi lebih murah", async () => {
    const noEnz = await solveFormulationWithRunner([corn, sbm], reqAvp, baseConfig, solveLpInNode);
    const withPhytase = await solveFormulationWithRunner(
      [corn, sbm],
      reqAvp,
      {
        ...baseConfig,
        enzymes: [{ id: "phytase", type: "phytase", matrix: { avp: 0.12 }, thermalRetention: 1 }],
      },
      solveLpInNode,
    );
    expect(withPhytase.status).toBe("optimal");
    // Uplift +0.12 melampaui min avp -> kendala pengikat beralih ke cp (SBM lebih sedikit).
    expect(withPhytase.costPerKg ?? Infinity).toBeLessThan(noEnz.costPerKg ?? 0);
    expect(avpOf(withPhytase)).toBeGreaterThanOrEqual(0.15 - 1e-6);
  });

  it("retensi termal menurunkan efektivitas enzim (pelet butuh bahan lebih banyak)", async () => {
    const reqAvpOnly: Requirement = {
      ...reqAvp,
      constraints: [{ nutrientId: "avp", min: 0.25, enabled: true }],
    };
    const run = (thermalRetention: number) =>
      solveFormulationWithRunner(
        [corn, sbm],
        reqAvpOnly,
        {
          ...baseConfig,
          enzymes: [{ id: "phy", type: "phytase", matrix: { avp: 0.15 }, thermalRetention }],
        },
        solveLpInNode,
      );
    const mash = await run(1); // potensi penuh
    const pellet = await run(0.6); // 60% lolos peleting
    expect(mash.status).toBe("optimal");
    expect(pellet.status).toBe("optimal");
    expect(pellet.costPerKg ?? 0).toBeGreaterThan(mash.costPerKg ?? 0);
  });

  it("sub-additif: cap psi membatasi uplift gabungan di bawah jumlah individual", () => {
    const enzymes = [
      { id: "phy", type: "phytase" as const, matrix: { avp: 0.1 }, thermalRetention: 1 },
      { id: "xyl", type: "xylanase" as const, matrix: { avp: 0.1 }, thermalRetention: 1 },
    ];
    // Tanpa cap: uplift = 0.20 (jumlah aditif murni = double-counting).
    expect(computeEnzymeUplift("avp", enzymes, undefined)).toBeCloseTo(0.2, 10);
    expect(computeEnzymeUplift("avp", enzymes, 1)).toBeCloseTo(0.2, 10);
    // Cap psi = 0.7 -> 0.7 * 0.20 = 0.14 (bukan 0.20).
    expect(computeEnzymeUplift("avp", enzymes, 0.7)).toBeCloseTo(0.14, 10);
    // Substrat tanpa enzim tetap nol.
    expect(computeEnzymeUplift("cp", enzymes, 0.7)).toBe(0);
  });

  it("uplift enzim masuk ke baris kendala nutrien model LP", () => {
    const model = buildLpModel([corn, sbm], reqAvp, {
      ...baseConfig,
      enzymes: [{ id: "phy", type: "phytase", matrix: { avp: 0.12 }, thermalRetention: 1 }],
    });
    const avpRow = model.rows.find(
      (r) => r.meta.kind === "nutrient_min" && r.meta.nutrientId === "avp",
    );
    expect(avpRow).toBeDefined();
    // Koefisien tiap bahan = nilai bahan + 0.12 (uplift enzim).
    const coeffs = new Map(avpRow!.terms.map((t) => [t.varName, t.coeff]));
    expect(coeffs.get("x0")).toBeCloseTo(0.08 + 0.12, 10);
    expect(coeffs.get("x1")).toBeCloseTo(0.2 + 0.12, 10);
  });

  it("membatasi pelepasan enzim terhadap pool substrat (phytateP)", () => {
    const limestoneNoPhytate: Ingredient = {
      ...corn,
      id: "lime",
      category: "mineral",
      phytateP: 0,
      nutrients: { cp: 0, avp: 0 },
    };
    const cornWithPhytate: Ingredient = {
      ...corn,
      phytateP: 0.08,
    };
    const enzymes = [
      {
        id: "phy",
        type: "phytase" as const,
        matrix: { avp: 0.15 },
        substrateNutrientId: "phytate_p",
      },
    ];
    expect(computeIngredientEnzymeUplift(limestoneNoPhytate, "avp", enzymes)).toBe(0);
    expect(computeIngredientEnzymeUplift(cornWithPhytate, "avp", enzymes)).toBeCloseTo(0.08, 10);
  });

  it("menghasilkan rumenEvaluation (CNCPS/NASEM) otomatis untuk profil ruminansia", async () => {
    const grass: Ingredient = {
      id: "grass",
      name: "Rumput Gajah",
      category: "forage",
      pricePerKg: 900,
      dryMatter: 22,
      basis: "dry_matter",
      isActive: true,
      inclusion: { min: 40, max: 80 },
      nutrients: { cp: 9.5, tdn: 54, ndf: 66, ee: 2.1, ca: 0.4, p: 0.25 },
      source: "fixture",
    };
    const conc: Ingredient = {
      id: "conc",
      name: "Konsentrat Sapi",
      category: "energy",
      pricePerKg: 4200,
      dryMatter: 88,
      basis: "dry_matter",
      isActive: true,
      inclusion: { min: 20, max: 60 },
      nutrients: { cp: 18, tdn: 76, ndf: 24, ee: 4.5, ca: 0.7, p: 0.45 },
      source: "fixture",
    };
    const beefReq: Requirement = {
      id: "req-beef-rumen",
      name: "Sapi Potong",
      species: "cattle_beef",
      basis: "dry_matter",
      constraints: [
        { nutrientId: "cp", min: 12, enabled: true },
        { nutrientId: "tdn", min: 62, enabled: true },
      ],
    };
    const res = await solveFormulationWithRunner(
      [grass, conc],
      beefReq,
      { ...baseConfig, activeBasis: "dry_matter", enableAdvanceNutrients: true },
      solveLpInNode,
    );
    expect(res.status).toBe("optimal");
    expect(res.rumenEvaluation).toBeDefined();
    expect(res.rumenEvaluation!.forageFractionPct).toBeGreaterThanOrEqual(40);
    expect(res.rumenEvaluation!.peuNdf240Pct).toBeGreaterThan(0);
    expect(res.rumenEvaluation!.estimatedDmiPctBw).toBeGreaterThan(1.4);
    expect(res.rumenEvaluation!.predictedMethaneGPerKgDm).toBeGreaterThan(8);
  });
});
