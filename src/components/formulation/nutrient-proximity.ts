import type { NutrientResult } from "../../types";

export interface NutrientProximityMeter {
  readonly pct: number;
  readonly tone: "exact" | "over" | "alert" | "neutral";
  readonly isOver: boolean;
}

function calcProximityAccuracyPct(diffAbs: number, ref: number): number {
  if (!Number.isFinite(diffAbs) || !Number.isFinite(ref)) return 0;
  if (ref <= 0) return diffAbs <= 1e-4 ? 100 : 0;
  return Math.max(0, Math.min(100, (1 - diffAbs / ref) * 100));
}

/**
 * Menghitung meter kedekatan target nutrien:
 * - Tepat target (atau di dalam rentang min–max): 100% penuh (hijau `exact`)
 * - Kurang ATAU berlebih (over) dari target: menurunkan bar secara proporsional < 100%
 *   dan membedakan warna `over` (amber) / `alert` (danger) agar tidak tetap hijau penuh saat berlebih.
 */
export function computeNutrientProximityMeter(params: {
  readonly actual: number | undefined;
  readonly min: number | undefined;
  readonly max: number | undefined;
  readonly singleMode: boolean;
  readonly singleTarget: number | null;
  readonly isUpperOnly: boolean;
  readonly status: NutrientResult["status"] | undefined;
}): NutrientProximityMeter {
  const { actual, min, max, singleMode, singleTarget, isUpperOnly, status } = params;
  if (actual === undefined || !Number.isFinite(actual)) {
    return { pct: 0, tone: "neutral", isOver: false };
  }

  if (singleMode) {
    if (singleTarget === null || !Number.isFinite(singleTarget)) {
      return { pct: 0, tone: "neutral", isOver: false };
    }
    const tol = Math.max(1e-4, Math.abs(singleTarget) * 1e-3);
    if (isUpperOnly) {
      if (actual <= singleTarget + tol) {
        return { pct: 100, tone: "exact", isOver: false };
      }
      const pct = Math.min(99, calcProximityAccuracyPct(actual - singleTarget, singleTarget));
      return { pct, tone: "alert", isOver: true };
    }

    const diff = actual - singleTarget;
    if (Math.abs(diff) <= tol) {
      return { pct: 100, tone: "exact", isOver: false };
    }
    if (diff > tol) {
      const pct = Math.min(99, calcProximityAccuracyPct(diff, singleTarget));
      return {
        pct,
        tone: status === "above_max" ? "alert" : "over",
        isOver: true,
      };
    }
    const pct = Math.min(99, calcProximityAccuracyPct(-diff, singleTarget));
    return { pct, tone: "alert", isOver: false };
  }

  if (min !== undefined && max !== undefined) {
    if (actual >= min - 1e-4 && actual <= max + 1e-4) {
      return { pct: 100, tone: "exact", isOver: false };
    }
    if (actual < min - 1e-4) {
      const pct = Math.min(99, calcProximityAccuracyPct(min - actual, min));
      return { pct, tone: "alert", isOver: false };
    }
    const pct = Math.min(99, calcProximityAccuracyPct(actual - max, max));
    return { pct, tone: "alert", isOver: true };
  }

  if (min !== undefined) {
    const tol = Math.max(1e-4, Math.abs(min) * 1e-3);
    if (Math.abs(actual - min) <= tol) {
      return { pct: 100, tone: "exact", isOver: false };
    }
    if (actual > min + tol) {
      const pct = Math.min(99, calcProximityAccuracyPct(actual - min, min));
      return { pct, tone: "over", isOver: true };
    }
    const pct = Math.min(99, calcProximityAccuracyPct(min - actual, min));
    return { pct, tone: "alert", isOver: false };
  }

  if (max !== undefined) {
    if (actual <= max + 1e-4) {
      return { pct: 100, tone: "exact", isOver: false };
    }
    const pct = Math.min(99, calcProximityAccuracyPct(actual - max, max));
    return { pct, tone: "alert", isOver: true };
  }

  return { pct: 0, tone: "neutral", isOver: false };
}
