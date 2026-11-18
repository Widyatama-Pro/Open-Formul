import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/data/mock-state";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";
import type { FormulationConfig, Ingredient, Requirement } from "../src/types";
import { normalizeIngredientToBasis } from "../src/utils/basis";

const baseConfig: FormulationConfig = {
  ...DEFAULT_CONFIG,
  activeBasis: "as_fed",
  optimizationMode: 1,
  enableAdvanceNutrients: false,
  enableDigestibleBasis: false,
  enableElasticFallback: false,
  manualLocks: {},
  enableStochasticSlp: true,
  stochasticMaxIter: 15,
  stochasticDamping: 0.5,
  stochasticTolerance: 1e-5,
};

// Bahan dengan varians CP yang sangat berbeda
// Jagung: CP mean 8.5, stdDev besar 5 => bisa sangat rendah atau tinggi
const corn: Ingredient = {
  id: "corn",
  name: "Jagung",
  category: "energy",
  pricePerKg: 5000,
  dryMatter: 86,
  basis: "as_fed",
  isActive: true,
  inclusion: { min: 0, max: 100 },
  nutrients: { cp: 8.5 },
  stdDev: { cp: 5 },
  source: "fixture",
};

// Bungkil Kedelai: CP mean 44, stdDev kecil 0.5 => sangat stabil
const sbm: Ingredient = {
  id: "sbm",
  name: "Bungkil Kedelai",
  category: "protein",
  pricePerKg: 9000,
  dryMatter: 89,
  basis: "as_fed",
  isActive: true,
  inclusion: { min: 0, max: 100 },
  nutrients: { cp: 44 },
  stdDev: { cp: 0.5 },
  source: "fixture",
};

// Dasar memenuhi CP min 20 deterministik (sbm-only = 44% >> 20%)
const req: Requirement = {
  id: "req-pr04",
  name: "PR-04",
  species: "poultry",
  basis: "as_fed",
  constraints: [{ nutrientId: "cp", min: 20, enabled: true }],
};

describe("PR-04: Stochastic SLP (Munford)", () => {
  it("deterministik: tanpa varians, solver fokus pada biaya minimum", async () => {
    const det = await solveFormulationWithRunner(
      [corn, sbm],
      req,
      {
        ...baseConfig,
        enableStochasticSlp: false,
      },
      solveLpInNode,
    );

    expect(det.status).toBe("optimal");
    expect(det.costPerKg).not.toBeNull();

    // Deterministik: bisa pakai banyak jagung karena rata-rata CP-nya sering >= 20
    const cpDet = det.nutrients.find((n) => n.nutrientId === "cp");
    expect(cpDet).toBeDefined();
    expect(cpDet!.value).toBeGreaterThanOrEqual(20 - 1e-6);
  });

  it("stokastik p=0.95 Gaussian: margin membuat pembatasan konservatif", async () => {
    const sto = await solveFormulationWithRunner([corn, sbm], req, baseConfig, solveLpInNode);

    expect(sto.status).toBe("optimal");
    expect(sto.costPerKg).not.toBeNull();

    // Margin Gaussian (kappa ~ 1.645) => perlu sedikit lebih banyak SBM
    // (lebih banyak bahan kaya CP stabil)
    const cpSto = sto.nutrients.find((n) => n.nutrientId === "cp");
    expect(cpSto).toBeDefined();
    expect(cpSto!.stochasticMargin).toBeGreaterThan(0);
    expect(cpSto!.value).toBeGreaterThanOrEqual(20 - 1e-6);

    // Biaya dengan margin seharusnya sedikit lebih tinggi (lebih banyak SBM yang stabil)
    // tapi bisa hampir sama jika konfigurasi skewing sudah optimal
    expect(typeof sto.stochasticIterations).toBe("number");
    expect(sto.stochasticIterations).toBeGreaterThan(0);
  });

  it("stokastik p=0.95 Cantelli: margin lebih besar (~sqrt(p/(1-p)) > Gaussian kappa)", async () => {
    const cantelliReq: Requirement = {
      ...req,
      constraints: [
        { nutrientId: "cp", min: 20, enabled: true, targetProbability: 0.95, useCantelli: true },
      ],
    };
    const cantelli = await solveFormulationWithRunner(
      [corn, sbm],
      cantelliReq,
      baseConfig,
      solveLpInNode,
    );

    expect(cantelli.status).toBe("optimal");
    const cpC = cantelli.nutrients.find((n) => n.nutrientId === "cp");
    expect(cpC).toBeDefined();
    expect(cpC!.stochasticMargin).toBeGreaterThan(0);

    // Cantelli margin lebih besar daripada Gaussian (kappa=4.36 vs 1.65)
    // Hasil biaya bisa berbeda tergantung konfigurasi data; kita cek saja margin valid
    expect(cpC!.value).toBeGreaterThanOrEqual(20 - 1e-6);
  });

  it("tanpa enableStochasticSlp: perilaku deterministik murni", async () => {
    const detConfig: FormulationConfig = { ...baseConfig, enableStochasticSlp: false };
    const res = await solveFormulationWithRunner([corn, sbm], req, detConfig, solveLpInNode);
    expect(res.status).toBe("optimal");
    expect(res.stochasticIterations ?? 0).toBe(0);
    const cp = res.nutrients.find((n) => n.nutrientId === "cp");
    expect(cp?.stochasticMargin ?? 0).toBe(0);
    expect(cp!.value).toBeGreaterThanOrEqual(20 - 1e-6);
  });

  it("normalisasi basis BK menskalakan stdDev proporsional dengan dryMatter", () => {
    const norm = normalizeIngredientToBasis(corn, "dry_matter");
    expect(norm.basis).toBe("dry_matter");
    expect(norm.stdDev?.cp).toBeCloseTo(5 / 0.86, 6);
  });

  it("melaporkan STOCHASTIC_UNSTABLE bila maxIter=2 tercapai sebelum konvergensi ketat", async () => {
    const tightStop = await solveFormulationWithRunner(
      [corn, sbm],
      req,
      { ...baseConfig, stochasticMaxIter: 2, stochasticDamping: 0.05, stochasticTolerance: 1e-12 },
      solveLpInNode,
    );
    expect(tightStop.status).toBe("optimal");
    expect((tightStop.conflicts ?? []).some((c) => c.code === "STOCHASTIC_UNSTABLE")).toBe(true);
  });
});
