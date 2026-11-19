import type { AppLanguage, FeedClassCode, Ingredient, IngredientCategory } from "../types";

export interface FeedClassDefinition {
  readonly code: FeedClassCode;
  readonly nameId: string;
  readonly nameEn: string;
  readonly shortId: string;
  readonly shortEn: string;
  readonly descriptionId: string;
  readonly descriptionEn: string;
  readonly defaultCategory: IngredientCategory;
}

/**
 * 8 Klasifikasi Bahan Pakan Standar Internasional (International Feed Nomenclature / NRC /
 * Hartadi et al. 1980 Tabel 7).
 */
export const FEED_CLASSES: readonly FeedClassDefinition[] = [
  {
    code: 1,
    nameId: "Hijauan Kering & Jerami",
    nameEn: "Dry Forages & Roughages",
    shortId: "Hijauan Kering",
    shortEn: "Dry Forages",
    descriptionId: "Hay, jerami, sekam, kulit biji, atau hijauan kering berserat kasar > 18%.",
    descriptionEn: "Hay, straw, hulls, stover, and dry roughages with > 18% crude fiber.",
    defaultCategory: "forage",
  },
  {
    code: 2,
    nameId: "Pastura & Hijauan Segar",
    nameEn: "Pasture & Green Forages",
    shortId: "Hijauan Segar",
    shortEn: "Green Forages",
    descriptionId: "Rumput segar, leguminosa, daun-daunan, dan tanaman padangan diberikan segar.",
    descriptionEn: "Fresh grasses, legumes, leaves, and pasture plants fed green.",
    defaultCategory: "forage",
  },
  {
    code: 3,
    nameId: "Silase",
    nameEn: "Silages",
    shortId: "Silase",
    shortEn: "Silages",
    descriptionId: "Hijauan fermentasi anaerob (silase jagung, rumput, sorgum, legum).",
    descriptionEn: "Ensiled forages (corn, grass, sorghum, or legume silages).",
    defaultCategory: "forage",
  },
  {
    code: 4,
    nameId: "Sumber Energi",
    nameEn: "Energy Feeds",
    shortId: "Sumber Energi",
    shortEn: "Energy Feeds",
    descriptionId: "Biji-bijian, dedak, umbi, molases, minyak/lemak (PK < 20% dan SK < 18%).",
    descriptionEn: "Grains, milling by-products, tubers, molasses, oils (< 20% CP, < 18% CF).",
    defaultCategory: "energy",
  },
  {
    code: 5,
    nameId: "Sumber Protein",
    nameEn: "Protein Supplements",
    shortId: "Sumber Protein",
    shortEn: "Protein Feeds",
    descriptionId: "Bungkil-bungkilan, tepung ikan, tepung daging/darah, dan bahan PK >= 20%.",
    descriptionEn: "Oilseed meals, fish/meat meals, and feeds with >= 20% crude protein.",
    defaultCategory: "protein",
  },
  {
    code: 6,
    nameId: "Sumber Mineral",
    nameEn: "Mineral Supplements",
    shortId: "Sumber Mineral",
    shortEn: "Minerals",
    descriptionId: "Tepung kapur, DCP, tepung tulang, garam, dan suplemen mineral makro/mikro.",
    descriptionEn: "Limestone, DCP, bone meal, salt, and macro/trace mineral supplements.",
    defaultCategory: "mineral",
  },
  {
    code: 7,
    nameId: "Sumber Vitamin",
    nameEn: "Vitamin Supplements",
    shortId: "Sumber Vitamin",
    shortEn: "Vitamins",
    descriptionId: "Premix vitamin-mineral, konsentrat vitamin, dan ragi sumber vitamin.",
    descriptionEn: "Vitamin-mineral premixes, vitamin concentrates, and yeast sources.",
    defaultCategory: "premix",
  },
  {
    code: 8,
    nameId: "Aditif / Imbuhan Pakan",
    nameEn: "Feed Additives",
    shortId: "Aditif",
    shortEn: "Additives",
    descriptionId: "Asam amino sintetis, enzim, probiotik, pengikat toksin, dan imbuhan lainnya.",
    descriptionEn: "Synthetic amino acids, enzymes, probiotics, binders, and other additives.",
    defaultCategory: "additive",
  },
];

const FEED_CLASS_MAP = new Map<FeedClassCode, FeedClassDefinition>(
  FEED_CLASSES.map((item) => [item.code, item]),
);

const IFN_CLASS_RE = /IFN\s+([1-8])-\d/i;
const SILAGE_RE = /\b(silase|silage|ensiled)\b/i;
const DRY_ROUGHAGE_RE =
  /\b(jerami|hay|straw|kering|sekam|tongkol|kulit|hull|stover|bagasse|ampas tebu|pucuk.*kering|dehydrated|sun-cured|s-c)\b/i;
const VITAMIN_RE = /\b(premix|vitamin|vit\.|ragi|yeast)\b/i;

/**
 * Menentukan kode kelas bahan pakan standar (1–8) secara deterministik:
 * 1) Field eksplisit `feedClass` bila ada
 * 2) Nomor IFN resmi pada sitasi `source` (digit pertama IFN = kelas 1–8)
 * 3) Klasifikasi standar berdasarkan kategori, nama, kadar BK, dan PK/SK.
 */
export function resolveFeedClass(ingredient: Ingredient): FeedClassCode {
  if (
    ingredient.feedClass !== undefined &&
    ingredient.feedClass >= 1 &&
    ingredient.feedClass <= 8
  ) {
    return ingredient.feedClass;
  }

  const ifnMatch = IFN_CLASS_RE.exec(ingredient.source);
  if (ifnMatch?.[1]) {
    const parsed = Number(ifnMatch[1]);
    if (parsed >= 1 && parsed <= 8) {
      return parsed as FeedClassCode;
    }
  }

  const fullName = `${ingredient.name} ${ingredient.nameEn ?? ""}`;
  if (SILAGE_RE.test(fullName)) {
    return 3;
  }

  switch (ingredient.category) {
    case "forage":
      if (ingredient.dryMatter >= 55 || DRY_ROUGHAGE_RE.test(fullName)) {
        return 1;
      }
      return 2;
    case "energy":
      return 4;
    case "protein":
      return 5;
    case "mineral":
      return 6;
    case "premix":
      return 7;
    case "additive":
    case "enzyme":
      return VITAMIN_RE.test(fullName) ? 7 : 8;
  }
}

export function feedClassToCategory(code: FeedClassCode): IngredientCategory {
  return FEED_CLASS_MAP.get(code)?.defaultCategory ?? "energy";
}

export function getFeedClassMeta(code: FeedClassCode): FeedClassDefinition {
  return FEED_CLASS_MAP.get(code) ?? FEED_CLASSES[3]!;
}

export function getFeedClassLabel(
  language: AppLanguage,
  code: FeedClassCode,
  options?: { readonly includeNumber?: boolean; readonly short?: boolean },
): string {
  const meta = getFeedClassMeta(code);
  const label = options?.short
    ? language === "id"
      ? meta.shortId
      : meta.shortEn
    : language === "id"
      ? meta.nameId
      : meta.nameEn;
  if (options?.includeNumber === false) {
    return label;
  }
  return language === "id" ? `Kelas ${code} · ${label}` : `Class ${code} · ${label}`;
}
