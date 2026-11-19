import { describe, expect, it } from "vitest";
import { FEED_CLASSES, resolveFeedClass } from "../src/data/feed-classes";
import { DEFAULT_CONFIG, MOCK_INGREDIENTS, SNI_REQUIREMENTS } from "../src/data/mock-state";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";

describe("Standar SNI Bertahun Terbit & 8 Klasifikasi Bahan Pakan Standar", () => {
  it("memuat seluruh tabel SNI unggas dan ruminansia lengkap dengan nomor dan tahun terbit", () => {
    expect(SNI_REQUIREMENTS.length).toBeGreaterThanOrEqual(20);
    for (const req of SNI_REQUIREMENTS) {
      expect(req.name).toMatch(/SNI\s+[\d.-]+:\d{4}/);
      expect(req.source).toMatch(/SNI\s+[\d.-]+:\d{4}/);
      for (const c of req.constraints) {
        if (c.min !== undefined && c.max !== undefined) {
          expect(c.min).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  it("mengelompokkan seluruh katalog bahan ke 8 kelas bahan pakan standar secara valid", () => {
    expect(FEED_CLASSES).toHaveLength(8);
    const counts = new Map<number, number>();
    for (const ing of MOCK_INGREDIENTS) {
      const code = resolveFeedClass(ing);
      expect(code).toBeGreaterThanOrEqual(1);
      expect(code).toBeLessThanOrEqual(8);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    // Kelas utama (1 hijauan kering, 2 hijauan segar, 4 energi, 5 protein, 6 mineral, 7 vitamin/premix, 8 aditif) harus terisi
    expect(counts.get(1) ?? 0).toBeGreaterThan(0);
    expect(counts.get(2) ?? 0).toBeGreaterThan(0);
    expect(counts.get(4) ?? 0).toBeGreaterThan(0);
    expect(counts.get(5) ?? 0).toBeGreaterThan(0);
    expect(counts.get(6) ?? 0).toBeGreaterThan(0);
    expect(counts.get(7) ?? 0).toBeGreaterThan(0);
    expect(counts.get(8) ?? 0).toBeGreaterThan(0);
  });

  it("menyelesaikan preset SNI 8173.2:2015 (Broiler Starter) ke status Optimal dengan HiGHS", async () => {
    const req = SNI_REQUIREMENTS.find((r) => r.id === "sni-8173-2-2015");
    expect(req).toBeDefined();

    const res = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      req!,
      { ...DEFAULT_CONFIG, activeBasis: "as_fed", optimizationMode: 1 },
      solveLpInNode,
    );
    expect(res.status).toBe("optimal");
    const cp = res.nutrients.find((n) => n.nutrientId === "cp")?.value ?? 0;
    const me = res.nutrients.find((n) => n.nutrientId === "me_poultry")?.value ?? 0;
    expect(cp).toBeGreaterThanOrEqual(20 - 1e-4);
    expect(me).toBeGreaterThanOrEqual(3000 - 1e-3);
  });
});
