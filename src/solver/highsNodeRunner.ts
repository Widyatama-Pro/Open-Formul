import highsLoader, { type Highs } from "highs";
import { executeHighsInstance, type LpSolveOutput } from "./highsTypes";

let nodeHighsPromise: Promise<Highs> | null = null;

async function getNodeHighs(): Promise<Highs> {
  if (!nodeHighsPromise) {
    nodeHighsPromise = highsLoader();
  }
  return nodeHighsPromise;
}

export async function solveLpInNode(lpString: string): Promise<LpSolveOutput> {
  const highs = await getNodeHighs();
  return executeHighsInstance(highs, lpString);
}
