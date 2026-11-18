import type { Highs, HighsSolution } from "highs";

export type { Highs, HighsSolution };

export interface LpSolveRanging {
  readonly colCostUp: readonly number[];
  readonly colCostDown: readonly number[];
  readonly rowBoundUp: readonly number[];
  readonly rowBoundDown: readonly number[];
}

export interface LpSolveOutput {
  readonly solution: HighsSolution;
  readonly ranging?: LpSolveRanging;
}

export type LpRunner = (lpString: string) => Promise<LpSolveOutput>;

/**
 * Mengeksekusi LP lewat simplex HiGHS (`presolve: "off"`) agar status dual & basis akurat,
 * lalu mengekstrak cost sensitivity ranging bila tersedia dan solusi `Optimal`.
 */
export function executeHighsInstance(highs: Highs, lpString: string): LpSolveOutput {
  const solution = highs.solve(lpString, {
    solver: "simplex",
    presolve: "off",
  });

  if (solution.Status !== "Optimal") {
    return { solution };
  }

  try {
    const ranging = highs.withModel({ format: "lp", data: lpString }, (model) => {
      const runStatus = model.run();
      if (runStatus.modelStatus !== 7) {
        return undefined;
      }
      const rawRanging = model.getRanging();
      return {
        colCostUp: Array.from(rawRanging.colCostUp.value),
        colCostDown: Array.from(rawRanging.colCostDown.value),
        rowBoundUp: Array.from(rawRanging.rowBoundUp.value),
        rowBoundDown: Array.from(rawRanging.rowBoundDown.value),
      };
    });
    return ranging ? { solution, ranging } : { solution };
  } catch {
    return { solution };
  }
}
