import { describe, expect, it } from "vitest";
import { MOCK_INGREDIENTS } from "../src/data/mock-state";
import {
  computeAsFedFractions,
  convertNutrientValue,
  convertPriceToModelBasis,
  normalizeIngredientToBasis,
} from "../src/utils/basis";
import {
  computeElectrolyteBalance,
  computePoultryMeFromProximatePct,
  computePoultryMeWpsaMjPerKg,
  computeSwineDigestibleFat,
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
});
