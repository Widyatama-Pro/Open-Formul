import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, HARTADI_FEEDS, MOCK_INGREDIENTS } from "../src/data/mock-state";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";
import {
  computeDynamicBeefRequirement,
  computeDynamicDairyRequirement,
} from "../src/utils/cattle-requirements";

const CATTLE_HARTADI_STARTER = HARTADI_FEEDS.map((ing) => ({
  ...ing,
  isActive: [
    "hartadi-rumput-gajah",
    "hartadi-jerami-padi",
    "hartadi-lamtoro",
    "hartadi-bungkil-kelapa",
    "hartadi-pollard",
    "hartadi-onggok-kering",
    "hartadi-molases",
    "hartadi-bis-ekspeller",
  ].includes(ing.id),
}));

const CATTLE_MOCK_SET = MOCK_INGREDIENTS.map((ing) => ({
  ...ing,
  isActive: ing.id === "napier-grass" || ing.isActive !== false,
}));

describe("Dynamic Cattle Requirements (Kearl 1982 & NRC 1988)", () => {
  it("computes dynamic Beef Cattle growth via Kearl Table 14 interpolation", () => {
    const res = computeDynamicBeefRequirement({
      bodyWeightKg: 275,
      adgKgPerDay: 0.75,
      physiologicalState: "growth",
    });

    expect(res.isExtrapolated).toBe(false);
    expect(res.dmiKg).toBeGreaterThan(6.0);
    expect(res.dmiKg).toBeLessThan(8.5);
    expect(res.requirement.species).toBe("cattle_beef");
    expect(res.requirement.basis).toBe("dry_matter");

    const cpMin = res.requirement.constraints.find((c) => c.nutrientId === "cp")?.min;
    const tdnMin = res.requirement.constraints.find((c) => c.nutrientId === "tdn")?.min;
    expect(cpMin).toBeDefined();
    expect(tdnMin).toBeDefined();
    expect(tdnMin!).toBeGreaterThan(58);
    expect(tdnMin!).toBeLessThan(72);
  });

  it("guards against the Kearl Table 14 BW=300 kg ADG=1.10 kg print erratum", () => {
    const res = computeDynamicBeefRequirement({
      bodyWeightKg: 300,
      adgKgPerDay: 1.1,
      physiologicalState: "growth",
    });

    const tdnMin = res.requirement.constraints.find((c) => c.nutrientId === "tdn")?.min;
    expect(tdnMin).toBeDefined();
    // Must stay ~71.8% TDN rather than the 83.6% printed typo
    expect(tdnMin!).toBeGreaterThan(68);
    expect(tdnMin!).toBeLessThan(75);
  });

  it("supports Beef Cattle gestation, work states, and safe out-of-range extrapolation", () => {
    const extrap = computeDynamicBeefRequirement({
      bodyWeightKg: 550,
      adgKgPerDay: 1.0,
      physiologicalState: "growth",
    });
    expect(extrap.isExtrapolated).toBe(true);
    expect(extrap.dmiKg).toBeGreaterThan(8.5);

    const gestCow = computeDynamicBeefRequirement({
      bodyWeightKg: 400,
      adgKgPerDay: 0.4,
      physiologicalState: "gestation_cow",
    });
    expect(gestCow.isExtrapolated).toBe(false);
    expect(gestCow.requirement.phase).toContain("Bunting");

    const workHeavy = computeDynamicBeefRequirement({
      bodyWeightKg: 450,
      adgKgPerDay: 0,
      physiologicalState: "work_heavy",
    });
    expect(workHeavy.requirement.phase).toContain("Kerja Berat");
  });

  it("computes dynamic Dairy Cattle using Kearl 1982 default and NRC 1988 toggle + FCM 4%", () => {
    const kearl = computeDynamicDairyRequirement({
      bodyWeightKg: 450,
      milkKgPerDay: 15,
      fatPct: 3.8,
      standard: "kearl_1982",
    });
    const nrc = computeDynamicDairyRequirement({
      bodyWeightKg: 450,
      milkKgPerDay: 15,
      fatPct: 3.8,
      standard: "nrc_1988",
    });

    expect(kearl.fcm4PctKg).toBeCloseTo(14.55, 2);
    expect(nrc.fcm4PctKg).toBeCloseTo(14.55, 2);
    expect(kearl.requirement.name).toContain("Kearl 1982");
    expect(nrc.requirement.name).toContain("NRC 1988");

    // Kearl 400 kg lactating cow erratum guard (must keep realistic CP > 10%)
    const kearl400 = computeDynamicDairyRequirement({
      bodyWeightKg: 400,
      milkKgPerDay: 10,
      fatPct: 4.0,
      standard: "kearl_1982",
    });
    const cp400 = kearl400.requirement.constraints.find((c) => c.nutrientId === "cp")?.min ?? 0;
    expect(cp400).toBeGreaterThan(10);

    // High milk yield extrapolates cleanly
    const highYield = computeDynamicDairyRequirement({
      bodyWeightKg: 600,
      milkKgPerDay: 50,
      fatPct: 3.6,
      standard: "nrc_1988",
    });
    expect(highYield.isExtrapolated).toBe(true);
    expect(highYield.dmiKg).toBeGreaterThan(18);

    // Dry pregnant state
    const dryPreg = computeDynamicDairyRequirement({
      bodyWeightKg: 550,
      milkKgPerDay: 20,
      fatPct: 4.0,
      isDryPregnant: true,
    });
    expect(dryPreg.requirement.phase).toContain("Kering Bunting");
    expect(
      dryPreg.requirement.constraints.find((c) => c.nutrientId === "tdn")?.min,
    ).toBeGreaterThan(50);
  });

  it("populates sourced ee (LK) and cf (SK) constraints after BW input for beef & dairy", () => {
    const beefMaint = computeDynamicBeefRequirement({
      bodyWeightKg: 300,
      adgKgPerDay: 0,
      physiologicalState: "growth",
    });
    const beefFinish = computeDynamicBeefRequirement({
      bodyWeightKg: 350,
      adgKgPerDay: 1.0,
      physiologicalState: "growth",
    });
    const dairyLact = computeDynamicDairyRequirement({
      bodyWeightKg: 450,
      milkKgPerDay: 15,
      fatPct: 3.8,
      standard: "kearl_1982",
    });

    for (const res of [beefMaint, beefFinish, dairyLact]) {
      const ee = res.requirement.constraints.find((c) => c.nutrientId === "ee");
      const cf = res.requirement.constraints.find((c) => c.nutrientId === "cf");
      expect(ee).toBeDefined();
      expect(cf).toBeDefined();
      expect(ee?.enabled).toBe(true);
      expect(cf?.enabled).toBe(true);
      expect(ee?.min).toBeGreaterThanOrEqual(1.5);
      expect(ee?.max).toBeLessThanOrEqual(7.0);
      expect(cf?.min).toBeGreaterThanOrEqual(12);
      expect(cf?.max).toBeLessThanOrEqual(32);
      expect(res.requirement.source).toMatch(/SNI 3148|Hartadi|NRC/i);
    }

    // Finishing ration (higher TDN) must allow/expect lower CF than maintenance
    const maintCfMax = beefMaint.requirement.constraints.find((c) => c.nutrientId === "cf")!.max!;
    const finishCfMax = beefFinish.requirement.constraints.find((c) => c.nutrientId === "cf")!.max!;
    expect(finishCfMax).toBeLessThan(maintCfMax);
  });

  it("remains LP-feasible in HiGHS across beef & dairy weights/ADGs with Hartadi & mock feeds", async () => {
    const beefCases = [
      { bodyWeightKg: 150, adgKgPerDay: 0.5, physiologicalState: "growth" as const },
      { bodyWeightKg: 250, adgKgPerDay: 0.75, physiologicalState: "growth" as const },
      { bodyWeightKg: 300, adgKgPerDay: 0.0, physiologicalState: "growth" as const },
      { bodyWeightKg: 300, adgKgPerDay: 0.8, physiologicalState: "growth" as const },
      { bodyWeightKg: 350, adgKgPerDay: 1.0, physiologicalState: "growth" as const },
      { bodyWeightKg: 450, adgKgPerDay: 0.5, physiologicalState: "growth" as const },
      { bodyWeightKg: 600, adgKgPerDay: 0.4, physiologicalState: "gestation_cow" as const },
      { bodyWeightKg: 450, adgKgPerDay: 0.0, physiologicalState: "work_heavy" as const },
    ];

    for (const input of beefCases) {
      const { requirement } = computeDynamicBeefRequirement(input);
      const res = await solveFormulationWithRunner(
        CATTLE_HARTADI_STARTER,
        requirement,
        {
          ...DEFAULT_CONFIG,
          activeBasis: "dry_matter",
          optimizationMode: 1,
          enableElasticFallback: false,
        },
        solveLpInNode,
      );
      expect(res.status, `Beef BW=${input.bodyWeightKg} ADG=${input.adgKgPerDay}`).toBe("optimal");
      const eeRes = res.nutrients.find((n) => n.nutrientId === "ee");
      const cfRes = res.nutrients.find((n) => n.nutrientId === "cf");
      expect(eeRes?.status).toBe("met");
      expect(cfRes?.status).toBe("met");
    }

    const dairyCases = [
      { bodyWeightKg: 350, milkKgPerDay: 10, fatPct: 4.0, standard: "kearl_1982" as const },
      { bodyWeightKg: 450, milkKgPerDay: 15, fatPct: 3.8, standard: "kearl_1982" as const },
      { bodyWeightKg: 550, milkKgPerDay: 22, fatPct: 3.8, standard: "nrc_1988" as const },
      { bodyWeightKg: 500, milkKgPerDay: 0, fatPct: 4.0, isDryPregnant: true },
    ];

    for (const input of dairyCases) {
      const { requirement } = computeDynamicDairyRequirement(input);
      const res = await solveFormulationWithRunner(
        CATTLE_HARTADI_STARTER,
        requirement,
        {
          ...DEFAULT_CONFIG,
          activeBasis: "dry_matter",
          optimizationMode: 1,
          enableElasticFallback: false,
        },
        solveLpInNode,
      );
      expect(res.status, `Dairy BW=${input.bodyWeightKg} milk=${input.milkKgPerDay}`).toBe(
        "optimal",
      );
      expect(res.nutrients.find((n) => n.nutrientId === "ee")?.status).toBe("met");
      expect(res.nutrients.find((n) => n.nutrientId === "cf")?.status).toBe("met");
    }

    // Verify Single-target mode & MOCK_INGREDIENTS + napier-grass feasibility
    const beef300 = computeDynamicBeefRequirement({
      bodyWeightKg: 300,
      adgKgPerDay: 0.8,
      physiologicalState: "growth",
    }).requirement;
    const singleModeRes = await solveFormulationWithRunner(
      CATTLE_HARTADI_STARTER,
      beef300,
      {
        ...DEFAULT_CONFIG,
        activeBasis: "dry_matter",
        targetInputMode: "single",
        optimizationMode: 1,
        enableElasticFallback: false,
      },
      solveLpInNode,
    );
    expect(singleModeRes.status).toBe("optimal");

    const mockSetRes = await solveFormulationWithRunner(
      CATTLE_MOCK_SET,
      beef300,
      {
        ...DEFAULT_CONFIG,
        activeBasis: "dry_matter",
        optimizationMode: 1,
        enableElasticFallback: false,
      },
      solveLpInNode,
    );
    expect(mockSetRes.status).toBe("optimal");
  });
});
