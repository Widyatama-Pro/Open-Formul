import type { ConflictDiagnostic, FormulationConfig, Ingredient, Requirement } from "../types";
import { normalizeIngredientToBasis } from "../utils/basis";
import { isDerivedNutrient, resolveNutrientValue } from "../utils/equations";
import {
  resolveActiveConstraints,
  resolveEffectiveInclusion,
  type EffectiveInclusionBounds,
} from "./modelHelpers";
import type { GroupLimitRule, PrecheckResult } from "./types";

const EPS = 1e-7;

interface BoundPair {
  readonly ing: Ingredient;
  readonly bounds: EffectiveInclusionBounds;
}

/** Menghitung batas min/maks tercapai untuk Σ a_j x_j pada simpleks [l_j, u_j], Σ x_j = 1. */
function computeKnapsackExtrema(
  items: readonly BoundPair[],
  nutrientId: string,
): { readonly minAchievable: number; readonly maxAchievable: number } {
  const entries = items.map(({ ing, bounds }) => ({
    val: resolveNutrientValue(ing, nutrientId) ?? 0,
    minFrac: bounds.minPct / 100,
    maxFrac: bounds.maxPct / 100,
  }));

  const minSum = entries.reduce((acc, e) => acc + e.minFrac, 0);
  const rem = Math.max(0, 1 - minSum);

  const solveGreedy = (descending: boolean): number => {
    const sorted = [...entries].sort((a, b) => (descending ? b.val - a.val : a.val - b.val));
    let total = 0;
    let slackLeft = rem;
    for (const item of sorted) {
      const add = Math.min(slackLeft, Math.max(0, item.maxFrac - item.minFrac));
      total += (item.minFrac + add) * item.val;
      slackLeft -= add;
    }
    return total;
  };

  return {
    minAchievable: solveGreedy(false),
    maxAchievable: solveGreedy(true),
  };
}

export function runPrecheck(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  groupLimits: readonly GroupLimitRule[] = [],
): PrecheckResult {
  const diagnostics: ConflictDiagnostic[] = [];
  const activeRaw = ingredients.filter((i) => i.isActive !== false);

  if (activeRaw.length === 0) {
    diagnostics.push({
      code: "INCLUSION_MAX_UNDER_100",
      severity: "error",
      message: "Tidak ada bahan pakan yang aktif (total batas maksimal = 0% < 100%).",
      suggestion: "Aktifkan minimal satu sumber energi atau protein terlebih dahulu.",
    });
    return { hasErrors: true, diagnostics };
  }

  // PR-03: guard 0/0 pra-solve untuk Fractional LP
  if (config.fractionalObjective?.mode === "cost_per_nutrient") {
    const denId = config.fractionalObjective.nutrientId;
    const maxDen = activeRaw.reduce((sum, ing) => {
      const v = resolveNutrientValue(ing, denId) ?? 0;
      return Math.max(sum, v);
    }, 0);
    if (maxDen <= 1e-9) {
      diagnostics.push({
        code: "FRACTIONAL_DENOMINATOR_ZERO",
        severity: "error",
        targetId: denId,
        message: `Penyebut sasaran fraksional "${denId}" bernilai 0 pada seluruh bahan aktif.`,
        suggestion: `Tambahkan bahan yang mengandung nutrien "${denId}" atau ubah sasaran fraksional.`,
      });
      return { hasErrors: true, diagnostics };
    }
  }

  let hasStructuralBoundError = false;
  const normalizedPairs: BoundPair[] = [];

  for (const ing of activeRaw) {
    if (!Number.isFinite(ing.dryMatter) || ing.dryMatter <= 0 || ing.dryMatter > 100) {
      hasStructuralBoundError = true;
      diagnostics.push({
        code: "MIN_GT_MAX",
        severity: "error",
        message: `Bahan "${ing.name}" memiliki Bahan Kering (BK) tidak valid (${ing.dryMatter}%). Harus dalam rentang (0, 100].`,
        suggestion: "Perbaiki nilai BK % pada detail bahan agar > 0 dan <= 100%.",
      });
      continue;
    }

    const rawMinPct = ing.inclusion?.min ?? 0;
    const rawMaxPct = ing.inclusion?.max ?? 100;

    if (rawMinPct > rawMaxPct + EPS) {
      hasStructuralBoundError = true;
      diagnostics.push({
        code: "MIN_GT_MAX",
        severity: "error",
        message: `Inklusi Min bahan "${ing.name}" (${rawMinPct}%) lebih besar daripada Max (${rawMaxPct}%).`,
        suggestion: "Turunkan batas Min atau naikkan batas Max pada tabel bahan.",
      });
    }

    const bounds = resolveEffectiveInclusion(ing, config);
    if (bounds.isLocked && (bounds.minPct < rawMinPct - EPS || bounds.maxPct > rawMaxPct + EPS)) {
      hasStructuralBoundError = true;
      diagnostics.push({
        code: "MIN_GT_MAX",
        severity: "error",
        message: `Kunci manual "${ing.name}" (${bounds.minPct}%) berada di luar batas inklusi [${rawMinPct}%, ${rawMaxPct}%].`,
        suggestion: "Lepaskan kunci manual atau sesuaikan batas inklusi bahan.",
      });
    }

    normalizedPairs.push({
      ing: normalizeIngredientToBasis(ing, config.activeBasis),
      bounds,
    });
  }

  // Peringatan Anti-Nol (> 50% total min otomatis)
  if (config.globalZeroInclusion.enforceNonZero) {
    const autoMin = config.globalZeroInclusion.minIfSelected ?? 0;
    const eligibleCount = normalizedPairs.filter(
      ({ bounds }) => !bounds.isLocked && bounds.maxPct > EPS,
    ).length;
    if (eligibleCount * autoMin > 50 + EPS) {
      diagnostics.push({
        code: "ANTI_NOL_CONFLICT",
        severity: "warning",
        message: `Aturan Anti-Nol memicu minimal total ${(eligibleCount * autoMin).toFixed(1)}% (> 50%) pada ${eligibleCount} bahan aktif.`,
        suggestion:
          "Nonaktifkan Anti-Nol global atau kurangi bahan aktif agar ruang optimasi tetap lega.",
      });
    }
  }

  // Cek total sum batas inklusi efektif [minPct, maxPct]
  const totalMinPct = normalizedPairs.reduce((acc, p) => acc + p.bounds.minPct, 0);
  const totalMaxPct = normalizedPairs.reduce((acc, p) => acc + p.bounds.maxPct, 0);

  if (!hasStructuralBoundError) {
    if (totalMinPct > 100 + 1e-4) {
      hasStructuralBoundError = true;
      diagnostics.push({
        code: "INCLUSION_SUM_EXCEEDS_100",
        severity: "error",
        message: `Jumlah batas inklusi minimal (${totalMinPct.toFixed(2)}%) melebihi 100%.`,
        suggestion:
          "Kurangi batas minimal beberapa bahan atau aturan Anti-Nol hingga totalnya <= 100%.",
      });
    }
    if (totalMaxPct < 100 - 1e-4) {
      hasStructuralBoundError = true;
      diagnostics.push({
        code: "INCLUSION_MAX_UNDER_100",
        severity: "error",
        message: `Jumlah batas inklusi maksimal (${totalMaxPct.toFixed(2)}%) kurang dari 100%.`,
        suggestion: "Naikkan batas maksimal bahan pengisi atau aktifkan lebih banyak bahan.",
      });
    }
  }

  // Cek Requirement.ingredientGroups (min <= max)
  for (const grp of requirement.ingredientGroups ?? []) {
    if (grp.min !== undefined && grp.max !== undefined && grp.min > grp.max + EPS) {
      hasStructuralBoundError = true;
      diagnostics.push({
        code: "MIN_GT_MAX",
        severity: "error",
        targetId: grp.id,
        message: `Grup bahan "${grp.name}" memiliki Min (${grp.min}%) > Max (${grp.max}%).`,
      });
    }
  }

  // Cek batas grup kategori bahan jika diteruskan ke precheck
  for (const grp of groupLimits) {
    if (grp.minPct !== undefined && grp.maxPct !== undefined && grp.minPct > grp.maxPct + EPS) {
      hasStructuralBoundError = true;
      diagnostics.push({
        code: "MIN_GT_MAX",
        severity: "error",
        message: `Batas grup kategori "${grp.category}" memiliki Min (${grp.minPct}%) > Max (${grp.maxPct}%).`,
      });
    }
  }

  // Cek constraint nutrien aktif
  const activeConstraints = resolveActiveConstraints(requirement, config);
  const missingAdvanceFields: string[] = [];

  for (const c of activeConstraints) {
    if (c.min !== undefined && c.max !== undefined && c.min > c.max + EPS) {
      hasStructuralBoundError = true;
      diagnostics.push({
        code: "MIN_GT_MAX",
        severity: "error",
        message: `Target nutrien "${c.nutrientId}" memiliki Min (${c.min}) > Max (${c.max}).`,
        suggestion: "Pastikan batas minimum <= batas maksimum pada panel Target Nutrien.",
      });
      continue;
    }

    if (config.enableAdvanceNutrients) {
      const rawNulls = activeRaw.filter((rawIng, idx) => {
        const pair = normalizedPairs[idx];
        const hasCapacity = pair ? pair.bounds.maxPct > EPS : true;
        const rawVal = isDerivedNutrient(c.nutrientId)
          ? resolveNutrientValue(rawIng, c.nutrientId)
          : rawIng.nutrients[c.nutrientId];
        return hasCapacity && (rawVal === null || rawVal === undefined);
      });
      if (rawNulls.length > 0) {
        missingAdvanceFields.push(
          `${c.nutrientId} (${rawNulls
            .map((i) => i.name)
            .slice(0, 2)
            .join(", ")}${rawNulls.length > 2 ? ` +${rawNulls.length - 2}` : ""})`,
        );
      }
    }

    if (!hasStructuralBoundError && normalizedPairs.length > 0) {
      const { minAchievable, maxAchievable } = computeKnapsackExtrema(
        normalizedPairs,
        c.nutrientId,
      );
      if (c.min !== undefined && maxAchievable + 1e-5 < c.min) {
        diagnostics.push({
          code: "NUTRIENT_UNREACHABLE",
          severity: "error",
          message: `Target Min "${c.nutrientId}" (${c.min}) mustahil dicapai; maksimum gabungan bahan saat ini hanya ${maxAchievable.toFixed(2)}.`,
          suggestion:
            "Tambahkan bahan kaya nutrien ini, naikkan Max inklusi sumber utama, atau longgarkan target.",
        });
      }
      if (c.max !== undefined && minAchievable - 1e-5 > c.max) {
        diagnostics.push({
          code: "NUTRIENT_UNREACHABLE",
          severity: "error",
          message: `Target Max "${c.nutrientId}" (${c.max}) mustahil dicapai; minimum gabungan bahan terpakai adalah ${minAchievable.toFixed(2)}.`,
          suggestion: "Kurangi batas Min bahan penyumbang berlebih atau naikkan batas Max nutrien.",
        });
      }
    }
  }

  if (missingAdvanceFields.length > 0) {
    diagnostics.push({
      code: "ADVANCE_NULL_DATA",
      severity: "warning",
      message: `Mode Advance aktif, namun ada bahan dengan nilai kosong (N/A) pada: ${missingAdvanceFields.slice(0, 3).join("; ")}.`,
      suggestion:
        "Isi data lab bahan (atau perhatikan bahwa nilai kosong diperlakukan sebagai 0 dalam LP).",
    });
  }

  // Cek rasio agar penyebut tidak seluruhnya 0 (hindari 0/0 semu)
  for (const ratio of requirement.ratios ?? []) {
    if (ratio.min !== undefined && ratio.max !== undefined && ratio.min > ratio.max + EPS) {
      diagnostics.push({
        code: "MIN_GT_MAX",
        severity: "error",
        message: `Rasio ${ratio.numerator}:${ratio.denominator} memiliki Min (${ratio.min}) > Max (${ratio.max}).`,
      });
      continue;
    }

    if (!hasStructuralBoundError && normalizedPairs.length > 0) {
      const denExtrema = computeKnapsackExtrema(normalizedPairs, ratio.denominator);
      if (denExtrema.maxAchievable <= 1e-7) {
        diagnostics.push({
          code: "NUTRIENT_UNREACHABLE",
          severity: "error",
          message: `Rasio ${ratio.numerator}:${ratio.denominator} tidak terdefinisi karena kandungan "${ratio.denominator}" seluruh bahan aktif bernilai 0.`,
          suggestion: "Tambahkan bahan sumber mineral atau sesuaikan pengunci rasio.",
        });
      }
    }
  }

  const hasErrors = diagnostics.some((d) => d.severity === "error");
  return { hasErrors, diagnostics };
}
