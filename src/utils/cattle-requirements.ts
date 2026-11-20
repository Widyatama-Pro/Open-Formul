import type { Requirement } from "../types";
import { computeFatCorrectedMilk4Pct } from "./equations";

export type BeefPhysiologicalState =
  "growth" | "gestation_heifer" | "gestation_cow" | "work_moderate" | "work_heavy";

export type DairyStandard = "kearl_1982" | "nrc_1988";

export interface DynamicBeefInput {
  readonly bodyWeightKg: number;
  readonly adgKgPerDay: number;
  readonly physiologicalState?: BeefPhysiologicalState;
}

export interface DynamicDairyInput {
  readonly bodyWeightKg: number;
  readonly milkKgPerDay: number;
  readonly fatPct: number;
  readonly standard?: DairyStandard;
  readonly isDryPregnant?: boolean;
}

export interface DynamicCattleRequirementResult {
  readonly requirement: Requirement;
  readonly dmiKg: number;
  readonly fcm4PctKg?: number;
  readonly isExtrapolated: boolean;
  readonly sourceLabel: string;
}

interface DailyNeedsRow {
  readonly bw: number;
  readonly gain: number;
  readonly dmi: number;
  readonly me: number;
  readonly tdn: number;
  readonly cp: number; // g/day
  readonly ca: number; // g/day
  readonly p: number; // g/day
}

/**
 * Kearl (1982) Table 14 — Maintenance & Growth (150–450 kg, jagged ADG grid).
 * ERRATUM GUARD: Pada tabel cetak asli Kearl (1982) Table 14, baris BB 300 kg PBBH 1.10 kg
 * tertulis dmi=7.3, me=22.11, tdn=6.1 (salinan persis baris BB 350 kg PBBH 1.10 yang menyebabkan
 * lonjakan tidak masuk akal ke 83.6% TDN). Di sini disanitasi konsisten dengan kurva 300 kg
 * (dmi=7.6, me=19.78, tdn=5.46 -> 71.8% TDN, setara tetangga 250/350 kg di 71.8–72.7% TDN).
 */
const KEARL_BEEF_GROWTH_ROWS: readonly DailyNeedsRow[] = [
  { bw: 150, gain: 0.0, dmi: 3.3, me: 5.25, tdn: 1.6, cp: 234, ca: 5, p: 5 },
  { bw: 150, gain: 0.25, dmi: 4.0, me: 6.76, tdn: 1.9, cp: 414, ca: 13, p: 11 },
  { bw: 150, gain: 0.5, dmi: 4.2, me: 8.26, tdn: 2.3, cp: 513, ca: 14, p: 12 },
  { bw: 150, gain: 0.75, dmi: 4.4, me: 9.76, tdn: 2.7, cp: 552, ca: 19, p: 15 },
  { bw: 150, gain: 1.0, dmi: 4.5, me: 11.26, tdn: 3.1, cp: 623, ca: 25, p: 18 },

  { bw: 200, gain: 0.0, dmi: 4.0, me: 6.49, tdn: 1.8, cp: 299, ca: 6, p: 6 },
  { bw: 200, gain: 0.25, dmi: 4.9, me: 8.34, tdn: 2.3, cp: 492, ca: 10, p: 10 },
  { bw: 200, gain: 0.5, dmi: 5.6, me: 10.2, tdn: 2.8, cp: 577, ca: 14, p: 13 },
  { bw: 200, gain: 0.75, dmi: 5.5, me: 12.05, tdn: 3.3, cp: 639, ca: 19, p: 16 },
  { bw: 200, gain: 1.0, dmi: 5.6, me: 13.92, tdn: 3.8, cp: 707, ca: 23, p: 18 },

  { bw: 250, gain: 0.0, dmi: 4.8, me: 7.62, tdn: 2.1, cp: 264, ca: 7, p: 7 },
  { bw: 250, gain: 0.25, dmi: 5.8, me: 9.81, tdn: 2.7, cp: 486, ca: 12, p: 12 },
  { bw: 250, gain: 0.5, dmi: 6.2, me: 11.99, tdn: 3.3, cp: 564, ca: 13, p: 13 },
  { bw: 250, gain: 0.75, dmi: 6.5, me: 14.19, tdn: 3.9, cp: 644, ca: 18, p: 15 },
  { bw: 250, gain: 1.0, dmi: 6.6, me: 16.32, tdn: 4.5, cp: 724, ca: 23, p: 18 },
  { bw: 250, gain: 1.1, dmi: 6.6, me: 17.18, tdn: 4.8, cp: 757, ca: 25, p: 20 },

  { bw: 300, gain: 0.0, dmi: 5.5, me: 8.76, tdn: 2.4, cp: 303, ca: 9, p: 9 },
  { bw: 300, gain: 0.25, dmi: 6.7, me: 11.23, tdn: 3.1, cp: 526, ca: 13, p: 13 },
  { bw: 300, gain: 0.5, dmi: 7.1, me: 13.8, tdn: 3.8, cp: 604, ca: 14, p: 14 },
  { bw: 300, gain: 0.75, dmi: 7.4, me: 16.27, tdn: 4.5, cp: 717, ca: 17, p: 15 },
  { bw: 300, gain: 1.0, dmi: 7.6, me: 18.78, tdn: 5.2, cp: 764, ca: 21, p: 18 },
  // Erratum-corrected row for BW 300 kg, ADG 1.10 kg/day (original print duplicated BW 350 energy)
  { bw: 300, gain: 1.1, dmi: 7.6, me: 19.78, tdn: 5.46, cp: 797, ca: 24, p: 20 },

  { bw: 350, gain: 0.0, dmi: 6.1, me: 9.78, tdn: 2.7, cp: 340, ca: 10, p: 10 },
  { bw: 350, gain: 0.25, dmi: 7.4, me: 12.59, tdn: 3.5, cp: 557, ca: 15, p: 15 },
  { bw: 350, gain: 0.5, dmi: 8.0, me: 15.39, tdn: 4.3, cp: 637, ca: 15, p: 15 },
  { bw: 350, gain: 0.75, dmi: 8.3, me: 18.19, tdn: 5.0, cp: 717, ca: 15, p: 15 },
  { bw: 350, gain: 1.0, dmi: 8.5, me: 20.99, tdn: 5.8, cp: 797, ca: 18, p: 18 },
  { bw: 350, gain: 1.1, dmi: 8.5, me: 22.11, tdn: 6.1, cp: 829, ca: 20, p: 19 },
  { bw: 350, gain: 1.2, dmi: 8.4, me: 23.24, tdn: 6.4, cp: 860, ca: 21, p: 20 },

  { bw: 400, gain: 0.0, dmi: 6.8, me: 10.92, tdn: 3.0, cp: 377, ca: 11, p: 11 },
  { bw: 400, gain: 0.25, dmi: 8.3, me: 14.04, tdn: 3.9, cp: 579, ca: 15, p: 15 },
  { bw: 400, gain: 0.5, dmi: 8.8, me: 17.16, tdn: 4.7, cp: 657, ca: 15, p: 15 },
  { bw: 400, gain: 0.75, dmi: 9.2, me: 20.28, tdn: 5.6, cp: 739, ca: 16, p: 16 },
  { bw: 400, gain: 1.0, dmi: 9.4, me: 23.42, tdn: 6.5, cp: 819, ca: 18, p: 18 },
  { bw: 400, gain: 1.1, dmi: 9.4, me: 24.67, tdn: 6.8, cp: 850, ca: 19, p: 19 },
  { bw: 400, gain: 1.2, dmi: 9.2, me: 25.27, tdn: 7.0, cp: 883, ca: 20, p: 19 },

  { bw: 450, gain: 0.0, dmi: 7.4, me: 11.85, tdn: 3.3, cp: 411, ca: 12, p: 12 },
  { bw: 450, gain: 0.25, dmi: 9.0, me: 15.23, tdn: 4.2, cp: 590, ca: 16, p: 16 },
  { bw: 450, gain: 0.5, dmi: 9.6, me: 18.62, tdn: 5.1, cp: 671, ca: 17, p: 17 },
  { bw: 450, gain: 0.75, dmi: 10.0, me: 22.01, tdn: 6.1, cp: 750, ca: 18, p: 18 },
  { bw: 450, gain: 1.0, dmi: 10.2, me: 25.41, tdn: 7.0, cp: 831, ca: 19, p: 19 },
  { bw: 450, gain: 1.1, dmi: 10.2, me: 26.77, tdn: 7.4, cp: 857, ca: 20, p: 20 },
];

const KEARL_GESTATION_HEIFER_ROWS: readonly DailyNeedsRow[] = [
  { bw: 250, gain: 0.6, dmi: 6.5, me: 12.5, tdn: 3.4, cp: 579, ca: 18, p: 18 },
  { bw: 300, gain: 0.6, dmi: 7.4, me: 14.2, tdn: 3.9, cp: 614, ca: 18, p: 18 },
  { bw: 350, gain: 0.6, dmi: 8.3, me: 16.1, tdn: 4.4, cp: 650, ca: 19, p: 19 },
  { bw: 400, gain: 0.6, dmi: 9.2, me: 17.8, tdn: 4.9, cp: 671, ca: 19, p: 19 },
  { bw: 450, gain: 0.6, dmi: 10.0, me: 19.4, tdn: 5.3, cp: 679, ca: 19, p: 19 },
];

const KEARL_GESTATION_COW_ROWS: readonly DailyNeedsRow[] = [
  { bw: 300, gain: 0.4, dmi: 6.9, me: 12.4, tdn: 3.4, cp: 409, ca: 11, p: 11 },
  { bw: 350, gain: 0.4, dmi: 7.7, me: 13.9, tdn: 3.8, cp: 444, ca: 12, p: 12 },
  { bw: 400, gain: 0.4, dmi: 8.5, me: 15.4, tdn: 4.2, cp: 480, ca: 14, p: 14 },
  { bw: 450, gain: 0.4, dmi: 9.3, me: 16.8, tdn: 4.6, cp: 514, ca: 15, p: 15 },
  { bw: 500, gain: 0.4, dmi: 10.1, me: 18.2, tdn: 5.0, cp: 546, ca: 15, p: 15 },
  { bw: 550, gain: 0.4, dmi: 10.8, me: 19.5, tdn: 5.3, cp: 579, ca: 16, p: 16 },
  { bw: 600, gain: 0.4, dmi: 11.5, me: 20.8, tdn: 5.7, cp: 629, ca: 17, p: 17 },
];

const KEARL_WORK_MODERATE_ROWS: readonly DailyNeedsRow[] = [
  { bw: 300, gain: 0, dmi: 6.7, me: 11.1, tdn: 3.1, cp: 460, ca: 10, p: 10 },
  { bw: 350, gain: 0, dmi: 7.5, me: 12.9, tdn: 3.6, cp: 515, ca: 12, p: 12 },
  { bw: 400, gain: 0, dmi: 8.4, me: 14.4, tdn: 4.0, cp: 573, ca: 13, p: 13 },
  { bw: 450, gain: 0, dmi: 9.1, me: 15.8, tdn: 4.4, cp: 623, ca: 14, p: 14 },
  { bw: 500, gain: 0, dmi: 9.9, me: 17.3, tdn: 4.8, cp: 678, ca: 15, p: 15 },
  { bw: 550, gain: 0, dmi: 10.6, me: 18.7, tdn: 5.2, cp: 725, ca: 16, p: 16 },
  { bw: 600, gain: 0, dmi: 11.4, me: 20.1, tdn: 5.6, cp: 759, ca: 17, p: 17 },
];

const KEARL_WORK_HEAVY_ROWS: readonly DailyNeedsRow[] = [
  { bw: 300, gain: 0, dmi: 6.7, me: 14.1, tdn: 3.9, cp: 483, ca: 10, p: 10 },
  { bw: 350, gain: 0, dmi: 7.9, me: 16.3, tdn: 4.5, cp: 553, ca: 12, p: 12 },
  { bw: 400, gain: 0, dmi: 9.1, me: 18.2, tdn: 5.0, cp: 600, ca: 13, p: 13 },
  { bw: 450, gain: 0, dmi: 9.8, me: 20.2, tdn: 5.6, cp: 678, ca: 14, p: 14 },
  { bw: 500, gain: 0, dmi: 10.5, me: 22.1, tdn: 6.1, cp: 729, ca: 15, p: 15 },
  { bw: 550, gain: 0, dmi: 11.5, me: 24.0, tdn: 6.6, cp: 801, ca: 16, p: 16 },
  { bw: 600, gain: 0, dmi: 12.3, me: 25.8, tdn: 7.1, cp: 848, ca: 17, p: 17 },
];

// Kearl Table 14 Lactating Cows First 12 Wk (5 kg 4% FCM Base) — with BW=400 CP erratum corrected (557 -> 757)
const KEARL_LACT_12WK_ROWS: readonly DailyNeedsRow[] = [
  { bw: 250, gain: 0, dmi: 6.4, me: 14.0, tdn: 3.8, cp: 650, ca: 22, p: 22 },
  { bw: 300, gain: 0, dmi: 7.3, me: 15.2, tdn: 4.2, cp: 686, ca: 23, p: 23 },
  { bw: 350, gain: 0, dmi: 8.1, me: 16.4, tdn: 4.5, cp: 721, ca: 24, p: 24 },
  { bw: 400, gain: 0, dmi: 8.9, me: 17.5, tdn: 4.8, cp: 757, ca: 25, p: 25 },
  { bw: 450, gain: 0, dmi: 9.6, me: 18.6, tdn: 5.1, cp: 793, ca: 26, p: 26 },
  { bw: 500, gain: 0, dmi: 10.3, me: 19.7, tdn: 5.4, cp: 821, ca: 27, p: 27 },
  { bw: 550, gain: 0, dmi: 11.0, me: 20.7, tdn: 5.7, cp: 857, ca: 28, p: 28 },
  { bw: 600, gain: 0, dmi: 11.7, me: 21.7, tdn: 5.9, cp: 886, ca: 28, p: 28 },
];

// Kearl Table 15 per kg milk by fat%
const KEARL_MILK_PER_KG = [
  { fat: 2.5, me: 0.93, tdn: 0.26, cp: 57, ca: 2.4, p: 1.7 },
  { fat: 3.0, me: 1.0, tdn: 0.28, cp: 64, ca: 2.5, p: 1.8 },
  { fat: 3.5, me: 1.07, tdn: 0.3, cp: 71, ca: 2.6, p: 1.9 },
  { fat: 4.0, me: 1.14, tdn: 0.31, cp: 79, ca: 2.7, p: 2.0 },
  { fat: 4.5, me: 1.21, tdn: 0.33, cp: 86, ca: 2.8, p: 2.1 },
  { fat: 5.0, me: 1.28, tdn: 0.35, cp: 93, ca: 2.9, p: 2.2 },
  { fat: 5.5, me: 1.35, tdn: 0.37, cp: 100, ca: 3.0, p: 2.3 },
  { fat: 6.0, me: 1.42, tdn: 0.39, cp: 107, ca: 3.1, p: 2.4 },
] as const;

// NRC (1988) Table 6-3 mature lactating cow maintenance (400–800 kg)
const NRC_MAINT_ROWS = [
  { bw: 400, me: 12.01, tdn: 3.13, cp: 318, ca: 16, p: 11 },
  { bw: 450, me: 13.12, tdn: 3.42, cp: 341, ca: 18, p: 13 },
  { bw: 500, me: 14.2, tdn: 3.7, cp: 364, ca: 20, p: 14 },
  { bw: 550, me: 15.25, tdn: 3.97, cp: 386, ca: 22, p: 16 },
  { bw: 600, me: 16.28, tdn: 4.24, cp: 406, ca: 24, p: 17 },
  { bw: 650, me: 17.29, tdn: 4.51, cp: 428, ca: 26, p: 19 },
  { bw: 700, me: 18.28, tdn: 4.76, cp: 449, ca: 28, p: 20 },
  { bw: 750, me: 19.25, tdn: 5.02, cp: 468, ca: 30, p: 21 },
  { bw: 800, me: 20.2, tdn: 5.26, cp: 486, ca: 32, p: 23 },
] as const;

const NRC_DRY_PREG_ROWS = [
  { bw: 400, me: 15.26, tdn: 4.15, cp: 875, ca: 26, p: 16 },
  { bw: 450, me: 16.66, tdn: 4.53, cp: 928, ca: 30, p: 18 },
  { bw: 500, me: 18.04, tdn: 4.9, cp: 978, ca: 33, p: 20 },
  { bw: 550, me: 19.37, tdn: 5.27, cp: 1027, ca: 36, p: 22 },
  { bw: 600, me: 20.68, tdn: 5.62, cp: 1074, ca: 39, p: 24 },
  { bw: 650, me: 21.96, tdn: 5.97, cp: 1120, ca: 43, p: 26 },
  { bw: 700, me: 23.21, tdn: 6.31, cp: 1165, ca: 46, p: 28 },
  { bw: 750, me: 24.44, tdn: 6.65, cp: 1209, ca: 49, p: 30 },
  { bw: 800, me: 25.66, tdn: 6.98, cp: 1254, ca: 53, p: 32 },
] as const;

const NRC_MILK_PER_KG = [
  { fat: 3.0, me: 1.07, tdn: 0.28, cp: 78, ca: 2.73, p: 1.68 },
  { fat: 3.5, me: 1.15, tdn: 0.301, cp: 84, ca: 2.97, p: 1.83 },
  { fat: 4.0, me: 1.24, tdn: 0.322, cp: 90, ca: 3.21, p: 1.98 },
  { fat: 4.5, me: 1.32, tdn: 0.343, cp: 96, ca: 3.45, p: 2.13 },
  { fat: 5.0, me: 1.4, tdn: 0.364, cp: 101, ca: 3.69, p: 2.28 },
  { fat: 5.5, me: 1.48, tdn: 0.385, cp: 107, ca: 3.93, p: 2.43 },
] as const;

const NRC_DMI_WEIGHTS = [400, 500, 600, 700, 800] as const;
const NRC_DMI_FCMS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const;
const NRC_DMI_GRID: ReadonlyArray<readonly (number | null)[]> = [
  [2.7, 2.4, 2.2, 2.0, 1.9],
  [3.2, 2.8, 2.6, 2.3, 2.2],
  [3.6, 3.2, 2.9, 2.6, 2.4],
  [4.0, 3.5, 3.2, 2.9, 2.7],
  [4.4, 3.9, 3.5, 3.2, 2.9],
  [5.0, 4.2, 3.7, 3.4, 3.1],
  [5.5, 4.6, 4.0, 3.6, 3.3],
  [null, 5.0, 4.3, 3.8, 3.5],
  [null, 5.4, 4.7, 4.1, 3.7],
  [null, null, 5.0, 4.4, 4.0],
  [null, null, 5.4, 4.8, 4.3],
];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function roundTo(v: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
}

function interpolatePiecewise1D<
  XK extends string,
  NK extends string,
  T extends Readonly<Record<XK | NK, number>>,
>(
  rows: readonly T[],
  xKey: XK,
  targetX: number,
  numericKeys: readonly NK[],
): { readonly values: Record<string, number>; readonly extrapolated: boolean } {
  const sorted = [...rows].sort((a, b) => a[xKey] - b[xKey]);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const minX = first[xKey];
  const maxX = last[xKey];

  if (sorted.length === 1) {
    const out: Record<string, number> = {};
    for (const k of numericKeys) out[k] = first[k];
    return { values: out, extrapolated: targetX !== minX };
  }

  let r0: T;
  let r1: T;
  let extrapolated = false;

  if (targetX < minX) {
    r0 = sorted[0]!;
    r1 = sorted[1]!;
    extrapolated = true;
  } else if (targetX > maxX) {
    r0 = sorted[sorted.length - 2]!;
    r1 = sorted[sorted.length - 1]!;
    extrapolated = true;
  } else {
    let idx = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const xi = sorted[i]![xKey];
      const xNext = sorted[i + 1]![xKey];
      if (targetX >= xi && targetX <= xNext) {
        idx = i;
        break;
      }
    }
    r0 = sorted[idx]!;
    r1 = sorted[idx + 1]!;
  }

  const x0 = r0[xKey];
  const x1 = r1[xKey];
  const t = x1 === x0 ? 0 : (targetX - x0) / (x1 - x0);
  const out: Record<string, number> = {};
  for (const k of numericKeys) {
    const y0 = r0[k];
    const y1 = r1[k];
    out[k] = Math.max(0.01, y0 + (y1 - y0) * t);
  }
  return { values: out, extrapolated };
}

function interpolateBeefGrowth(
  bwKg: number,
  adgKg: number,
): { readonly row: DailyNeedsRow; readonly extrapolated: boolean } {
  const bwLevels = [150, 200, 250, 300, 350, 400, 450] as const;
  const keys = ["dmi", "me", "tdn", "cp", "ca", "p"] as const;

  let b0: number;
  let b1: number;
  let bwExtrapolated = false;
  if (bwKg < bwLevels[0]) {
    b0 = bwLevels[0];
    b1 = bwLevels[1];
    bwExtrapolated = true;
  } else if (bwKg > bwLevels[bwLevels.length - 1]!) {
    b0 = bwLevels[bwLevels.length - 2]!;
    b1 = bwLevels[bwLevels.length - 1]!;
    bwExtrapolated = true;
  } else {
    b0 = bwLevels[0];
    b1 = bwLevels[1];
    for (let i = 0; i < bwLevels.length - 1; i++) {
      if (bwKg >= bwLevels[i]! && bwKg <= bwLevels[i + 1]!) {
        b0 = bwLevels[i]!;
        b1 = bwLevels[i + 1]!;
        break;
      }
    }
  }

  const rows0 = KEARL_BEEF_GROWTH_ROWS.filter((r) => r.bw === b0);
  const rows1 = KEARL_BEEF_GROWTH_ROWS.filter((r) => r.bw === b1);
  const res0 = interpolatePiecewise1D(rows0, "gain", adgKg, keys);
  const res1 = interpolatePiecewise1D(rows1, "gain", adgKg, keys);

  const tbw = b1 === b0 ? 0 : (bwKg - b0) / (b1 - b0);
  const lerp = (k: (typeof keys)[number]) =>
    Math.max(0.1, res0.values[k]! + (res1.values[k]! - res0.values[k]!) * tbw);

  return {
    row: {
      bw: bwKg,
      gain: adgKg,
      dmi: Math.max(1.5, lerp("dmi")),
      me: lerp("me"),
      tdn: lerp("tdn"),
      cp: lerp("cp"),
      ca: lerp("ca"),
      p: lerp("p"),
    },
    extrapolated: bwExtrapolated || res0.extrapolated || res1.extrapolated,
  };
}

/**
 * Menghitung kebutuhan sapi potong secara dinamis dari Bobot Badan & Target PBBH
 * memakai interpolasi + ekstrapolasi aman pada Kearl (1982) Table 14.
 */
export function computeDynamicBeefRequirement(
  input: DynamicBeefInput,
): DynamicCattleRequirementResult {
  const bwKg = clamp(Number.isFinite(input.bodyWeightKg) ? input.bodyWeightKg : 300, 80, 900);
  const adgKg = clamp(Number.isFinite(input.adgKgPerDay) ? input.adgKgPerDay : 0.8, 0, 1.5);
  const state: BeefPhysiologicalState = input.physiologicalState ?? "growth";

  let row: DailyNeedsRow;
  let isExtrapolated: boolean;
  let phaseLabel: string;
  let phaseLabelEn: string;

  if (state === "growth") {
    const res = interpolateBeefGrowth(bwKg, adgKg);
    row = res.row;
    isExtrapolated = res.extrapolated;
    phaseLabel = `Pertumbuhan/Penggemukan · BB ${roundTo(bwKg, 0)} kg · PBBH ${roundTo(adgKg, 2)} kg/hr`;
    phaseLabelEn = `Growing/Finishing · BW ${roundTo(bwKg, 0)} kg · ADG ${roundTo(adgKg, 2)} kg/d`;
  } else {
    const tableMap: Record<Exclude<BeefPhysiologicalState, "growth">, readonly DailyNeedsRow[]> = {
      gestation_heifer: KEARL_GESTATION_HEIFER_ROWS,
      gestation_cow: KEARL_GESTATION_COW_ROWS,
      work_moderate: KEARL_WORK_MODERATE_ROWS,
      work_heavy: KEARL_WORK_HEAVY_ROWS,
    };
    const res = interpolatePiecewise1D(tableMap[state], "bw", bwKg, [
      "dmi",
      "me",
      "tdn",
      "cp",
      "ca",
      "p",
    ] as const);
    row = {
      bw: bwKg,
      gain: state === "gestation_heifer" ? 0.6 : state === "gestation_cow" ? 0.4 : 0,
      dmi: Math.max(1.5, res.values["dmi"]!),
      me: res.values["me"]!,
      tdn: res.values["tdn"]!,
      cp: res.values["cp"]!,
      ca: res.values["ca"]!,
      p: res.values["p"]!,
    };
    isExtrapolated = res.extrapolated;
    phaseLabel =
      state === "gestation_heifer"
        ? `Sapi Dara Bunting 3 Bln Terakhir · BB ${roundTo(bwKg, 0)} kg`
        : state === "gestation_cow"
          ? `Induk Sapi Bunting 3 Bln Terakhir · BB ${roundTo(bwKg, 0)} kg`
          : state === "work_moderate"
            ? `Sapi Kerja Sedang (4 jam/hr) · BB ${roundTo(bwKg, 0)} kg`
            : `Sapi Kerja Berat (8 jam/hr) · BB ${roundTo(bwKg, 0)} kg`;
    phaseLabelEn = `${state.replace(/_/g, " ")} · BW ${roundTo(bwKg, 0)} kg`;
  }

  const dmiKg = roundTo(row.dmi, 2);
  const cpPct = roundTo(clamp((row.cp / (row.dmi * 1000)) * 100, 6.0, 22.0), 2);
  const tdnPct = roundTo(clamp((row.tdn / row.dmi) * 100, 44.0, 82.0), 1);
  const caPct = roundTo(clamp((row.ca / (row.dmi * 1000)) * 100, 0.14, 1.2), 2);
  const pPct = roundTo(clamp((row.p / (row.dmi * 1000)) * 100, 0.14, 0.8), 2);

  // LK (ee) & SK (cf) pada basis BK sesuai kepadatan energi TDN Kearl (1982):
  // - LK (ee): maks 6.5% BK (SNI 3148-2:2017 & NRC 2016 batas aman lemak rumen <=6-7% BK)
  // - SK (cf): batas serat rumen proporsional terhadap TDN (Hartadi 1980 Table 7 & NRC 2016 / SNI 3148-2)
  const energyDensityRatio = clamp((tdnPct - 48) / (72 - 48), 0, 1);
  const eeMinPct = 1.5;
  const eeMaxPct = 6.5;
  const eeIdealPct = roundTo(2.5 + 1.0 * energyDensityRatio, 1);
  const cfMinPct = roundTo(17.0 - 4.0 * energyDensityRatio, 1);
  const cfMaxPct = roundTo(31.0 - 7.0 * energyDensityRatio, 1);
  const cfIdealPct = roundTo(24.0 - 6.0 * energyDensityRatio, 1);

  const modeTag = isExtrapolated ? "Ekstrapolasi Kearl 1982" : "Interpolasi Kearl 1982";

  return {
    dmiKg,
    isExtrapolated,
    sourceLabel: `${modeTag} (Table 14) · DMI ≈ ${dmiKg} kg BK/hr`,
    requirement: {
      id: "dynamic-beef",
      name: `Sapi Potong ${roundTo(bwKg, 0)} kg${state === "growth" ? ` · PBBH ${roundTo(adgKg, 2)} kg` : ""} (${modeTag})`,
      nameEn: `Beef Cattle ${roundTo(bwKg, 0)} kg (${isExtrapolated ? "Extrapolated" : "Interpolated"} Kearl 1982)`,
      species: "cattle_beef",
      phase: phaseLabel,
      basis: "dry_matter",
      constraints: [
        { nutrientId: "cp", min: cpPct, idealTarget: roundTo(cpPct + 0.5, 2), enabled: true },
        { nutrientId: "tdn", min: tdnPct, idealTarget: roundTo(tdnPct + 2.0, 1), enabled: true },
        {
          nutrientId: "ee",
          min: eeMinPct,
          max: eeMaxPct,
          idealTarget: eeIdealPct,
          enabled: true,
        },
        {
          nutrientId: "cf",
          min: cfMinPct,
          max: cfMaxPct,
          idealTarget: cfIdealPct,
          enabled: true,
        },
        {
          nutrientId: "ca",
          min: caPct,
          max: roundTo(Math.max(caPct * 2.2, 0.85), 2),
          idealTarget: roundTo(caPct + 0.05, 2),
          enabled: true,
        },
        {
          nutrientId: "p",
          min: pPct,
          max: roundTo(Math.max(pPct * 2.0, 0.6), 2),
          idealTarget: roundTo(pPct + 0.04, 2),
          enabled: true,
        },
      ],
      ratios: [
        {
          id: "ca-p",
          label: "Kalsium : Fosfor (Ca:P)",
          numerator: "ca",
          denominator: "p",
          min: 1.2,
          max: 2.5,
        },
      ],
      source: `${modeTag} Table 14 (${phaseLabelEn}) — DMI ${dmiKg} kg BK; ME ${roundTo(row.me, 2)} Mcal; TDN ${roundTo(row.tdn, 2)} kg (${tdnPct}% BK); PK ${roundTo(row.cp, 0)} g (${cpPct}% BK); Ca ${roundTo(row.ca, 0)} g (${caPct}% BK); P ${roundTo(row.p, 0)} g (${pPct}% BK); LK ${eeMinPct}–${eeMaxPct}% BK (SNI 3148-2:2017 / NRC 2016); SK ${cfMinPct}–${cfMaxPct}% BK (Hartadi 1980 T7 / SNI 3148-2:2017)`,
    },
  };
}

function estimateDairyDmiPctBwWithExtrapolation(
  bwKg: number,
  fcm4PctKg: number,
): { readonly pctBw: number; readonly extrapolated: boolean } {
  // Collect valid points per NRC 1988 Table 6-1 BW column
  const colEstimates = NRC_DMI_WEIGHTS.map((_, colIdx) => {
    const validRows: Array<{ readonly fcm: number; readonly pct: number }> = [];
    for (let r = 0; r < NRC_DMI_FCMS.length; r++) {
      const val = NRC_DMI_GRID[r]?.[colIdx];
      if (val !== null && val !== undefined) {
        validRows.push({ fcm: NRC_DMI_FCMS[r]!, pct: val });
      }
    }
    return interpolatePiecewise1D(validRows, "fcm", fcm4PctKg, ["pct"]);
  });

  const colPoints = NRC_DMI_WEIGHTS.map((bw, idx) => ({
    bw,
    pct: colEstimates[idx]!.values["pct"]!,
  }));
  const bwRes = interpolatePiecewise1D(colPoints, "bw", bwKg, ["pct"]);
  const fcmExtrapolated = colEstimates[0]!.extrapolated;
  return {
    pctBw: clamp(bwRes.values["pct"]!, 1.8, 5.5),
    extrapolated: bwRes.extrapolated || fcmExtrapolated,
  };
}

/**
 * Menghitung kebutuhan sapi perah secara dinamis dari Bobot Badan, Target Produksi Susu (L/hr),
 * dan Lemak Susu (%), menghitung FCM 4% & estimasi DMI BK otomatis (Kearl 1982 default / NRC 1988).
 */
export function computeDynamicDairyRequirement(
  input: DynamicDairyInput,
): DynamicCattleRequirementResult {
  const bwKg = clamp(Number.isFinite(input.bodyWeightKg) ? input.bodyWeightKg : 450, 200, 900);
  const isDryPregnant = input.isDryPregnant === true;
  const milkKg = isDryPregnant
    ? 0
    : clamp(Number.isFinite(input.milkKgPerDay) ? input.milkKgPerDay : 15, 0, 65);
  const fatPct = clamp(Number.isFinite(input.fatPct) ? input.fatPct : 3.8, 2.5, 6.0);
  const standard: DairyStandard = input.standard ?? "kearl_1982";

  const fcm4PctKg = roundTo(computeFatCorrectedMilk4Pct(milkKg, fatPct), 2);
  let dmiKg: number;
  let totalMe: number;
  let totalTdn: number;
  let totalCp: number;
  let totalCa: number;
  let totalP: number;
  let isExtrapolated: boolean;

  if (isDryPregnant) {
    const dryRes = interpolatePiecewise1D(NRC_DRY_PREG_ROWS, "bw", bwKg, [
      "me",
      "tdn",
      "cp",
      "ca",
      "p",
    ] as const);
    dmiKg = clamp(roundTo(bwKg * 0.02, 2), 4.0, 18.0);
    totalMe = dryRes.values["me"]!;
    totalTdn = dryRes.values["tdn"]!;
    totalCp = dryRes.values["cp"]!;
    totalCa = dryRes.values["ca"]!;
    totalP = dryRes.values["p"]!;
    isExtrapolated = dryRes.extrapolated;
  } else if (standard === "kearl_1982") {
    // Derive Kearl maintenance cleanly by subtracting the 5 kg 4% FCM baseline embedded in Table 14 First 12 Weeks
    const lactBase = interpolatePiecewise1D(KEARL_LACT_12WK_ROWS, "bw", bwKg, [
      "dmi",
      "me",
      "tdn",
      "cp",
      "ca",
      "p",
    ] as const);
    const maintMe = Math.max(4, lactBase.values["me"]! - 5 * 1.14);
    const maintTdn = Math.max(1.2, lactBase.values["tdn"]! - 5 * 0.31);
    const maintCp = Math.max(180, lactBase.values["cp"]! - 5 * 79);
    const maintCa = Math.max(7, lactBase.values["ca"]! - 5 * 2.7);
    const maintP = Math.max(7, lactBase.values["p"]! - 5 * 2.0);

    const perKgMilk = interpolatePiecewise1D(KEARL_MILK_PER_KG, "fat", fatPct, [
      "me",
      "tdn",
      "cp",
      "ca",
      "p",
    ] as const);

    const dmiEst = estimateDairyDmiPctBwWithExtrapolation(bwKg, Math.max(4, fcm4PctKg));
    // For low-yield tropical cows (~5-12 L), blend toward Kearl's tropical DMI floor so energy density remains realistic
    const kearlTropicalDmi = lactBase.values["dmi"]! + 0.34 * (fcm4PctKg - 5);
    dmiKg = roundTo(
      clamp((bwKg * dmiEst.pctBw) / 100, Math.max(3.5, kearlTropicalDmi * 0.9), 34),
      2,
    );
    totalMe = maintMe + milkKg * perKgMilk.values["me"]!;
    totalTdn = maintTdn + milkKg * perKgMilk.values["tdn"]!;
    totalCp = maintCp + milkKg * perKgMilk.values["cp"]!;
    totalCa = maintCa + milkKg * perKgMilk.values["ca"]!;
    totalP = maintP + milkKg * perKgMilk.values["p"]!;
    isExtrapolated = lactBase.extrapolated || fcm4PctKg < 5 || fcm4PctKg > 45;
  } else {
    const maint = interpolatePiecewise1D(NRC_MAINT_ROWS, "bw", bwKg, [
      "me",
      "tdn",
      "cp",
      "ca",
      "p",
    ] as const);
    const perKgMilk = interpolatePiecewise1D(NRC_MILK_PER_KG, "fat", fatPct, [
      "me",
      "tdn",
      "cp",
      "ca",
      "p",
    ] as const);
    const dmiEst = estimateDairyDmiPctBwWithExtrapolation(bwKg, fcm4PctKg);
    dmiKg = roundTo(clamp((bwKg * dmiEst.pctBw) / 100, 4.0, 35.0), 2);
    totalMe = maint.values["me"]! + milkKg * perKgMilk.values["me"]!;
    totalTdn = maint.values["tdn"]! + milkKg * perKgMilk.values["tdn"]!;
    totalCp = maint.values["cp"]! + milkKg * perKgMilk.values["cp"]!;
    totalCa = maint.values["ca"]! + milkKg * perKgMilk.values["ca"]!;
    totalP = maint.values["p"]! + milkKg * perKgMilk.values["p"]!;
    isExtrapolated = maint.extrapolated || dmiEst.extrapolated || perKgMilk.extrapolated;
  }

  const cpPct = roundTo(clamp((totalCp / (dmiKg * 1000)) * 100, 8.0, 21.0), 2);
  const tdnPct = roundTo(clamp((totalTdn / dmiKg) * 100, 52.0, 80.0), 1);
  const caPct = roundTo(clamp((totalCa / (dmiKg * 1000)) * 100, 0.25, 1.3), 2);
  const pPct = roundTo(clamp((totalP / (dmiKg * 1000)) * 100, 0.2, 0.8), 2);

  // LK (ee) & SK (cf) pada basis BK sesuai fase laktasi/kering & TDN (SNI 3148-1:2017, NRC 1988, Hartadi 1980 T7)
  const dairyEnergyRatio = clamp((tdnPct - 54) / (74 - 54), 0, 1);
  const eeMinPct = isDryPregnant ? 1.5 : 2.0;
  const eeMaxPct = 6.5;
  const eeIdealPct = isDryPregnant ? 2.5 : roundTo(2.8 + 1.0 * dairyEnergyRatio, 1);
  const cfMinPct = isDryPregnant ? 18.0 : roundTo(17.0 - 3.5 * dairyEnergyRatio, 1);
  const cfMaxPct = isDryPregnant ? 31.0 : roundTo(29.0 - 5.0 * dairyEnergyRatio, 1);
  const cfIdealPct = isDryPregnant ? 24.0 : roundTo(22.5 - 4.5 * dairyEnergyRatio, 1);

  const stdLabel = standard === "kearl_1982" ? "Kearl 1982" : "NRC 1988";
  const calcTag = isExtrapolated ? `Ekstrapolasi ${stdLabel}` : `Interpolasi ${stdLabel}`;
  const phaseStr = isDryPregnant
    ? `Kering Bunting · BB ${roundTo(bwKg, 0)} kg`
    : `Laktasi ${roundTo(milkKg, 1)} L · Lemak ${roundTo(fatPct, 1)}% (FCM 4%: ${fcm4PctKg} kg) · BB ${roundTo(bwKg, 0)} kg`;

  return {
    dmiKg,
    fcm4PctKg,
    isExtrapolated,
    sourceLabel: isDryPregnant
      ? `${calcTag} · DMI ≈ ${dmiKg} kg BK/hr`
      : `${calcTag} · FCM 4% ${fcm4PctKg} kg/hr · DMI ≈ ${dmiKg} kg BK/hr`,
    requirement: {
      id: "dynamic-dairy",
      name: isDryPregnant
        ? `Sapi Perah Kering Bunting ${roundTo(bwKg, 0)} kg (${stdLabel})`
        : `Sapi Perah ${roundTo(bwKg, 0)} kg · ${roundTo(milkKg, 0)} L (${roundTo(fatPct, 1)}% Lemak · ${stdLabel})`,
      nameEn: isDryPregnant
        ? `Dry Pregnant Cow ${roundTo(bwKg, 0)} kg (${stdLabel})`
        : `Dairy Cow ${roundTo(bwKg, 0)} kg · ${roundTo(milkKg, 0)} L (${roundTo(fatPct, 1)}% Fat · ${stdLabel})`,
      species: "cattle_dairy",
      phase: phaseStr,
      basis: "dry_matter",
      constraints: [
        { nutrientId: "cp", min: cpPct, idealTarget: roundTo(cpPct + 0.6, 2), enabled: true },
        { nutrientId: "tdn", min: tdnPct, idealTarget: roundTo(tdnPct + 2.0, 1), enabled: true },
        {
          nutrientId: "ee",
          min: eeMinPct,
          max: eeMaxPct,
          idealTarget: eeIdealPct,
          enabled: true,
        },
        {
          nutrientId: "cf",
          min: cfMinPct,
          max: cfMaxPct,
          idealTarget: cfIdealPct,
          enabled: true,
        },
        {
          nutrientId: "ca",
          min: caPct,
          max: roundTo(Math.max(caPct * 2.2, 1.0), 2),
          idealTarget: roundTo(caPct + 0.06, 2),
          enabled: true,
        },
        {
          nutrientId: "p",
          min: pPct,
          max: roundTo(Math.max(pPct * 2.0, 0.7), 2),
          idealTarget: roundTo(pPct + 0.04, 2),
          enabled: true,
        },
      ],
      ratios: [
        {
          id: "ca-p",
          label: "Kalsium : Fosfor (Ca:P)",
          numerator: "ca",
          denominator: "p",
          min: 1.2,
          max: 2.5,
        },
      ],
      source: `${calcTag} — ${phaseStr}; DMI ${dmiKg} kg BK; ME ${roundTo(totalMe, 2)} Mcal; TDN ${roundTo(totalTdn, 2)} kg (${tdnPct}% BK); PK ${roundTo(totalCp, 0)} g (${cpPct}% BK); Ca ${roundTo(totalCa, 0)} g (${caPct}% BK); P ${roundTo(totalP, 0)} g (${pPct}% BK); LK ${eeMinPct}–${eeMaxPct}% BK (SNI 3148-1:2017 / NRC 1988); SK ${cfMinPct}–${cfMaxPct}% BK (NRC 1988 / Hartadi 1980 T7)`,
    },
  };
}
