import type { FormulationConfig, FormulationResult, Ingredient, Requirement } from "../types";
import { computeCriticalRegionStepping, type CriticalStep } from "./criticalStepping";
import type { SolverWorkerRequest, SolverWorkerResponse } from "./highs.worker";
import type { LpSolveOutput } from "./highsTypes";
import { solveFormulationWithRunner, type SolveOptions } from "./solveFormulation";

interface PendingRequest {
  readonly resolve: (value: LpSolveOutput | undefined) => void;
  readonly reject: (reason: Error) => void;
}

let workerSingleton: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

function rejectAllAndResetWorker(message: string): void {
  const err = new Error(message);
  for (const [, pending] of pendingRequests) {
    pending.reject(err);
  }
  pendingRequests.clear();
  if (workerSingleton) {
    workerSingleton.terminate();
    workerSingleton = null;
  }
}

function getOrCreateWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new Worker(new URL("./highs.worker.ts", import.meta.url), {
      type: "module",
    });

    workerSingleton.addEventListener("message", (event: MessageEvent<SolverWorkerResponse>) => {
      const msg = event.data;
      const pending = pendingRequests.get(msg.id);
      if (!pending) return;
      pendingRequests.delete(msg.id);

      if (!msg.ok) {
        pending.reject(new Error(msg.error));
        return;
      }

      if (msg.type === "prewarm") {
        pending.resolve(undefined);
        return;
      }

      pending.resolve(msg.output);
    });

    workerSingleton.addEventListener("error", (event) => {
      rejectAllAndResetWorker(
        event.message ? `HiGHS Worker error: ${event.message}` : "HiGHS Worker mengalami crash.",
      );
    });
  }

  return workerSingleton;
}

async function runLpThroughWorker(lpString: string): Promise<LpSolveOutput> {
  // Lingkungan tanpa Web Worker (mis. Vitest JSDOM / SSR): jalankan instance HiGHS Node langsung.
  if (typeof Worker === "undefined") {
    const { solveLpInNode } = await import("./highsNodeRunner");
    return solveLpInNode(lpString);
  }

  const worker = getOrCreateWorker();
  const id = nextRequestId++;

  return new Promise<LpSolveOutput>((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: (output) => {
        if (!output) {
          reject(new Error("Worker mengembalikan respons kosong untuk request solve."));
          return;
        }
        resolve(output);
      },
      reject,
    });

    const request: SolverWorkerRequest = { id, type: "solve", lpString };
    worker.postMessage(request);
  });
}

export function prewarmSolver(): void {
  if (typeof Worker === "undefined") return;
  try {
    const worker = getOrCreateWorker();
    const id = nextRequestId++;
    pendingRequests.set(id, {
      resolve: () => undefined,
      reject: () => undefined,
    });
    const request: SolverWorkerRequest = { id, type: "prewarm" };
    worker.postMessage(request);
  } catch {
    // Abaikan prewarm bila browser menunda worker; solve tetap menginisialisasi ulang.
  }
}

export async function solveFormulation(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  options?: SolveOptions,
): Promise<FormulationResult> {
  return solveFormulationWithRunner(ingredients, requirement, config, runLpThroughWorker, options);
}

/** PR-02: Kurva tangga Buy/No-Buy parametrik di Web Worker (otomatis fallback di Node/test). */
export async function computeCriticalPriceLadder(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  targetIngredientId: string,
  options?: SolveOptions,
): Promise<readonly CriticalStep[]> {
  return computeCriticalRegionStepping(
    ingredients,
    requirement,
    config,
    runLpThroughWorker,
    targetIngredientId,
    options,
  );
}
