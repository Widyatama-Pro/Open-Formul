import { describe, expect, it } from "vitest";
import {
  computeDynamicBeefRequirement,
  computeDynamicDairyRequirement,
} from "../src/utils/cattle-requirements";

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
});
