import { MOCK_NUTRIENTS } from "../data/mock-state";
import type { Basis, Ingredient, IngredientCategory } from "../types";
import { parseLocaleDecimal } from "./locale-number";
import { sanitizeText } from "./validators";

export interface CsvImportRowError {
  readonly row: number;
  readonly message: string;
}

export interface CsvIngredientImportResult {
  readonly ingredients: readonly Ingredient[];
  readonly updatedCount: number;
  readonly addedCount: number;
  readonly errors: readonly CsvImportRowError[];
  readonly warnings: readonly string[];
}

const KNOWN_NUTRIENT_IDS = new Set<string>(MOCK_NUTRIENTS.map((n) => n.id));

const HEADER_ALIASES: Record<string, string> = {
  id: "id",
  kode: "id",
  nama: "name",
  name: "name",
  namabahan: "name",
  namaen: "nameEn",
  nameen: "nameEn",
  englishname: "nameEn",
  kategori: "category",
  category: "category",
  harga: "pricePerKg",
  hargakg: "pricePerKg",
  hargaperkg: "pricePerKg",
  hargarpkg: "pricePerKg",
  price: "pricePerKg",
  pricekg: "pricePerKg",
  priceperkg: "pricePerKg",
  bk: "dryMatter",
  dm: "dryMatter",
  drymatter: "dryMatter",
  bahankering: "dryMatter",
  basis: "basis",
  aktif: "isActive",
  isactive: "isActive",
  min: "inclusionMin",
  mininklusi: "inclusionMin",
  inclusionmin: "inclusionMin",
  max: "inclusionMax",
  maks: "inclusionMax",
  maxinklusi: "inclusionMax",
  inclusionmax: "inclusionMax",
  sumber: "source",
  source: "source",
  pk: "nutrient:cp",
  cp: "nutrient:cp",
  proteinkasar: "nutrient:cp",
  crudeprotein: "nutrient:cp",
  me: "nutrient:me_poultry",
  mepoultry: "nutrient:me_poultry",
  em: "nutrient:me_poultry",
  emunggas: "nutrient:me_poultry",
  tdn: "nutrient:tdn",
  lk: "nutrient:ee",
  ee: "nutrient:ee",
  lemakkasar: "nutrient:ee",
  sk: "nutrient:cf",
  cf: "nutrient:cf",
  seratkasar: "nutrient:cf",
  ca: "nutrient:ca",
  kalsium: "nutrient:ca",
  p: "nutrient:p",
  fosfor: "nutrient:p",
  lys: "nutrient:lys",
  lisin: "nutrient:lys",
  met: "nutrient:met",
  metionin: "nutrient:met",
  metcys: "nutrient:metcys",
  thr: "nutrient:thr",
  treonin: "nutrient:thr",
  trp: "nutrient:trp",
  triptofan: "nutrient:trp",
  val: "nutrient:val",
  valin: "nutrient:val",
  sidlys: "nutrient:sid_lys",
  avp: "nutrient:avp",
  ndf: "nutrient:ndf",
  adf: "nutrient:adf",
  starch: "nutrient:starch",
  pati: "nutrient:starch",
  tannin: "nutrient:tannin",
  tanin: "nutrient:tannin",
  liquidfat: "nutrient:liquid_fat",
  lemakcair: "nutrient:liquid_fat",
};

function normalizeHeaderKey(rawHeader: string): string {
  const withoutUnits = rawHeader
    .replace(/\([^)]*\)/g, " ")
    .trim()
    .toLowerCase();
  if (KNOWN_NUTRIENT_IDS.has(withoutUnits)) {
    return `nutrient:${withoutUnits}`;
  }
  const compact = withoutUnits.replace(/[^a-z0-9]/g, "");
  return (
    HEADER_ALIASES[compact] ?? (KNOWN_NUTRIENT_IDS.has(compact) ? `nutrient:${compact}` : compact)
  );
}

function detectDelimiter(headerLine: string): "," | ";" {
  let commaCount = 0;
  let semiCount = 0;
  let inQuote = false;
  for (let i = 0; i < headerLine.length; i += 1) {
    const ch = headerLine[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (!inQuote) {
      if (ch === ",") commaCount += 1;
      else if (ch === ";") semiCount += 1;
    }
  }
  return semiCount > commaCount ? ";" : ",";
}

export function parseCsvRows(csvText: string): { headers: string[]; rows: string[][] } {
  const clean = csvText.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r\n|\n|\r/);
  const firstNonEmpty = lines.find((l) => l.trim().length > 0);
  if (!firstNonEmpty) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(firstNonEmpty);
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (inQuote) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            inQuote = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuote = true;
      } else if (ch === delimiter) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  const headerCells = parseLine(nonEmptyLines[0] ?? "");
  const dataRows = nonEmptyLines.slice(1).map(parseLine);
  return { headers: headerCells, rows: dataRows };
}

function parseCategoryValue(raw: string): IngredientCategory | null {
  const v = raw.trim().toLowerCase();
  const map: Record<string, IngredientCategory> = {
    energy: "energy",
    energi: "energy",
    protein: "protein",
    mineral: "mineral",
    premix: "premix",
    forage: "forage",
    hijauan: "forage",
    additive: "additive",
    aditif: "additive",
    enzyme: "enzyme",
    enzim: "enzyme",
  };
  return map[v] ?? null;
}

function parseBasisValue(raw: string): Basis | null {
  const v = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (v === "asfed" || v === "af") return "as_fed";
  if (v === "drymatter" || v === "dm" || v === "bk") return "dry_matter";
  return null;
}

function parseBoolFlag(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (["true", "1", "ya", "yes", "aktif"].includes(v)) return true;
  if (["false", "0", "tidak", "no", "nonaktif"].includes(v)) return false;
  return null;
}

function makeSlugId(name: string, existingIds: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "bahan-csv";
  let candidate = base;
  let seq = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${seq}`;
    seq += 1;
  }
  return candidate;
}

export function parseAndMergeIngredientsCsv(
  csvText: string,
  existingIngredients: readonly Ingredient[],
): CsvIngredientImportResult {
  const { headers, rows } = parseCsvRows(csvText);
  if (headers.length === 0 || rows.length === 0) {
    return {
      ingredients: existingIngredients,
      updatedCount: 0,
      addedCount: 0,
      errors: [{ row: 1, message: "Berkas CSV kosong atau hanya berisi header." }],
      warnings: [],
    };
  }

  const colKeys = headers.map(normalizeHeaderKey);
  const working = [...existingIngredients];
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  const allIds = new Set<string>();

  working.forEach((item, idx) => {
    byId.set(item.id.toLowerCase(), idx);
    byName.set(item.name.trim().toLowerCase(), idx);
    allIds.add(item.id);
  });

  const errors: CsvImportRowError[] = [];
  const warnings: string[] = [];
  let updatedCount = 0;
  let addedCount = 0;

  rows.forEach((cells, rIdx) => {
    const rowNumber = rIdx + 2;
    const rawMap = new Map<string, string>();
    colKeys.forEach((key, cIdx) => {
      if (!key) return;
      const cell = cells[cIdx];
      if (cell !== undefined) {
        rawMap.set(key, cell.trim());
      }
    });

    const idCell = sanitizeText(rawMap.get("id") ?? "", { maxLength: 100 });
    const nameCell = sanitizeText(rawMap.get("name") ?? "", { maxLength: 160 });

    let matchedIdx = idCell ? byId.get(idCell.toLowerCase()) : undefined;
    if (matchedIdx === undefined && nameCell) {
      matchedIdx = byName.get(nameCell.toLowerCase());
    }

    if (matchedIdx !== undefined) {
      // Partial merge pada bahan eksisting: hanya kolom yang diisi yang menimpa nilai lama
      const base = working[matchedIdx]!;
      const nextNutrients: Record<string, number | null> = { ...base.nutrients };
      let rowHasError = false;

      let nextName = base.name;
      if (nameCell) nextName = nameCell;

      const nameEnCell = sanitizeText(rawMap.get("nameEn") ?? "", { maxLength: 160 });
      const nextNameEn = nameEnCell || base.nameEn;

      let nextCategory = base.category;
      const catRaw = rawMap.get("category");
      if (catRaw) {
        const parsedCat = parseCategoryValue(catRaw);
        if (!parsedCat) {
          errors.push({ row: rowNumber, message: `Kategori '${catRaw}' tidak dikenali.` });
          rowHasError = true;
        } else {
          nextCategory = parsedCat;
        }
      }

      let nextPrice = base.pricePerKg;
      const priceRaw = rawMap.get("pricePerKg");
      if (priceRaw) {
        const cleanedPrice = priceRaw.replace(/rp/gi, "").trim();
        const parsedPrice = parseLocaleDecimal(cleanedPrice, { treatSingleThousandDot: true });
        if (parsedPrice === null || parsedPrice < 0) {
          errors.push({ row: rowNumber, message: `Harga '${priceRaw}' tidak valid.` });
          rowHasError = true;
        } else {
          nextPrice = Math.round(parsedPrice);
        }
      }

      let nextDm = base.dryMatter;
      const dmRaw = rawMap.get("dryMatter");
      if (dmRaw) {
        const parsedDm = parseLocaleDecimal(dmRaw, { treatSingleThousandDot: false });
        if (parsedDm === null || parsedDm <= 0 || parsedDm > 100) {
          errors.push({
            row: rowNumber,
            message: `Bahan Kering '${dmRaw}' harus pada rentang (0–100].`,
          });
          rowHasError = true;
        } else {
          nextDm = parsedDm;
        }
      }

      let nextBasis = base.basis;
      const basisRaw = rawMap.get("basis");
      if (basisRaw) {
        const parsedBasis = parseBasisValue(basisRaw);
        if (!parsedBasis) {
          errors.push({ row: rowNumber, message: `Basis '${basisRaw}' harus As-Fed atau BK/DM.` });
          rowHasError = true;
        } else {
          nextBasis = parsedBasis;
        }
      }

      let nextActive = base.isActive;
      const activeRaw = rawMap.get("isActive");
      if (activeRaw) {
        const parsedBool = parseBoolFlag(activeRaw);
        if (parsedBool !== null) nextActive = parsedBool;
      }

      let minInc = base.inclusion?.min;
      let maxInc = base.inclusion?.max;
      const minRaw = rawMap.get("inclusionMin");
      if (minRaw) {
        const parsedMin = parseLocaleDecimal(minRaw, { treatSingleThousandDot: false });
        if (parsedMin === null || parsedMin < 0 || parsedMin > 100) {
          errors.push({ row: rowNumber, message: `Batas Min '${minRaw}' harus 0–100.` });
          rowHasError = true;
        } else {
          minInc = parsedMin;
        }
      }
      const maxRaw = rawMap.get("inclusionMax");
      if (maxRaw) {
        const parsedMax = parseLocaleDecimal(maxRaw, { treatSingleThousandDot: false });
        if (parsedMax === null || parsedMax < 0 || parsedMax > 100) {
          errors.push({ row: rowNumber, message: `Batas Max '${maxRaw}' harus 0–100.` });
          rowHasError = true;
        } else {
          maxInc = parsedMax;
        }
      }
      if (minInc !== undefined && maxInc !== undefined && minInc > maxInc) {
        errors.push({ row: rowNumber, message: `Min (${minInc}%) melebihi Max (${maxInc}%).` });
        rowHasError = true;
      }

      for (const [colKey, val] of rawMap.entries()) {
        if (!colKey.startsWith("nutrient:") || val === "" || val === "-") continue;
        const nutrientId = colKey.slice("nutrient:".length);
        if (/^(n\/a|na|null)$/i.test(val)) {
          nextNutrients[nutrientId] = null;
          continue;
        }
        const parsedVal = parseLocaleDecimal(val, { treatSingleThousandDot: false });
        if (parsedVal === null || parsedVal < 0) {
          errors.push({ row: rowNumber, message: `Nilai ${nutrientId} '${val}' tidak valid.` });
          rowHasError = true;
        } else {
          nextNutrients[nutrientId] = parsedVal;
        }
      }

      if (rowHasError) return;

      const sourceRaw = sanitizeText(rawMap.get("source") ?? "", { maxLength: 400 });
      const { priceOverride: _discardOverride, ...baseWithoutOverride } = base;
      void _discardOverride;

      const merged: Ingredient = {
        ...baseWithoutOverride,
        name: nextName,
        category: nextCategory,
        pricePerKg: nextPrice,
        dryMatter: nextDm,
        basis: nextBasis,
        nutrients: nextNutrients,
        source: sourceRaw || base.source,
        ...(nextNameEn ? { nameEn: nextNameEn } : {}),
        ...(nextActive !== undefined ? { isActive: nextActive } : {}),
        ...(minInc !== undefined || maxInc !== undefined
          ? {
              inclusion: {
                ...(minInc !== undefined ? { min: minInc } : {}),
                ...(maxInc !== undefined ? { max: maxInc } : {}),
              },
            }
          : {}),
      };

      working[matchedIdx] = merged;
      byName.set(merged.name.trim().toLowerCase(), matchedIdx);
      updatedCount += 1;
      return;
    }

    // Bahan baru: nama wajib ada
    if (!nameCell) {
      errors.push({ row: rowNumber, message: "Baris bahan baru wajib mengisi kolom nama." });
      return;
    }

    let rowHasError = false;
    const categoryRaw = rawMap.get("category");
    const category = categoryRaw ? parseCategoryValue(categoryRaw) : "energy";
    if (!category) {
      errors.push({ row: rowNumber, message: `Kategori '${categoryRaw ?? ""}' tidak dikenali.` });
      rowHasError = true;
    }

    let pricePerKg = 0;
    const priceRaw = rawMap.get("pricePerKg");
    if (priceRaw) {
      const parsedPrice = parseLocaleDecimal(priceRaw.replace(/rp/gi, "").trim(), {
        treatSingleThousandDot: true,
      });
      if (parsedPrice === null || parsedPrice < 0) {
        errors.push({ row: rowNumber, message: `Harga '${priceRaw}' tidak valid.` });
        rowHasError = true;
      } else {
        pricePerKg = Math.round(parsedPrice);
      }
    }

    let dryMatter = 88;
    const dmRaw = rawMap.get("dryMatter");
    if (dmRaw) {
      const parsedDm = parseLocaleDecimal(dmRaw, { treatSingleThousandDot: false });
      if (parsedDm === null || parsedDm <= 0 || parsedDm > 100) {
        errors.push({ row: rowNumber, message: `BK '${dmRaw}' harus pada rentang (0–100].` });
        rowHasError = true;
      } else {
        dryMatter = parsedDm;
      }
    }

    const basisRaw = rawMap.get("basis");
    const basis = basisRaw ? parseBasisValue(basisRaw) : "as_fed";
    if (!basis) {
      errors.push({ row: rowNumber, message: `Basis '${basisRaw ?? ""}' harus As-Fed atau BK.` });
      rowHasError = true;
    }

    const nutrients: Record<string, number | null> = {};
    for (const id of KNOWN_NUTRIENT_IDS) {
      nutrients[id] = null;
    }

    for (const [colKey, val] of rawMap.entries()) {
      if (!colKey.startsWith("nutrient:") || val === "" || val === "-") continue;
      const nutrientId = colKey.slice("nutrient:".length);
      if (/^(n\/a|na|null)$/i.test(val)) {
        nutrients[nutrientId] = null;
        continue;
      }
      const parsedVal = parseLocaleDecimal(val, { treatSingleThousandDot: false });
      if (parsedVal === null || parsedVal < 0) {
        errors.push({ row: rowNumber, message: `Nilai ${nutrientId} '${val}' tidak valid.` });
        rowHasError = true;
      } else {
        nutrients[nutrientId] = parsedVal;
      }
    }

    let minInc = 0;
    let maxInc = 100;
    const minRaw = rawMap.get("inclusionMin");
    if (minRaw) {
      const parsed = parseLocaleDecimal(minRaw, { treatSingleThousandDot: false });
      if (parsed === null || parsed < 0 || parsed > 100) {
        errors.push({ row: rowNumber, message: `Min inklusi '${minRaw}' tidak valid.` });
        rowHasError = true;
      } else minInc = parsed;
    }
    const maxRaw = rawMap.get("inclusionMax");
    if (maxRaw) {
      const parsed = parseLocaleDecimal(maxRaw, { treatSingleThousandDot: false });
      if (parsed === null || parsed < 0 || parsed > 100) {
        errors.push({ row: rowNumber, message: `Max inklusi '${maxRaw}' tidak valid.` });
        rowHasError = true;
      } else maxInc = parsed;
    }
    if (minInc > maxInc) {
      errors.push({ row: rowNumber, message: `Min (${minInc}%) melebihi Max (${maxInc}%).` });
      rowHasError = true;
    }

    if (rowHasError || !category || !basis) return;

    const newId = idCell && !allIds.has(idCell) ? idCell : makeSlugId(nameCell, allIds);
    allIds.add(newId);
    const activeParsed = rawMap.get("isActive") ? parseBoolFlag(rawMap.get("isActive")!) : true;
    const nameEnCell = sanitizeText(rawMap.get("nameEn") ?? "", { maxLength: 160 });
    const sourceCell =
      sanitizeText(rawMap.get("source") ?? "", { maxLength: 400 }) || "Impor CSV Pengguna";

    const added: Ingredient = {
      id: newId,
      name: nameCell,
      category,
      pricePerKg,
      dryMatter,
      basis,
      isActive: activeParsed ?? true,
      inclusion: { min: minInc, max: maxInc },
      nutrients,
      source: sourceCell,
      ...(nameEnCell ? { nameEn: nameEnCell } : {}),
    };

    const nextIdx = working.length;
    working.push(added);
    byId.set(newId.toLowerCase(), nextIdx);
    byName.set(nameCell.toLowerCase(), nextIdx);
    addedCount += 1;
  });

  if (errors.length > 0 && updatedCount + addedCount > 0) {
    warnings.push(`${errors.length} baris dilewati karena nilai tidak valid.`);
  }

  return {
    ingredients: working,
    updatedCount,
    addedCount,
    errors,
    warnings,
  };
}
