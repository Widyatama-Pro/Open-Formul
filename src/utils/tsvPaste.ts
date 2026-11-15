import type { Ingredient } from "../types";
import { parseLocaleDecimal } from "./locale-number";

export type PasteColumnKey = "price" | "dm" | "min" | "max" | (string & {});

export interface TsvGridPasteInput {
  readonly clipboardText: string;
  readonly activeIngredients: readonly Ingredient[];
  readonly allIngredients: readonly Ingredient[];
  readonly orderedCols: readonly PasteColumnKey[];
  readonly startRowIdx: number;
  readonly startColKey: PasteColumnKey;
}

export interface TsvGridPasteResult {
  readonly isGrid: boolean;
  readonly ingredients: readonly Ingredient[];
  readonly appliedCells: number;
  readonly skippedCells: number;
  readonly warnings: readonly string[];
}

export function applyTsvGridPaste(input: TsvGridPasteInput): TsvGridPasteResult {
  const rawText = input.clipboardText;
  const hasTab = rawText.includes("\t");
  const normalizedLines = rawText.replace(/\r\n|\r/g, "\n").split("\n");
  while (normalizedLines.length > 1 && normalizedLines[normalizedLines.length - 1]?.trim() === "") {
    normalizedLines.pop();
  }

  if (!hasTab && normalizedLines.length <= 1) {
    return {
      isGrid: false,
      ingredients: input.allIngredients,
      appliedCells: 0,
      skippedCells: 0,
      warnings: [],
    };
  }

  const startColIdx = input.orderedCols.indexOf(input.startColKey);
  if (input.startRowIdx < 0 || startColIdx < 0) {
    return {
      isGrid: false,
      ingredients: input.allIngredients,
      appliedCells: 0,
      skippedCells: 0,
      warnings: ["Posisi awal kolom tidak dikenali."],
    };
  }

  const updatedById = new Map<string, Ingredient>();
  const activeCopy = [...input.activeIngredients];
  let appliedCells = 0;
  let skippedCells = 0;
  let overflowCount = 0;

  normalizedLines.forEach((line, rOffset) => {
    const targetRowIdx = input.startRowIdx + rOffset;
    const cols = line.split("\t");

    if (targetRowIdx >= activeCopy.length) {
      overflowCount += cols.length;
      return;
    }

    let rowIng = updatedById.get(activeCopy[targetRowIdx]!.id) ?? activeCopy[targetRowIdx]!;

    cols.forEach((rawCell, cOffset) => {
      const targetColIdx = startColIdx + cOffset;
      if (targetColIdx >= input.orderedCols.length) {
        overflowCount += 1;
        return;
      }
      const colKey = input.orderedCols[targetColIdx]!;
      const cell = rawCell.trim();

      if (colKey === "price") {
        const cleaned = cell.replace(/rp/gi, "").trim();
        const parsed = parseLocaleDecimal(cleaned, { treatSingleThousandDot: true });
        if (parsed === null || parsed < 0) {
          skippedCells += 1;
          return;
        }
        const rounded = Math.round(parsed);
        if (rounded === rowIng.pricePerKg) {
          const { priceOverride: _removed, ...rest } = rowIng;
          void _removed;
          rowIng = rest;
        } else {
          rowIng = { ...rowIng, priceOverride: rounded };
        }
        appliedCells += 1;
        return;
      }

      if (colKey === "dm") {
        const parsed = parseLocaleDecimal(cell, { treatSingleThousandDot: false });
        if (parsed === null || parsed <= 0 || parsed > 100) {
          skippedCells += 1;
          return;
        }
        rowIng = { ...rowIng, dryMatter: parsed };
        appliedCells += 1;
        return;
      }

      if (colKey === "min" || colKey === "max") {
        if (cell === "" || cell === "-") {
          const prevMin = rowIng.inclusion?.min;
          const prevMax = rowIng.inclusion?.max;
          const nextMin = colKey === "min" ? undefined : prevMin;
          const nextMax = colKey === "max" ? undefined : prevMax;
          rowIng = {
            ...rowIng,
            inclusion: {
              ...(nextMin !== undefined ? { min: nextMin } : {}),
              ...(nextMax !== undefined ? { max: nextMax } : {}),
            },
          };
          appliedCells += 1;
          return;
        }
        const parsed = parseLocaleDecimal(cell, { treatSingleThousandDot: false });
        if (parsed === null || parsed < 0 || parsed > 100) {
          skippedCells += 1;
          return;
        }
        const prevMin = rowIng.inclusion?.min;
        const prevMax = rowIng.inclusion?.max;
        const nextMin = colKey === "min" ? parsed : prevMin;
        const nextMax = colKey === "max" ? parsed : prevMax;
        if (nextMin !== undefined && nextMax !== undefined && nextMin > nextMax) {
          skippedCells += 1;
          return;
        }
        rowIng = {
          ...rowIng,
          inclusion: {
            ...(nextMin !== undefined ? { min: nextMin } : {}),
            ...(nextMax !== undefined ? { max: nextMax } : {}),
          },
        };
        appliedCells += 1;
        return;
      }

      // Kolom nutrien dinamis
      if (cell === "" || /^(n\/a|na|null|-)$/i.test(cell)) {
        rowIng = {
          ...rowIng,
          nutrients: { ...rowIng.nutrients, [colKey]: null },
        };
        appliedCells += 1;
        return;
      }

      const parsed = parseLocaleDecimal(cell, { treatSingleThousandDot: false });
      if (parsed === null || parsed < 0) {
        skippedCells += 1;
        return;
      }
      rowIng = {
        ...rowIng,
        nutrients: { ...rowIng.nutrients, [colKey]: parsed },
      };
      appliedCells += 1;
    });

    updatedById.set(rowIng.id, rowIng);
  });

  const nextAll = input.allIngredients.map((item) => updatedById.get(item.id) ?? item);
  const warnings: string[] = [];
  if (skippedCells > 0) {
    warnings.push(`${skippedCells} sel dilewati karena format angka atau rentang tidak valid.`);
  }
  if (overflowCount > 0) {
    warnings.push(`${overflowCount} sel berada di luar batas tabel aktif dan diabaikan.`);
  }

  return {
    isGrid: true,
    ingredients: nextAll,
    appliedCells,
    skippedCells,
    warnings,
  };
}
