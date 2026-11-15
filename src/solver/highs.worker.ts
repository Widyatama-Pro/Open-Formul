import highsLoader, { type Highs } from "highs";
import wasmUrl from "highs/runtime?url";
import { executeHighsInstance, type LpSolveOutput } from "./highsTypes";

export type SolverWorkerRequest =
  | { readonly id: number; readonly type: "prewarm" }
  | { readonly id: number; readonly type: "solve"; readonly lpString: string };

export type SolverWorkerResponse =
  | { readonly id: number; readonly ok: true; readonly type: "prewarm" }
  | {
      readonly id: number;
      readonly ok: true;
      readonly type: "solve";
      readonly output: LpSolveOutput;
    }
  | { readonly id: number; readonly ok: false; readonly error: string };

let workerHighsPromise: Promise<Highs> | null = null;

async function getWorkerHighs(): Promise<Highs> {
  if (!workerHighsPromise) {
    workerHighsPromise = highsLoader({
      locateFile: () => wasmUrl,
    }).catch((err: unknown) => {
      workerHighsPromise = null;
      throw err;
    });
  }
  return workerHighsPromise;
}

function reply(payload: SolverWorkerResponse): void {
  self.postMessage(payload);
}

self.addEventListener("message", (event: MessageEvent<SolverWorkerRequest>) => {
  const req = event.data;

  if (req.type === "prewarm") {
    void getWorkerHighs()
      .then(() => {
        reply({ id: req.id, ok: true, type: "prewarm" });
      })
      .catch((err: unknown) => {
        reply({
          id: req.id,
          ok: false,
          error: err instanceof Error ? err.message : "Gagal memuat HiGHS WASM.",
        });
      });
    return;
  }

  void getWorkerHighs()
    .then((highs) => {
      const output = executeHighsInstance(highs, req.lpString);
      reply({ id: req.id, ok: true, type: "solve", output });
    })
    .catch((err: unknown) => {
      workerHighsPromise = null;
      reply({
        id: req.id,
        ok: false,
        error: err instanceof Error ? err.message : "Gagal menjalankan HiGHS LP di Worker.",
      });
    });
});
