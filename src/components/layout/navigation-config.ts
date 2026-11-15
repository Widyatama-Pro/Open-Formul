import type { AppRoute } from "../../hooks/use-prototype-store";
import type { AppLanguage } from "../../types";

export interface NavItemConfig {
  readonly id: AppRoute;
  readonly labelId: string;
  readonly labelEn: string;
  readonly shortId: string;
  readonly shortEn: string;
}

export const NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: "formulation",
    labelId: "Formulasi Ransum",
    labelEn: "Ration Formulation",
    shortId: "Formulasi",
    shortEn: "Formulate",
  },
  {
    id: "ingredients",
    labelId: "Database Bahan",
    labelEn: "Ingredient DB",
    shortId: "Bahan",
    shortEn: "Feeds",
  },
  {
    id: "requirements",
    labelId: "Profil Kebutuhan Ternak",
    labelEn: "Livestock Profiles",
    shortId: "Ternak",
    shortEn: "Targets",
  },
  {
    id: "recipes",
    labelId: "Resep & Ekspor",
    labelEn: "Recipes & Export",
    shortId: "Resep",
    shortEn: "Recipes",
  },
  {
    id: "advanced",
    labelId: "Modul Lanjutan",
    labelEn: "Advanced Modules",
    shortId: "Lanjutan",
    shortEn: "Pro Lab",
  },
  {
    id: "settings",
    labelId: "Pengaturan",
    labelEn: "Settings",
    shortId: "Setelan",
    shortEn: "Settings",
  },
];

export function getNavLabel(item: NavItemConfig, lang: AppLanguage, short = false): string {
  if (short) {
    return lang === "id" ? item.shortId : item.shortEn;
  }
  return lang === "id" ? item.labelId : item.labelEn;
}
