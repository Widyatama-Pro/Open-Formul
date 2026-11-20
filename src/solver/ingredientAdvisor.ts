import { resolveFeedClass } from "../data/feed-classes";
import type {
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  Requirement,
} from "../types";
import { normalizeIngredientToBasis } from "../utils/basis";
import { resolveNutrientValue } from "../utils/equations";
import { isPoultrySpecies, isRuminantSpecies } from "../utils/species";
import {
  isUpperBoundOnlyNutrient,
  resolveActiveConstraints,
  resolveEffectiveConstraintBounds,
  resolveEffectiveInclusion,
  resolveEffectivePricePerKg,
  resolveSingleTargetValue,
} from "./modelHelpers";

export type IndonesiaAvailabilityTier = "high" | "medium" | "low";

export interface NutrientGapInfo {
  readonly nutrientId: string;
  readonly direction: "increase" | "decrease";
  readonly currentValue: number;
  readonly targetValue: number;
  readonly relativeGap: number;
  readonly isViolation: boolean;
}

export interface IngredientSuggestion {
  readonly ingredient: Ingredient;
  readonly availabilityTier: IndonesiaAvailabilityTier;
  readonly score: number;
  readonly targetNutrientIds: readonly string[];
  readonly reasonId: string;
  readonly reasonEn: string;
}

/**
 * ID bahan pakan yang sangat mudah ditemukan di pasar lokal, poultry shop, KUD,
 * dan sentra peternakan Indonesia (prioritas utama rekomendasi).
 */
const HIGH_AVAILABILITY_IDS: ReadonlySet<string> = new Set([
  "corn-ground",
  "sbm-44",
  "rice-bran",
  "fish-meal-local",
  "palm-kernel-meal",
  "cpo-oil",
  "limestone",
  "dcp-mineral",
  "dl-methionine",
  "premix-vitmin",
  "napier-grass",
  "hartadi-rumput-gajah",
  "hartadi-jerami-padi",
  "hartadi-lamtoro",
  "hartadi-kaliandra",
  "hartadi-gamal",
  "hartadi-bungkil-kelapa",
  "hartadi-pollard",
  "hartadi-onggok-kering",
  "hartadi-ampas-tahu",
  "hartadi-molases",
  "hartadi-ampas-bir",
  "hartadi-dedak-kasar",
  "hartadi-jagung-kuning-bk",
  "hartadi-bis-ekspeller",
  "hartadi-t12-0491", // Jagung kuning giling
  "hartadi-t15-005", // Tepung tulang
  "hartadi-t15-007", // Tepung tulang dikukus
  "hartadi-t15-009", // Kalsium karbonat CaCO3
  "hartadi-t15-013", // Dikalsium fosfat DCP
  "hartadi-t15-035", // Batu kapur
  "hartadi-t15-043", // Kulit kerang
  "hartadi-t15-063", // Garam NaCl
]);

const MEDIUM_AVAILABILITY_IDS: ReadonlySet<string> = new Set([
  "hartadi-t12-0007", // Tepung darah
  "hartadi-t12-0009", // Tepung daging
  "hartadi-t12-0011", // Tepung daging dan tulang (MBM)
  "hartadi-t12-0017", // Bungkil kacang tanah mekanis
  "hartadi-t12-0019", // Bungkil kacang tanah solven
  "hartadi-t12-0489", // Jagung putih
  "hartadi-t15-037", // Dolomit
  "hartadi-t15-061", // Natrium bikarbonat
]);

const REAGENT_OR_RARE_RE =
  /\b(cp\b|kobalt|selenit|fluorida|yodida|yodat|tripolifosfat|etilen|kurasao|bekicot|keong|sukun|nanas|tanah-liat|monobasik|belerang|seng asetat|seng klorida|kalium bikarbonat|kalium karbonat)/i;

const HIGH_AVAILABILITY_NAME_RE =
  /\b(jagung kuning|bungkil kedelai|sbm|dedak padi|bekatul|pollard|wheat bran|tepung ikan|bungkil inti sawit|bungkil kelapa|minyak sawit|cpo|onggok|molases|tetes tebu|ampas tahu|rumput gajah|jerami padi|lamtoro|gamal|kaliandra|tepung kapur|batu kapur|kalsium karbonat|dikalsium fosfat|\bdcp\b|tepung tulang|kulit kerang|garam|nacl|premix|metionin|lisin)\b/i;

const MEDIUM_AVAILABILITY_NAME_RE =
  /\b(bungkil kacang|tepung daging|mbm|tepung darah|singkong|gaplek|sorgum|ampas bir|ampas kecap|dolomit|kulit kopi|kulit kakao|jagung putih)\b/i;

/** Mengklasifikasikan tingkat kemudahan memperoleh bahan pakan di Indonesia. */
export function getIndonesiaAvailabilityTier(ingredient: Ingredient): IndonesiaAvailabilityTier {
  if (HIGH_AVAILABILITY_IDS.has(ingredient.id)) return "high";
  if (MEDIUM_AVAILABILITY_IDS.has(ingredient.id)) return "medium";

  const fullText = `${ingredient.name} ${ingredient.nameEn ?? ""}`;
  if (REAGENT_OR_RARE_RE.test(fullText)) return "low";
  if (HIGH_AVAILABILITY_NAME_RE.test(fullText)) return "high";
  if (MEDIUM_AVAILABILITY_NAME_RE.test(fullText)) return "medium";
  return "low";
}

function availabilityWeight(tier: IndonesiaAvailabilityTier): number {
  switch (tier) {
    case "high":
      return 1.0;
    case "medium":
      return 0.58;
    case "low":
      return 0.08;
  }
}

/** Kunci deduplikasi keluarga bahan agar tidak menyarankan dua varian bahan identik sekaligus. */
function resolveFamilyKey(ingredient: Ingredient): string {
  const n = ingredient.name.toLowerCase();
  if (n.includes("jagung") && n.includes("kuning")) return "jagung-kuning";
  if (n.includes("dedak padi") || n.includes("bekatul")) return "dedak-padi";
  if (n.includes("bungkil kedelai") || n.includes("sbm")) return "sbm";
  if (n.includes("bungkil inti sawit") || n.includes("bis")) return "bis";
  if (n.includes("bungkil kelapa")) return "bungkil-kelapa";
  if (n.includes("tepung ikan")) return "tepung-ikan";
  if (n.includes("kapur") || n.includes("caco3") || n.includes("kalsium karbonat")) return "kapur";
  if (n.includes("dikalsium fosfat") || n.includes("dcp") || n.includes("cahpo4")) return "dcp";
  if (n.includes("tepung tulang")) return "tepung-tulang";
  if (n.includes("rumput gajah")) return "rumput-gajah";
  if (n.includes("pollard") || n.includes("wheat bran")) return "pollard";
  return ingredient.id;
}

function isSpeciesCompatible(ingredient: Ingredient, species: string): boolean {
  const isPoultry = isPoultrySpecies(species);
  const isRuminant = isRuminantSpecies(species);
  const feedClass = resolveFeedClass(ingredient);
  const nameLower = ingredient.name.toLowerCase();

  if (isPoultry) {
    // Unggas tidak cocok memakai hijauan segar, jerami, atau silase berserat tinggi
    if (ingredient.category === "forage" || feedClass === 1 || feedClass === 2 || feedClass === 3) {
      return false;
    }
    const cf = ingredient.nutrients.cf;
    if (cf !== null && cf !== undefined && cf > 22) return false;
  }

  if (isRuminant) {
    // Hindari menyarankan protein hewani (tepung darah/daging/ikan) untuk ruminansia
    if (
      nameLower.includes("tepung daging") ||
      nameLower.includes("darah hewan") ||
      nameLower.includes("tepung ikan") ||
      nameLower.includes("bekicot")
    ) {
      return false;
    }
  }

  return true;
}

/** Mendeteksi kesenjangan nutrien yang jauh dari standar atau belum terpenuhi. */
export function detectNutrientGaps(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  result: FormulationResult,
): readonly NutrientGapInfo[] {
  const singleMode = config.targetInputMode === "single";
  const activeConstraints = resolveActiveConstraints(requirement, config);
  const gaps: NutrientGapInfo[] = [];

  if (result.status === "infeasible" || result.nutrients.length === 0) {
    const activeNorm = ingredients
      .filter((i) => i.isActive !== false)
      .map((i) => ({
        ing: normalizeIngredientToBasis(i, config.activeBasis),
        bounds: resolveEffectiveInclusion(i, config),
      }));

    if (activeNorm.length === 0) {
      for (const c of activeConstraints) {
        const eff = resolveEffectiveConstraintBounds(c, singleMode);
        if (eff.min !== undefined) {
          gaps.push({
            nutrientId: c.nutrientId,
            direction: "increase",
            currentValue: 0,
            targetValue: eff.min,
            relativeGap: 1,
            isViolation: true,
          });
        }
      }
      return gaps;
    }

    for (const c of activeConstraints) {
      const eff = resolveEffectiveConstraintBounds(c, singleMode);
      const vals = activeNorm.map(({ ing }) => resolveNutrientValue(ing, c.nutrientId) ?? 0);
      const maxPoss = Math.max(...vals);
      const minPoss = Math.min(...vals);

      if (eff.min !== undefined && maxPoss + 1e-4 < eff.min) {
        const scale = Math.max(Math.abs(eff.min), 1e-3);
        gaps.push({
          nutrientId: c.nutrientId,
          direction: "increase",
          currentValue: maxPoss,
          targetValue: eff.min,
          relativeGap: (eff.min - maxPoss) / scale,
          isViolation: true,
        });
      } else if (eff.max !== undefined && minPoss - 1e-4 > eff.max) {
        const scale = Math.max(Math.abs(eff.max), 1e-3);
        gaps.push({
          nutrientId: c.nutrientId,
          direction: "decrease",
          currentValue: minPoss,
          targetValue: eff.max,
          relativeGap: (minPoss - eff.max) / scale,
          isViolation: true,
        });
      }
    }

    // Jika infeasible karena interaksi multi-kendala (tidak terdeteksi satu-per-satu),
    // ambil target utama dari konflik / IIS atau nutrien makro standar.
    if (gaps.length === 0) {
      const iisTargets = new Set(
        (result.iis ?? []).filter((it) => it.kind === "nutrient").map((it) => it.targetId),
      );
      const conflictTargets = new Set(
        (result.conflicts ?? []).map((c) => c.targetId).filter((v): v is string => Boolean(v)),
      );
      const fallbackIds = new Set([...iisTargets, ...conflictTargets]);
      for (const c of activeConstraints) {
        if (fallbackIds.size > 0 && !fallbackIds.has(c.nutrientId)) continue;
        const eff = resolveEffectiveConstraintBounds(c, singleMode);
        const vals = activeNorm.map(({ ing }) => resolveNutrientValue(ing, c.nutrientId) ?? 0);
        const avgVal = vals.reduce((s, v) => s + v, 0) / Math.max(vals.length, 1);
        if (eff.min !== undefined) {
          gaps.push({
            nutrientId: c.nutrientId,
            direction: "increase",
            currentValue: avgVal,
            targetValue: eff.min,
            relativeGap: Math.max(0.2, Math.abs(eff.min - avgVal) / Math.max(eff.min, 1e-3)),
            isViolation: true,
          });
        } else if (eff.max !== undefined) {
          gaps.push({
            nutrientId: c.nutrientId,
            direction: "decrease",
            currentValue: avgVal,
            targetValue: eff.max,
            relativeGap: Math.max(0.2, Math.abs(avgVal - eff.max) / Math.max(eff.max, 1e-3)),
            isViolation: true,
          });
        }
      }
    }
    return gaps;
  }

  const resMap = new Map(result.nutrients.map((r) => [r.nutrientId, r]));

  for (const c of activeConstraints) {
    const res = resMap.get(c.nutrientId);
    if (!res) continue;

    if (res.status === "below_min" && res.min !== undefined) {
      const scale = Math.max(Math.abs(res.min), 1e-3);
      gaps.push({
        nutrientId: c.nutrientId,
        direction: "increase",
        currentValue: res.value,
        targetValue: res.min,
        relativeGap: Math.max(0, (res.min - res.value) / scale),
        isViolation: true,
      });
      continue;
    }

    if (res.status === "above_max" && res.max !== undefined) {
      const scale = Math.max(Math.abs(res.max), 1e-3);
      gaps.push({
        nutrientId: c.nutrientId,
        direction: "decrease",
        currentValue: res.value,
        targetValue: res.max,
        relativeGap: Math.max(0, (res.value - res.max) / scale),
        isViolation: true,
      });
      continue;
    }

    // Khusus Mode Pendekatan 1 Angka: deteksi bila hasil jauh dari angka target meski feasible
    if (singleMode) {
      const target = resolveSingleTargetValue(c);
      if (target === null || target <= 0) continue;
      const isUpper = isUpperBoundOnlyNutrient(c.nutrientId, c);
      const relDiff = Math.abs(res.value - target) / Math.max(Math.abs(target), 1e-3);

      if (!isUpper && res.value > target * 1.15) {
        // Nutrien minimal melampaui target jauh (> +15%)
        gaps.push({
          nutrientId: c.nutrientId,
          direction: "decrease",
          currentValue: res.value,
          targetValue: target,
          relativeGap: relDiff,
          isViolation: false,
        });
      } else if (isUpper && res.value < target * 0.65) {
        // Batas maksimal (mis. SK) masih terlalu jauh di bawah target (< 65% target)
        gaps.push({
          nutrientId: c.nutrientId,
          direction: "increase",
          currentValue: res.value,
          targetValue: target,
          relativeGap: relDiff * 0.55,
          isViolation: false,
        });
      }
    }
  }

  return gaps;
}

function getNutrientShortLabel(
  nutrientId: string,
  allNutrients: readonly Nutrient[],
  lang: "id" | "en",
): string {
  const shortMap: Record<string, { readonly id: string; readonly en: string }> = {
    cp: { id: "PK", en: "CP" },
    me_poultry: { id: "EM", en: "ME" },
    tdn: { id: "TDN", en: "TDN" },
    ee: { id: "LK", en: "EE" },
    cf: { id: "SK", en: "CF" },
    ca: { id: "Ca", en: "Ca" },
    p: { id: "P", en: "P" },
    lys: { id: "Lisin", en: "Lysine" },
    met: { id: "Metionin", en: "Methionine" },
  };
  const preset = shortMap[nutrientId];
  if (preset) return lang === "id" ? preset.id : preset.en;
  const meta = allNutrients.find((n) => n.id === nutrientId);
  if (!meta) return nutrientId.toUpperCase();
  return lang === "id" ? meta.name : (meta.nameEn ?? meta.name);
}

/**
 * Algoritma Rekomendasi Bahan Pakan Prioritas Indonesia:
 * Menyarankan 1–3 bahan non-aktif yang paling efektif menutup celah/deviasi nutrien,
 * dengan prioritas ketat pada bahan yang mudah diperoleh peternak di Indonesia.
 */
export function recommendIngredientsForGaps(
  allIngredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
  result: FormulationResult,
  allNutrients: readonly Nutrient[],
  options?: {
    readonly maxSuggestions?: number;
    readonly dismissedIds?: ReadonlySet<string>;
  },
): readonly IngredientSuggestion[] {
  const maxSuggestions = options?.maxSuggestions ?? 3;
  const dismissedIds = options?.dismissedIds ?? new Set<string>();

  const gaps = detectNutrientGaps(allIngredients, requirement, config, result);
  if (gaps.length === 0) return [];

  const cfConstraint = requirement.constraints.find((c) => c.nutrientId === "cf");
  const cfMaxLimit = cfConstraint?.max;

  const inactiveCandidates = allIngredients.filter((ing) => {
    if (ing.isActive !== false) return false;
    if (dismissedIds.has(ing.id)) return false;
    if ((ing.inclusion?.max ?? 100) <= 0) return false;
    return isSpeciesCompatible(ing, requirement.species);
  });

  if (inactiveCandidates.length === 0) return [];

  const scored: IngredientSuggestion[] = [];

  for (const rawIng of inactiveCandidates) {
    const normIng = normalizeIngredientToBasis(rawIng, config.activeBasis);
    const tier = getIndonesiaAvailabilityTier(rawIng);
    const availW = availabilityWeight(tier);

    let totalGain = 0;
    const matchedGaps: {
      readonly gap: NutrientGapInfo;
      readonly candVal: number;
      readonly contrib: number;
    }[] = [];

    for (const gap of gaps) {
      const candVal = resolveNutrientValue(normIng, gap.nutrientId);
      if (candVal === null || !Number.isFinite(candVal)) continue;

      const scale = Math.max(Math.abs(gap.targetValue), 1e-3);
      const priorityW = gap.isViolation ? 2.4 : 1.0;

      if (gap.direction === "increase") {
        // Kandidat harus lebih kaya dari kondisi saat ini & melampaui target agar mampu menarik rata-rata naik
        const aboveTarget = candVal - gap.targetValue;
        const aboveCurrent = candVal - gap.currentValue;
        if (aboveCurrent <= 0) continue;
        // Untuk batas maksimal (mis. SK yang terlalu rendah), jangan sarankan bahan yang terlalu ekstrem seratnya
        if (isUpperBoundOnlyNutrient(gap.nutrientId) && candVal > gap.targetValue * 3.5) {
          continue;
        }
        const effectiveLift =
          aboveTarget > 0
            ? Math.min(2.5, aboveCurrent / scale)
            : Math.min(0.6, (aboveCurrent / scale) * 0.45);
        if (effectiveLift <= 0.05) continue;
        const contrib = effectiveLift * Math.min(2.0, Math.max(0.25, gap.relativeGap)) * priorityW;
        totalGain += contrib;
        matchedGaps.push({ gap, candVal, contrib });
      } else {
        // Direction "decrease": kandidat harus lebih rendah dari target agar bisa mengencerkan kelebihan
        if (candVal >= gap.targetValue) continue;
        const dilution = Math.min(1.8, (gap.currentValue - candVal) / scale);
        if (dilution <= 0.08) continue;
        // Untuk pengenceran, bahan energi/makro berguna; hindari menyarankan mineral murni (kapur/garam) untuk menurunkan PK!
        if (
          (gap.nutrientId === "cp" || gap.nutrientId === "cf") &&
          (rawIng.category === "mineral" ||
            rawIng.category === "premix" ||
            rawIng.category === "additive")
        ) {
          continue;
        }
        const contrib = dilution * Math.min(2.0, Math.max(0.25, gap.relativeGap)) * priorityW;
        totalGain += contrib;
        matchedGaps.push({ gap, candVal, contrib });
      }
    }

    if (totalGain <= 0 || matchedGaps.length === 0) continue;

    // Penalti ringan jika bahan menyumbang serat kasar terlalu tinggi melampaui batas SK standar
    let sideEffectFactor = 1.0;
    const candCf = resolveNutrientValue(normIng, "cf");
    if (
      cfMaxLimit !== undefined &&
      candCf !== null &&
      candCf > cfMaxLimit * 2.2 &&
      !matchedGaps.some((m) => m.gap.nutrientId === "cf" && m.gap.direction === "increase")
    ) {
      sideEffectFactor = 0.65;
    }

    // Faktor keekonomisan wajar (bahan yang sangat mahal sedikit turun skornya pada tie-break)
    const price = resolveEffectivePricePerKg(rawIng);
    const priceFactor = price > 45000 ? 0.78 : price > 20000 ? 0.9 : 1.0;

    const finalScore = totalGain * availW * sideEffectFactor * priceFactor;
    if (finalScore <= 0.02) continue;

    matchedGaps.sort((a, b) => b.contrib - a.contrib);
    const primary = matchedGaps[0]!;
    const nutLabelId = getNutrientShortLabel(primary.gap.nutrientId, allNutrients, "id");
    const nutLabelEn = getNutrientShortLabel(primary.gap.nutrientId, allNutrients, "en");
    const nutMeta = allNutrients.find((n) => n.id === primary.gap.nutrientId);
    const unit = nutMeta?.unit ?? "%";
    const candDisplay =
      unit === "kcal/kg" ? Math.round(primary.candVal).toString() : primary.candVal.toFixed(1);

    const actionId =
      primary.gap.direction === "increase"
        ? `membantu menaikkan ${nutLabelId} (kandungan ${candDisplay} ${unit})`
        : `membantu menurunkan ${nutLabelId} mendekati standar (${candDisplay} ${unit})`;
    const actionEn =
      primary.gap.direction === "increase"
        ? `helps raise ${nutLabelEn} (contains ${candDisplay} ${unit})`
        : `helps bring ${nutLabelEn} closer to target (${candDisplay} ${unit})`;

    const tierHintId =
      tier === "high"
        ? "mudah didapat di pasar pakan Indonesia"
        : tier === "medium"
          ? "tersedia di distributor pakan daerah"
          : "bahan alternatif khusus";
    const tierHintEn =
      tier === "high"
        ? "widely available in Indonesia"
        : tier === "medium"
          ? "available via regional suppliers"
          : "specialty alternative";

    scored.push({
      ingredient: rawIng,
      availabilityTier: tier,
      score: finalScore,
      targetNutrientIds: matchedGaps.map((m) => m.gap.nutrientId),
      reasonId: `${actionId[0]!.toUpperCase()}${actionId.slice(1)} — ${tierHintId}.`,
      reasonEn: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)} — ${tierHintEn}.`,
    });
  }

  // Prioritaskan bahan mudah/cukup mudah didapat di Indonesia; hanya tampilkan tier "low" bila tidak ada alternatif
  const hasAccessibleOption = scored.some((s) => s.availabilityTier !== "low");
  const filteredPool = hasAccessibleOption
    ? scored.filter((s) => s.availabilityTier !== "low")
    : scored;

  filteredPool.sort((a, b) => b.score - a.score);

  const uniqueByFamily: IngredientSuggestion[] = [];
  const seenFamilies = new Set<string>();
  for (const item of filteredPool) {
    const family = resolveFamilyKey(item.ingredient);
    if (seenFamilies.has(family)) continue;
    seenFamilies.add(family);
    uniqueByFamily.push(item);
    if (uniqueByFamily.length >= maxSuggestions) break;
  }

  return uniqueByFamily;
}
