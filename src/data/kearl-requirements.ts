import type { Requirement } from "../types";

/**
 * Standar kebutuhan nutrien ruminansia tropis bersumber dari:
 * Leonard C. Kearl (1982), "Nutrient Requirements of Ruminants in Developing Countries",
 * International Feedstuffs Institute, Utah State University (DigitalCommons@USU ETD 4183).
 *
 * Setiap nilai konsentrasi % BK pada constraints diturunkan langsung dari kebutuhan harian
 * Kearl (1982) dibagi konsumsi Bahan Kering (BK kg/hari), dengan angka mentah dicantumkan pada `source`.
 */
export const KEARL_REQUIREMENTS: readonly Requirement[] = [
  {
    id: "kearl-beef-200-075",
    name: "Sapi Potong Pertumbuhan 200 kg (Kearl 1982)",
    nameEn: "Growing Beef Cattle 200 kg · 0.75 kg ADG (Kearl 1982)",
    species: "cattle_beef",
    phase: "BB 200 kg · PBBH 0,75 kg/hr",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 11.5, idealTarget: 12.0, enabled: true },
      { nutrientId: "tdn", min: 59.3, idealTarget: 62.0, enabled: true },
      { nutrientId: "ca", min: 0.39, max: 0.85, idealTarget: 0.45, enabled: true },
      { nutrientId: "p", min: 0.28, max: 0.6, idealTarget: 0.32, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.5,
      },
    ],
    source:
      "Kearl (1982) Growing Cattle, USU ETD 4183 — BB 200 kg, PBBH 0,75 kg/hr (BK 5,40 kg; TDN 3,20 kg = 59,3% BK; PK 622 g = 11,5% BK; Ca 21 g = 0,39% BK; P 15 g = 0,28% BK)",
  },
  {
    id: "kearl-beef-300-100",
    name: "Sapi Potong Penggemukan 300 kg (Kearl 1982)",
    nameEn: "Finishing Beef Cattle 300 kg · 1.00 kg ADG (Kearl 1982)",
    species: "cattle_beef",
    phase: "BB 300 kg · PBBH 1,00 kg/hr",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 10.9, idealTarget: 11.5, enabled: true },
      { nutrientId: "tdn", min: 66.7, idealTarget: 68.5, enabled: true },
      { nutrientId: "ca", min: 0.37, max: 0.85, idealTarget: 0.42, enabled: true },
      { nutrientId: "p", min: 0.28, max: 0.6, idealTarget: 0.32, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.5,
      },
    ],
    source:
      "Kearl (1982) Growing/Finishing Cattle, USU ETD 4183 — BB 300 kg, PBBH 1,00 kg/hr (BK 7,50 kg; TDN 5,00 kg = 66,7% BK; PK 819 g = 10,9% BK; Ca 28 g = 0,37% BK; P 21 g = 0,28% BK)",
  },
  {
    id: "kearl-beef-400-075",
    name: "Sapi Potong Finisher 400 kg (Kearl 1982)",
    nameEn: "Finishing Beef Cattle 400 kg · 0.75 kg ADG (Kearl 1982)",
    species: "cattle_beef",
    phase: "BB 400 kg · PBBH 0,75 kg/hr",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 9.7, idealTarget: 10.5, enabled: true },
      { nutrientId: "tdn", min: 57.8, idealTarget: 61.0, enabled: true },
      { nutrientId: "ca", min: 0.3, max: 0.8, idealTarget: 0.36, enabled: true },
      { nutrientId: "p", min: 0.22, max: 0.55, idealTarget: 0.26, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.5,
      },
    ],
    source:
      "Kearl (1982) Growing Cattle, USU ETD 4183 — BB 400 kg, PBBH 0,75 kg/hr (BK 8,30 kg; TDN 4,80 kg = 57,8% BK; PK 806 g = 9,7% BK; Ca 25 g = 0,30% BK; P 18 g = 0,22% BK)",
  },
  {
    id: "kearl-dairy-400-10l",
    name: "Sapi Perah Laktasi 400 kg · 10 L Susu (Kearl 1982)",
    nameEn: "Lactating Dairy Cow 400 kg · 10 kg Milk 4% FCM (Kearl 1982)",
    species: "cattle_dairy",
    phase: "Laktasi 10 L (Lemak 4%)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 12.4, idealTarget: 13.5, enabled: true },
      { nutrientId: "tdn", min: 64.1, idealTarget: 67.0, enabled: true },
      { nutrientId: "ca", min: 0.42, max: 0.95, idealTarget: 0.5, enabled: true },
      { nutrientId: "p", min: 0.31, max: 0.65, idealTarget: 0.36, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.5,
      },
    ],
    source:
      "Kearl (1982) Dairy Cattle, USU ETD 4183 — Induk 400 kg (hidup pokok: TDN 3,15 kg; PK 373 g; Ca 15 g; P 13 g) + 10 kg susu 4% FCM (+0,326 kg TDN; +87 g PK; +2,7 g Ca; +1,8 g P/kg susu; total BK 10,0 kg)",
  },
  {
    id: "kearl-sheep-25-100",
    name: "Domba Penggemukan 25 kg (Kearl 1982)",
    nameEn: "Growing Sheep 25 kg · 100 g/d ADG (Kearl 1982)",
    species: "sheep",
    phase: "BB 25 kg · PBBH 100 g/hr",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 10.2, idealTarget: 11.5, enabled: true },
      { nutrientId: "tdn", min: 66.3, idealTarget: 68.0, enabled: true },
      { nutrientId: "ca", min: 0.51, max: 1.0, idealTarget: 0.55, enabled: true },
      { nutrientId: "p", min: 0.34, max: 0.7, idealTarget: 0.38, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.5,
      },
    ],
    source:
      "Kearl (1982) Growing Sheep, USU ETD 4183 — BB 25 kg, PBBH 100 g/hr (BK 0,83 kg; TDN 0,55 kg = 66,3% BK; PK 85 g = 10,2% BK; Ca 4,2 g = 0,51% BK; P 2,8 g = 0,34% BK)",
  },
  {
    id: "kearl-goat-20-075",
    name: "Kambing Pertumbuhan 20 kg (Kearl 1982)",
    nameEn: "Growing Goats 20 kg · 75 g/d ADG (Kearl 1982)",
    species: "goat",
    phase: "BB 20 kg · PBBH 75 g/hr",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 10.2, idealTarget: 11.0, enabled: true },
      { nutrientId: "tdn", min: 66.1, idealTarget: 68.0, enabled: true },
      { nutrientId: "ca", min: 0.39, max: 0.9, idealTarget: 0.45, enabled: true },
      { nutrientId: "p", min: 0.31, max: 0.65, idealTarget: 0.35, enabled: true },
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
    source:
      "Kearl (1982) Growing Goats, USU ETD 4183 — BB 20 kg, PBBH 75 g/hr (BK 0,62 kg; TDN 0,41 kg = 66,1% BK; PK 63 g [DP 43 g] = 10,2% BK; Ca 2,4 g = 0,39% BK; P 1,9 g = 0,31% BK)",
  },
];
