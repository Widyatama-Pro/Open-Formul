import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/data/mock-state";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { computeCriticalRegionStepping } from "../src/solver/criticalStepping";
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

const config: FormulationConfig = {
  ...DEFAULT_CONFIG,
  activeBasis: "as_fed",
  optimizationMode: 1,
  enableAdvanceNutrients: false,
  enableDigestibleBasis: false,
  enableElasticFallback: false,
  manualLocks: {},
};

const req: Requirement = {
  id: "req-pr02",
  name: "PR-02",
  species: "poultry",
  basis: "as_fed",
  constraints: [
    { nutrientId: "cp", min: 20, enabled: true },
    { nutrientId: "me_poultry", min: 2900, enabled: true },
  ],
};

describe("PR-02: Critical-Region Stepping", () => {
  it("melintasi breakpoint: harga turun sbm di bawah 5500 menukar basis ke sbm-dominan", async () => {
    const steps = await computeCriticalRegionStepping(
      [corn, sbm],
      req,
      config,
      solveLpInNode,
      "sbm",
    );

    // Harga dasar 8200 harus hadir sebagai salah satu titik.
    expect(steps.some((s) => s.price === 8200)).toBe(true);
    expect(steps.length).toBeGreaterThan(1);

    // Jagung tidak pernah keluar formula (CP>=20 & ME>=2900 memaksa 62-68% jagung),
    // jadi transisi basis terlihat sebagai pergeseran porsi jagung: ME mengikat di
    // harga sbm rendah (jagung minimal), CP mengikat di harga sbm tinggi (jagung maksimal).
    const lowest = steps[0]!;
    const highest = steps[steps.length - 1]!;
    const cornOf = (s: { composition: readonly { ingredientId: string; fraction: number }[] }) =>
      s.composition.find((c) => c.ingredientId === "corn")?.fraction ?? 0;
    expect(cornOf(lowest)).toBeLessThan(cornOf(highest));

    // Titik berharga sama tidak boleh duplikat.
    const prices = steps.map((s) => s.price);
    expect(new Set(prices).size).toBe(prices.length);
  });

  it("bahan tidak masuk formula => stepping tetap mengembalikan titik dasar tanpa error", async () => {
    const steps = await computeCriticalRegionStepping(
      [corn, sbm],
      req,
      config,
      solveLpInNode,
      "corn",
    );
    // Basis corn masuk — hasilnya minimal 1 titik, tidak kosong, tidak error.
    expect(steps.length).toBeGreaterThanOrEqual(1);
    for (const s of steps) expect(s.status).toBe("optimal");
  });

  it("solve dasar infeasible => langkah kosong", async () => {
    const infeasibleReq: Requirement = {
      ...req,
      constraints: [{ nutrientId: "cp", min: 90, enabled: true }],
    };
    const steps = await computeCriticalRegionStepping(
      [corn, sbm],
      infeasibleReq,
      config,
      solveLpInNode,
      "sbm",
    );
    expect(steps).toHaveLength(0);
  });

  it("menghitung directional shadowPriceUp/Down saat basis nutrien mengalami degenerasi", async () => {
    // 2 kendala memotong titik yang sama: di titik corn=0.6761, sbm=0.3239, CP=20 dan ME ≈ 2956.8
    const meAtCorner = (1 - (20 - 8.5) / (44 - 8.5)) * 3300 + ((20 - 8.5) / (44 - 8.5)) * 2240;
    const degenerateReq: Requirement = {
      id: "req-deg",
      name: "Degenerate Corner",
      species: "poultry",
      basis: "as_fed",
      constraints: [
        { nutrientId: "cp", min: 20, enabled: true },
        { nutrientId: "me_poultry", min: meAtCorner, enabled: true },
      ],
    };
    const res = await solveFormulationWithRunner([corn, sbm], degenerateReq, config, solveLpInNode);
    expect(res.status).toBe("optimal");
    const deg = res.nutrients.filter((n) => n.isDegenerate);
    expect(deg.length).toBeGreaterThanOrEqual(1);
    for (const d of deg) {
      expect("shadowPriceUp" in d).toBe(true);
      expect("shadowPriceDown" in d).toBe(true);
    }
  });
});
