/**
 * PR-04: Chance-Constrained Programming (CCP) + Successive Linear Programming Munford (1996).
 *
 * Kendala peluang `P(Σ a_ij x_j ≥ b_i) ≥ p_i` dengan `a_ij ~ N(μ_ij, σ_ij²)` direduksi ke
 * `μ_i·x − κ_i·sqrt(V_i(x)) ≥ b_i`, di mana `V_i(x) = xᵀΣ⁽ⁱ⁾x + σ_bi² + 1e-12`.
 * `sqrt(V)` dilinearisasi Taylor orde-1 di `x⁽ᵗ⁾` agar dapat diselesaikan HiGHS sebagai LP.
 *
 * ponytail: Σ⁽ⁱ⁾ diasumsikan diagonal (bahan independen) karena data offline hanya
 * menyediakan sigma per bahan; upgrade path = terima matriks kovarians penuh bila tersedia.
 */

/** Lantai varians agar sqrt(V) tidak pernah nol (guard pembagian 0). */
export const VARIANCE_FLOOR = 1e-12;

export const DEFAULT_TARGET_PROBABILITY = 0.95;

/**
 * Kuantil normal standar Φ⁻¹(p) — aproksimasi rasional Acklam (|error| < 1.15e-9).
 * p dijepit ke (0, 1 − 1e-6) supaya κ tetap hingga.
 */
export function normalInverseCdf(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ] as const;
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ] as const;
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ] as const;
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416,
  ] as const;

  const clamped = Math.min(1 - 1e-6, Math.max(1e-6, p));
  const q = clamped - 0.5;
  if (Math.abs(q) < 0.425) {
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const tail = clamped < 0.5 ? clamped : 1 - clamped;
  const s = Math.sqrt(-2 * Math.log(tail));
  const approx =
    (((((c[0] * s + c[1]) * s + c[2]) * s + c[3]) * s + c[4]) * s + c[5]) /
    ((((d[0] * s + d[1]) * s + d[2]) * s + d[3]) * s + 1);
  return clamped < 0.5 ? approx : -approx;
}

/**
 * κ_i: faktor keamanan kendala peluang.
 * - Gaussian (default): `Φ⁻¹(p)`
 * - Cantelli (bebas distribusi, aman untuk sebaran miring): `sqrt(p / (1 − p))`
 */
export function computeKappa(
  targetProbability: number | undefined,
  useCantelli: boolean | undefined,
): number {
  const p = Math.min(1 - 1e-6, Math.max(1e-6, targetProbability ?? DEFAULT_TARGET_PROBABILITY));
  return useCantelli === true ? Math.sqrt(p / (1 - p)) : normalInverseCdf(p);
}

/** Simpangan baku campuran s = sqrt(xᵀΣx + σ_b² + 1e-12) pada vektor fraksi tertentu. */
export function mixtureStdDev(
  sigmas: readonly number[],
  x: readonly number[],
  requirementVariance: number,
): number {
  let variance = requirementVariance + VARIANCE_FLOOR;
  for (let j = 0; j < sigmas.length; j++) {
    const sigma = sigmas[j] ?? 0;
    const frac = x[j] ?? 0;
    variance += sigma * sigma * frac * frac;
  }
  return Math.sqrt(variance);
}

export interface ChanceLinearization {
  /** Geseran koefisien tiap bahan: `−κ σ_j² x_j⁽ᵗ⁾/s` (min) atau `+…` (max). */
  readonly varianceCoeffs: readonly number[];
  /** Geseran RHS: `+κ(σ_b² + 1e-12)/s` (min) atau `−…` (max). */
  readonly rhsShift: number;
  /** s = sqrt(V(x⁽ᵗ⁾)) yang dipakai saat linearisasi. */
  readonly s: number;
}

/**
 * Linearisasi Taylor orde-1 kendala peluang di `x⁽ᵗ⁾` (Munford, 1996).
 * `sense` adalah arah kendala deterministik aslinya (`>=` untuk batas min, `<=` untuk max),
 * sehingga margin selalu memperketat kendala pada arah yang benar.
 */
export function linearizeChanceConstraint(
  sigmas: readonly number[],
  xPrev: readonly number[],
  kappa: number,
  requirementVariance: number,
  sense: ">=" | "<=",
): ChanceLinearization {
  const s = mixtureStdDev(sigmas, xPrev, requirementVariance);
  const sign = sense === ">=" ? -1 : 1;
  const varianceCoeffs = sigmas.map(
    (sigma, j) => (sign * kappa * sigma * sigma * (xPrev[j] ?? 0)) / s,
  );
  return {
    varianceCoeffs,
    rhsShift: (-sign * kappa * (requirementVariance + VARIANCE_FLOOR)) / s,
    s,
  };
}
