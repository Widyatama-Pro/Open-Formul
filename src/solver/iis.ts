import type { FormulationConfig, IisItem, Ingredient, Requirement } from "../types";
import { buildLpModel } from "./buildModel";
import type { LpRunner } from "./highsTypes";
import { toLpString } from "./toLpString";
import type { GroupLimitRule, LpRow } from "./types";

export interface IisCandidate {
  readonly id: string;
  readonly item: IisItem;
  readonly drop: (requirement: Requirement) => Requirement;
}

function rowToCandidate(row: LpRow): IisCandidate | null {
  const m = row.meta;
  if (m.kind === "sum_to_one") return null;

  if (m.kind === "nutrient_min" || m.kind === "nutrient_max" || m.kind === "nutrient_eq") {
    const bound = m.kind === "nutrient_min" ? "min" : m.kind === "nutrient_max" ? "max" : "eq";
    return {
      id: `nut:${m.nutrientId}:${bound}`,
      item: {
        kind: "nutrient",
        targetId: m.nutrientId,
        bound,
        message: `Kendala nutrien ${m.nutrientId} (${bound}) berkonflik.`,
      },
      drop: (req) => ({
        ...req,
        constraints: req.constraints.filter((c) => {
          if (c.nutrientId !== m.nutrientId) return true;
          if (bound === "eq")
            return !(c.min !== undefined && c.max !== undefined && c.min === c.max);
          if (bound === "min") return c.min === undefined;
          return c.max === undefined;
        }),
      }),
    };
  }

  if (m.kind === "ratio_min" || m.kind === "ratio_max") {
    const bound = m.kind === "ratio_min" ? "min" : "max";
    const targetId = `${m.numeratorId}:${m.denominatorId}`;
    return {
      id: `ratio:${targetId}:${bound}`,
      item: {
        kind: "ratio",
        targetId,
        bound,
        message: `Kendala rasio ${targetId} (${bound} ${m.targetRatio}) berkonflik.`,
      },
      drop: (req) => ({
        ...req,
        ratios: (req.ratios ?? []).flatMap((r) => {
          if (!(r.numerator === m.numeratorId && r.denominator === m.denominatorId)) return [r];
          // Buang hanya sisi yang diuji; sisi lain dipertahankan.
          const kept = {
            numerator: r.numerator,
            denominator: r.denominator,
            ...(r.id !== undefined ? { id: r.id } : {}),
            ...(r.label !== undefined ? { label: r.label } : {}),
            ...(r.tier !== undefined ? { tier: r.tier } : {}),
            ...(bound === "max" && r.min !== undefined ? { min: r.min } : {}),
            ...(bound === "min" && r.max !== undefined ? { max: r.max } : {}),
          };
          if (kept.min === undefined && kept.max === undefined) return [];
          return [kept];
        }),
      }),
    };
  }

  if (
    (m.kind === "group_min" || m.kind === "group_max") &&
    m.groupId &&
    !m.groupId.startsWith("cat:")
  ) {
    const bound = m.kind === "group_min" ? "min" : "max";
    const groupId = m.groupId;
    const label = m.groupName ?? groupId;
    return {
      id: `group:${groupId}:${bound}`,
      item: {
        kind: "group",
        targetId: groupId,
        bound,
        message: `Kendala grup "${label}" (${bound} ${m.boundPct}%) berkonflik.`,
      },
      drop: (req) => ({
        ...req,
        ingredientGroups: (req.ingredientGroups ?? []).flatMap((g) => {
          if (g.id !== groupId) return [g];
          const kept = {
            id: g.id,
            name: g.name,
            ingredientIds: g.ingredientIds,
            ...(g.tier !== undefined ? { tier: g.tier } : {}),
            ...(bound === "max" && g.min !== undefined ? { min: g.min } : {}),
            ...(bound === "min" && g.max !== undefined ? { max: g.max } : {}),
          };
          if (kept.min === undefined && kept.max === undefined) return [];
          return [kept];
        }),
      }),
    };
  }

  return null;
}

async function isInfeasible(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  groupLimits?: readonly GroupLimitRule[],
): Promise<boolean> {
  const model = buildLpModel(ingredients, requirement, config, {
    elastic: false,
    ...(groupLimits ? { groupLimits } : {}),
  });
  const out = await solveLp(toLpString(model));
  return out.solution.Status !== "Optimal";
}

/**
 * Chinneck Deletion Filter: temukan subset kendala minimal pemicu infeasibility.
 * Berjalan pada model LP murni (tanpa slack elastik) dan menguji kandidat kendala
 * (nutrien & rasio) satu per satu.
 */
export async function findMinimalIis(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  solveLp: LpRunner,
  groupLimits?: readonly GroupLimitRule[],
): Promise<readonly IisItem[]> {
  const infeasible = await isInfeasible(ingredients, requirement, config, solveLp, groupLimits);
  if (!infeasible) return [];

  // Bangun kandidat dari model penuh.
  const fullModel = buildLpModel(ingredients, requirement, config, {
    elastic: false,
    ...(groupLimits ? { groupLimits } : {}),
  });

  const seen = new Set<string>();
  const candidates: IisCandidate[] = [];
  for (const row of fullModel.rows) {
    if (row.meta.kind === "goal_deviation" || row.meta.kind === "chebyshev") continue;
    const cand = rowToCandidate(row);
    if (!cand || seen.has(cand.id)) continue;
    seen.add(cand.id);
    candidates.push(cand);
  }

  // Deletion filter: pertahankan kandidat hanya bila penghapusannya membuat sistem feasible.
  let workReq = requirement;
  const iis: IisItem[] = [];
  for (const cand of candidates) {
    // Hanya kandidat yang masih relevan pada requirement kerja.
    const testReq = cand.drop(workReq);
    // Jika drop tidak mengubah apapun (mis. group yang tidak bisa dipetakan), skip dari filter spesifik.
    if (JSON.stringify(testReq) === JSON.stringify(workReq)) {
      // Coba deteksi apakah kandidat ini masih "terlibat" dengan mengecek model saat ini.
      continue;
    }
    const stillBad = await isInfeasible(ingredients, testReq, config, solveLp, groupLimits);
    if (stillBad) {
      // Kandidat tidak esensial -> buang permanen.
      workReq = testReq;
    } else {
      // Kandidat esensial -> bagian dari IIS.
      const tier =
        cand.item.kind === "nutrient"
          ? requirement.constraints.find((c) => c.nutrientId === cand.item.targetId)?.tier
          : cand.item.kind === "ratio"
            ? requirement.ratios?.find(
                (r) => `${r.numerator}:${r.denominator}` === cand.item.targetId,
              )?.tier
            : undefined;
      iis.push(tier ? { ...cand.item, tier } : cand.item);
    }
  }

  return iis;
}
