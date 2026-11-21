import type { Recipe } from "../types";
import { validateFeedJson, type ValidationResult } from "../utils/validators";

export const FEED_JSON_MIME = "application/json";
export const FEED_FILE_EXTENSION = ".feed.json";

export function sanitizeFilenameSlug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 64) || "openformu-resep";
}

export function serializeRecipeToFeedJson(recipe: Recipe, pretty = true): string {
  const payload: Recipe = {
    schemaVersion: 1,
    id: recipe.id,
    name: recipe.name,
    ingredients: recipe.ingredients,
    requirement: recipe.requirement,
    result: recipe.result,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    ...(recipe.notes ? { notes: recipe.notes } : {}),
    ...(recipe.config ? { config: recipe.config } : {}),
  };
  return JSON.stringify(payload, null, pretty ? 2 : 0);
}

export function parseFeedJson(rawText: string): ValidationResult<Recipe> {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { ok: false, errors: ["Berkas .feed.json kosong."] };
  }
  const normalized = rawText.replace(/^\uFEFF/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    return {
      ok: false,
      errors: ["Format JSON tidak valid. Pastikan berkas berasal dari ekspor .feed.json."],
    };
  }
  return validateFeedJson(parsed);
}
