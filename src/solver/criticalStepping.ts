import type { FormulationConfig, FormulationResult, Ingredient, Requirement } from "../types";
import type { LpRunner } from "./highsTypes";
import { solveFormulationWithRunner, type SolveOptions } from "./solveFormulation";

export interface CriticalStep {
  readonly price: number;
  readonly status: FormulationResult["status"];
  readonly costPerKg: number | null;
  readonly composition: FormulationResult["composition"];
}

/** Batas iterasi rantai breakpoint; cukup untuk formula praktis (biasanya < 10 lompatan). */
const MAX_CHAIN = 20;
/** Geser kecil agar tepat melewati breakpoint, bukan duduk di atasnya (basis degenerat). */
const STEP_EPS = 1e-6;

/**
 * PR-02: parametric stepping eksak. Mulai dari harga dasar target, geser c_j sampai
 * breakpoint `colCostDown/Up` (batas rentang harga aman), lewati dengan +ε, lalu
 * ulangi dari basis baru. Menghasilkan kurva tangga Buy/No-Buy sampai basis stabil.
 */
export async function computeCriticalRegionStepping(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  targetIngredientId: string,
  options: SolveOptions = {},
): Promise<readonly CriticalStep[]> {
  const withPrice = (p: number) =>
    ingredients.map((ing) => (ing.id === targetIngredientId ? { ...ing, pricePerKg: p } : ing));

  const basePrice = ingredients.find((i) => i.id === targetIngredientId)?.pricePerKg ?? 0;
  const base = await solveFormulationWithRunner(ingredients, requirement, config, solveLp, options);
  if (base.status === "infeasible" || base.status === "error") return [];

  const steps: CriticalStep[] = [
    {
      price: basePrice,
      status: base.status,
      costPerKg: base.costPerKg,
      composition: base.composition,
    },
  ];

  const walk = async (direction: 1 | -1) => {
    let current = steps[0]!;
    for (let i = 0; i < MAX_CHAIN; i++) {
      const comp = current.composition.find((c) => c.ingredientId === targetIngredientId);
      const breakpoint = direction > 0 ? comp?.priceRange?.maxPrice : comp?.priceRange?.minPrice;

      // Tanpa breakpoint berhingga, basis tidak berubah lagi di arah ini.
      if (breakpoint === null || breakpoint === undefined || !Number.isFinite(breakpoint)) return;

      const nextPrice = breakpoint + direction * STEP_EPS;
      const res = await solveFormulationWithRunner(
        withPrice(nextPrice),
        requirement,
        config,
        solveLp,
        options,
      );
      if (res.status === "infeasible" || res.status === "error") return;
      if (current.composition.every((c, idx) => c.fraction === res.composition[idx]?.fraction))
        return;

      current = {
        price: nextPrice,
        status: res.status,
        costPerKg: res.costPerKg,
        composition: res.composition,
      };
      steps.push(current);
    }
  };

  await walk(1);
  await walk(-1);

  return [...steps].sort((a, b) => a.price - b.price);
}
