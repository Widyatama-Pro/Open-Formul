import { describe, expect, it } from "vitest";
import { MOCK_INGREDIENTS } from "../src/data/mock-state";
import {
  computeAsFedFractions,
  convertNutrientValue,
  convertPriceToModelBasis,
  normalizeIngredientToBasis,
} from "../src/utils/basis";
import {
  computeCattleDigestibleEnergyFromTdn,
  computeCattleMetabolizableEnergyFromDe,
  computeCattleNetEnergyGain,
  computeCattleNetEnergyGainGarrett1977,
  computeCattleNetEnergyLactation,
  computeCattleNetEnergyMaintenance,
  computeElectrolyteBalance,
  computeFatCorrectedMilk4Pct,
  computeKearlLactationRequirement,
  computePoultryMeFromProximatePct,
  computePoultryMeWpsaMjPerKg,
  computeRuminantRoughageDigestibleProtein,
  computeSheepDigestibleEnergyFromTdn,
  computeSwineDigestibleFat,
  computeSwineMetabolizableEnergyFromDe,
  estimateCattleDryMatterIntakePctBw,
} from "../src/utils/equations";

describe("Konversi basis As-Fed <-> Bahan Kering (src/utils/basis.ts)", () => {
  it("mengonversi PK jagung 8,5% AF (BK 86%) menjadi 9,8837% DM sesuai domain nutrisi", () => {
    const dmProtein = convertNutrientValue(8.5, "as_fed", "dry_matter", 86);
    expect(dmProtein).toBeCloseTo((8.5 * 100) / 86, 6);

    const backToAf = convertNutrientValue(dmProtein, "dry_matter", "as_fed", 86);
    expect(backToAf).toBeCloseTo(8.5, 6);
  });

  it("mempertahankan nilai null (N/A) dan nilai 0 eksplisit tanpa tercampur saat konversi basis", () => {
    expect(convertNutrientValue(null, "as_fed", "dry_matter", 89)).toBeNull();
    expect(convertNutrientValue(0, "as_fed", "dry_matter", 89)).toBe(0);
  });

  it("menolak dryMatter <= 0 atau > 100 dengan RangeError", () => {
    expect(() => convertNutrientValue(10, "as_fed", "dry_matter", 0)).toThrow(RangeError);
    expect(() => convertNutrientValue(10, "as_fed", "dry_matter", -5)).toThrow(RangeError);
    expect(() => convertNutrientValue(10, "as_fed", "dry_matter", 105)).toThrow(RangeError);
    expect(() => convertPriceToModelBasis(5000, "dry_matter", 0)).toThrow(RangeError);
  });

  it("menormalkan harga ke basis BK dan menghitung proporsi penimbangan As-Fed hijauan basah (BK 22%)", () => {
    const corn = MOCK_INGREDIENTS.find((i) => i.id === "corn-ground")!;
    const napier = MOCK_INGREDIENTS.find((i) => i.id === "napier-grass")!;

    // Napier BK 22%, harga AF Rp450/kg -> harga BK Rp450 * 100 / 22 ≈ Rp2.045,45/kg BK
    expect(convertPriceToModelBasis(napier.pricePerKg, "dry_matter", napier.dryMatter)).toBeCloseTo(
      (450 * 100) / 22,
      4,
    );

    const normalizedCorn = normalizeIngredientToBasis(corn, "dry_matter");
    expect(normalizedCorn.basis).toBe("dry_matter");
    expect(normalizedCorn.nutrients.cp).toBeCloseTo((8.5 * 100) / 89, 6);

    // 50% BK rumput gajah (BK 22%) + 50% BK jagung (BK 89%) -> porsi segar As-Fed didominasi air rumput gajah
    const afMap = computeAsFedFractions(
      [
        { ingredient: napier, fraction: 0.5 },
        { ingredient: corn, fraction: 0.5 },
      ],
      "dry_matter",
    );
    const napierAf = afMap.get(napier.id) ?? 0;
    const cornAf = afMap.get(corn.id) ?? 0;

    expect(napierAf + cornAf).toBeCloseTo(1, 8);
    expect(napierAf).toBeCloseTo(0.5 / 22 / (0.5 / 22 + 0.5 / 89), 6);
    expect(napierAf).toBeGreaterThan(0.8);
  });
});

describe("Persamaan dEB/DCAD & Regresi Energi (src/utils/equations.ts)", () => {
  it("menghitung dEB dan DCAD serta menangkap penurunan akibat ion klorida (Cl-) pada L-Lysine HCl", () => {
    const baseDiet = computeElectrolyteBalance({ na: 1800, k: 8500, cl: 2200, s: 2000 });
    const withHcl = computeElectrolyteBalance({ na: 1800, k: 8500, cl: 3600, s: 2000 });

    const expectedDeb = 1800 / 23.0 + 8500 / 39.1 - 2200 / 35.5;
    const expectedDcad = expectedDeb - (2 * 2000) / 32.1;

    expect(baseDiet.deb).toBeCloseTo(expectedDeb, 4);
    expect(baseDiet.dcad).toBeCloseTo(expectedDcad, 4);
    expect(withHcl.deb).toBeLessThan(baseDiet.deb);
    expect(withHcl.dcad).toBeLessThan(baseDiet.dcad);
  });

  it("menghitung ME WPSA unggas dan menjepit nilai negatif pada persamaan energi/lemak babi di >= 0", () => {
    const cornMeMj = computePoultryMeWpsaMjPerKg({
      cp: 85,
      cfat: 38,
      sugar: 20,
      starch: 640,
    });
    expect(cornMeMj).toBeCloseTo((15.51 * 85 + 34.31 * 38 + 13.01 * 20 + 16.69 * 640) / 1000, 4);

    const cornMeKcal = computePoultryMeFromProximatePct({
      cp: 8.5,
      cfat: 3.8,
      sugar: 2.0,
      starch: 64.0,
    });
    expect(cornMeKcal).toBeCloseTo((cornMeMj * 1000) / 4.184, 1);

    // Bahan tinggi serat & lemak sangat rendah tidak boleh menghasilkan DEE negatif (safety clamp >= 0)
    expect(computeSwineDigestibleFat(0.5, 40)).toBe(0);
    expect(computeSwineDigestibleFat(10, 10)).toBeCloseTo(0.82 * 10 - 0.02 * 10 - 0.7, 6);
  });

  it("menghitung persamaan nutrisi ruminansia & babi Hartadi (1980), Garrett (1977), NRC (1988) & Kearl (1982)", () => {
    expect(computeRuminantRoughageDigestibleProtein(10)).toBeCloseTo(0.908 * 10 - 3.77, 5);
    expect(computeRuminantRoughageDigestibleProtein(3.4)).toBe(0);

    expect(computeCattleDigestibleEnergyFromTdn(68)).toBeCloseTo(0.04409 * 68, 4);
    expect(computeSheepDigestibleEnergyFromTdn(79)).toBeCloseTo(0.04409 * 79, 4);

    // Jagung/bahan TDN 80% -> DE ~3.54 Mcal/kg: ME regresi (-0.45 + 1.01*DE = 3.125) vs 0.82*DE
    expect(computeCattleMetabolizableEnergyFromDe(3.54, "hartadi_regression")).toBeCloseTo(
      -0.45 + 1.01 * 3.54,
      4,
    );
    expect(computeCattleMetabolizableEnergyFromDe(3.54, "garrett_082")).toBeCloseTo(0.82 * 3.54, 4);
    expect(computeCattleMetabolizableEnergyFromDe(0.31, "hartadi_regression")).toBe(0);

    const garrett = computeCattleNetEnergyGainGarrett1977(3.54);
    expect(garrett.me).toBeCloseTo(0.82 * 3.54, 4);
    expect(garrett.nem).toBeCloseTo(computeCattleNetEnergyMaintenance(garrett.me), 6);
    expect(garrett.neg).toBeCloseTo(computeCattleNetEnergyGain(garrett.me), 6);
    expect(garrett.nem).toBeGreaterThan(garrett.neg);

    expect(computeCattleNetEnergyLactation(80)).toBeCloseTo(-0.12 + 0.0245 * 80, 4);
    expect(computeCattleNetEnergyLactation(4)).toBe(0);

    expect(computeSwineMetabolizableEnergyFromDe(3600, 15)).toBeCloseTo(
      (0.96 - 0.00202 * 15) * 3600,
      2,
    );

    // FCM 4% & Interpolasi Bilinear Tabel 6-1 NRC (1988)
    expect(computeFatCorrectedMilk4Pct(20, 4.0)).toBeCloseTo(20, 6);
    expect(computeFatCorrectedMilk4Pct(20, 3.5)).toBeCloseTo(18.5, 6);
    expect(estimateCattleDryMatterIntakePctBw(500, 25)).toBeCloseTo(3.5, 4);
    expect(estimateCattleDryMatterIntakePctBw(550, 25)).toBeCloseTo(3.35, 4);
    // Clamping aman pada sudut '-' Tabel 6-1 (BB 400 kg, FCM 60 kg -> ikut batas max 400 kg = 5.5%)
    expect(estimateCattleDryMatterIntakePctBw(400, 60)).toBeCloseTo(5.5, 4);

    // Kearl (1982) Table 15 Laktasi: BB 400 kg + 10 kg susu 4.0% lemak
    const lact = computeKearlLactationRequirement(
      { dmiKg: 11.0, meMcal: 11.2, tdnKg: 3.1, cpG: 480, caG: 16, pG: 13 },
      10,
      4.0,
    );
    expect(lact.dmiKg).toBe(11.0);
    expect(lact.mePctOrMcalPerKgDm).toBeCloseTo((11.2 + 10 * 1.14) / 11.0, 4);
    expect(lact.tdnPctDm).toBeCloseTo(((3.1 + 10 * 0.31) / 11.0) * 100, 2);
    expect(lact.cpPctDm).toBeCloseTo(((480 + 10 * 79) / 11000) * 100, 2);
    expect(lact.caPctDm).toBeCloseTo(((16 + 10 * 2.7) / 11000) * 100, 2);
    expect(lact.pPctDm).toBeCloseTo(((13 + 10 * 2.0) / 11000) * 100, 2);
  });
});
