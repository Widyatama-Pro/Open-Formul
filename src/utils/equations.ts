/**
 * Persamaan nutrisi turunan murni (dEB/DCAD & regresi energi dasar Unggas/Babi).
 * Mengacu pada spesifikasi F-22 di prd.md dan analisis literatur WPSA / Noblet.
 */

export interface ElectrolyteMineralsMgPerKg {
  readonly na?: number | undefined;
  readonly k?: number | undefined;
  readonly cl?: number | undefined;
  readonly s?: number | undefined;
}

export interface ElectrolyteBalanceResult {
  readonly deb: number;
  readonly dcad: number;
}

export interface PoultryWpsaProximateGPerKg {
  readonly cp: number;
  readonly cfat: number;
  readonly sugar: number;
  readonly starch: number;
}

export interface PoultryWpsaProximatePct {
  readonly cp: number;
  readonly cfat: number;
  readonly sugar: number;
  readonly starch: number;
}

/**
 * Menghitung Dietary Electrolyte Balance (dEB) dan Dietary Cation-Anion Difference (DCAD)
 * dalam satuan mEq/kg dari konsentrasi mineral dalam mg/kg.
 */
export function computeElectrolyteBalance(
  mineralsMgPerKg: ElectrolyteMineralsMgPerKg,
): ElectrolyteBalanceResult {
  const na = mineralsMgPerKg.na ?? 0;
  const k = mineralsMgPerKg.k ?? 0;
  const cl = mineralsMgPerKg.cl ?? 0;
  const s = mineralsMgPerKg.s ?? 0;

  const deb = na / 23.0 + k / 39.1 - cl / 35.5;
  const dcad = deb - (2 * s) / 32.1;

  return { deb, dcad };
}

/** Nutrien turunan (dihitung dari nutrien lain), bukan nilai lab tersimpan. */
export const DERIVED_NUTRIENT_IDS: ReadonlySet<string> = new Set(["deb", "dcad"]);

export function isDerivedNutrient(nutrientId: string): boolean {
  return DERIVED_NUTRIENT_IDS.has(nutrientId);
}

/**
 * Nilai nutrien efektif sebuah bahan, termasuk nutrien turunan dEB/DCAD yang dihitung
 * dari Na/K/Cl/S (mg/kg). Mengembalikan `null` bila data sumber tidak tersedia.
 */
export function resolveNutrientValue(
  ingredient: { readonly nutrients: Readonly<Record<string, number | null>> },
  nutrientId: string,
): number | null {
  if (!isDerivedNutrient(nutrientId)) {
    return ingredient.nutrients[nutrientId] ?? null;
  }

  const pick = (id: string): number | null => {
    const raw = ingredient.nutrients[id];
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  };
  const na = pick("na");
  const k = pick("k");
  const cl = pick("cl");
  const s = pick("s");
  // Tanpa satu pun mineral elektrolit, turunan tidak terdefinisi (bukan 0 semu).
  if (na === null && k === null && cl === null && s === null) return null;

  const balance = computeElectrolyteBalance({
    ...(na !== null ? { na } : {}),
    ...(k !== null ? { k } : {}),
    ...(cl !== null ? { cl } : {}),
    ...(s !== null ? { s } : {}),
  });
  return nutrientId === "deb" ? balance.deb : balance.dcad;
}

/**
 * Persamaan WPSA (1986/1989) untuk Energi Metabolis (ME) unggas dalam MJ/kg.
 * Input proksimat dinyatakan dalam g/kg; output dijepit di >= 0 MJ/kg.
 */
export function computePoultryMeWpsaMjPerKg(proximate: PoultryWpsaProximateGPerKg): number {
  const mj =
    (15.51 * proximate.cp +
      34.31 * proximate.cfat +
      13.01 * proximate.sugar +
      16.69 * proximate.starch) /
    1000;
  return Math.max(0, mj);
}

/** Konversi langsung persamaan WPSA dari input proksimat (%) menjadi kcal/kg. */
export function computePoultryMeFromProximatePct(proximatePct: PoultryWpsaProximatePct): number {
  const mjPerKg = computePoultryMeWpsaMjPerKg({
    cp: proximatePct.cp * 10,
    cfat: proximatePct.cfat * 10,
    sugar: proximatePct.sugar * 10,
    starch: proximatePct.starch * 10,
  });
  return (mjPerKg * 1000) / 4.184;
}

/**
 * Persamaan Noblet/INRA untuk estimasi Lemak Tercerna babi (DEE, %),
 * dengan penahan batas bawah >= 0% pada bahan rendah lemak tinggi serat.
 */
export function computeSwineDigestibleFat(eePct: number, ndfPct: number): number {
  return Math.max(0, 0.82 * eePct - 0.02 * ndfPct - 0.7);
}

/**
 * Estimasi Protein Tercerna (DP, %) pada hijauan/silase ruminansia dari Protein Kasar (% BK),
 * merujuk Tabel 10 Kelas 3 (Silase Sapi/Domba/Kambing/Kuda) Knight & Harris (1966) dalam Hartadi et al. (1980, hlm. 27):
 * `Y = 0.908 * CP% - 3.77`, dengan batas bawah 0%.
 */
export function computeRuminantRoughageDigestibleProtein(cpPct: number): number {
  return Math.max(0, 0.908 * cpPct - 3.77);
}

/**
 * Konversi TDN (% BK) menjadi Digestible Energy (DE, Mcal/kg BK) untuk sapi
 * berdasarkan Crampton et al. (1957) dan Swift (1957) dalam Hartadi et al. (1980, hlm. 24):
 * `*DE (Mcal/kg) = 0.04409 * TDN%`.
 */
export function computeCattleDigestibleEnergyFromTdn(tdnPct: number): number {
  return Math.max(0, 0.04409 * tdnPct);
}

/**
 * Konversi TDN (% BK) menjadi Digestible Energy (DE, Mcal/kg BK) untuk domba
 * berdasarkan Crampton et al. (1957) dan Swift (1957) dalam Hartadi et al. (1980, hlm. 24):
 * `*DE (Mcal/kg) = 0.04409 * TDN%`.
 */
export function computeSheepDigestibleEnergyFromTdn(tdnPct: number): number {
  return Math.max(0, 0.04409 * tdnPct);
}

/**
 * Konversi DE (Mcal/kg BK) menjadi Metabolizable Energy (ME, Mcal/kg BK) untuk sapi dan domba:
 * - `"hartadi_regression"` (default): `*ME = -0.45 + 1.01 * DE` (Moe & Tyrrell, 1976; Hartadi et al., 1980 hlm. 24)
 * - `"garrett_082"`: `ME = 0.82 * DE` (dipakai khusus sebagai input persamaan Garrett 1977 untuk NEm & NEg)
 */
export function computeCattleMetabolizableEnergyFromDe(
  deMcalPerKg: number,
  method: "hartadi_regression" | "garrett_082" = "hartadi_regression",
): number {
  if (method === "garrett_082") {
    return Math.max(0, 0.82 * deMcalPerKg);
  }
  return Math.max(0, -0.45 + 1.01 * deMcalPerKg);
}

/**
 * Estimasi Net Energy for Maintenance (NEm, Mcal/kg BK) untuk sapi potong dari ME (Mcal/kg BK),
 * mengikuti persamaan polinomial derajat 4 Garrett (1977) dalam Hartadi et al. (1980, hlm. 25):
 * `NEm = 1.115 - 0.8971*ME + 0.6507*ME^2 - 0.1028*ME^3 + 0.005725*ME^4`.
 */
export function computeCattleNetEnergyMaintenance(meMcalPerKg: number): number {
  const me2 = meMcalPerKg * meMcalPerKg;
  const me3 = me2 * meMcalPerKg;
  const me4 = me3 * meMcalPerKg;
  return Math.max(0, 1.115 - 0.8971 * meMcalPerKg + 0.6507 * me2 - 0.1028 * me3 + 0.005725 * me4);
}

/**
 * Estimasi Net Energy for Gain (NEg, Mcal/kg BK) untuk sapi potong dari ME (Mcal/kg BK),
 * mengikuti persamaan Garrett (1977) versi teks Inggris Hartadi et al. (1980, hlm. 25):
 * `NEg = 3.178*ME - 0.8646*ME^2 + 0.1275*ME^3 - 0.006787*ME^4 - 3.325`
 * (mengoreksi salah cetak pada salinan Indonesia hlm. 20).
 */
export function computeCattleNetEnergyGain(meMcalPerKg: number): number {
  const me2 = meMcalPerKg * meMcalPerKg;
  const me3 = me2 * meMcalPerKg;
  const me4 = me3 * meMcalPerKg;
  return Math.max(0, 3.178 * meMcalPerKg - 0.8646 * me2 + 0.1275 * me3 - 0.006787 * me4 - 3.325);
}

/**
 * Menghitung paket ME (metode `0.82 * DE`), NEm, dan NEg untuk sapi potong dari nilai DE (Mcal/kg BK)
 * menggunakan rangkaian lengkap persamaan Garrett (1977) dalam Hartadi et al. (1980, hlm. 25).
 */
export function computeCattleNetEnergyGainGarrett1977(deMcalPerKg: number): {
  readonly me: number;
  readonly nem: number;
  readonly neg: number;
} {
  const me = computeCattleMetabolizableEnergyFromDe(deMcalPerKg, "garrett_082");
  return {
    me,
    nem: computeCattleNetEnergyMaintenance(me),
    neg: computeCattleNetEnergyGain(me),
  };
}

/**
 * Estimasi Net Energy for Lactation (NEl, Mcal/kg BK) untuk sapi perah dari TDN (% BK),
 * merujuk Moe & Tyrrell (1976) dalam Hartadi et al. (1980, hlm. 25 versi Inggris):
 * `*NEl (Mcal/kg) = -0.12 + 0.0245 * TDN%` (dibatasi >= 0).
 */
export function computeCattleNetEnergyLactation(tdnPct: number): number {
  return Math.max(0, -0.12 + 0.0245 * tdnPct);
}

/**
 * Estimasi Metabolizable Energy (ME, kcal/kg BK) untuk babi dari DE (kcal/kg BK) dan CP (% BK),
 * merujuk Asplund & Harris (1969) dalam Hartadi et al. (1980, hlm. 25 versi Inggris):
 * `*ME (kcal/kg) = (0.96 - 0.00202 * CP%) * DE (kcal/kg)`.
 */
export function computeSwineMetabolizableEnergyFromDe(deKcalPerKg: number, cpPct: number): number {
  return Math.max(0, (0.96 - 0.00202 * cpPct) * deKcalPerKg);
}

/**
 * Menghitung 4% Fat-Corrected Milk (FCM, kg/hari) standar NRC (1988) & Kearl (1982):
 * `FCM(4%) = 0.4 * milkKg + 0.15 * milkKg * fatPct`.
 */
export function computeFatCorrectedMilk4Pct(milkKgPerDay: number, fatPct: number): number {
  return Math.max(0, 0.4 * milkKgPerDay + 0.15 * milkKgPerDay * fatPct);
}

const NRC_DMI_WEIGHTS = [400, 500, 600, 700, 800] as const;
const NRC_DMI_FCMS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const;
const NRC_DMI_GRID: ReadonlyArray<readonly (number | null)[]> = [
  [2.7, 2.4, 2.2, 2.0, 1.9],
  [3.2, 2.8, 2.6, 2.3, 2.2],
  [3.6, 3.2, 2.9, 2.6, 2.4],
  [4.0, 3.5, 3.2, 2.9, 2.7],
  [4.4, 3.9, 3.5, 3.2, 2.9],
  [5.0, 4.2, 3.7, 3.4, 3.1],
  [5.5, 4.6, 4.0, 3.6, 3.3],
  [null, 5.0, 4.3, 3.8, 3.5],
  [null, 5.4, 4.7, 4.1, 3.7],
  [null, null, 5.0, 4.4, 4.0],
  [null, null, 5.4, 4.8, 4.3],
];

function getValidDmiForWeightCol(colIdx: number, fcmTarget: number): number {
  let maxValidRow = 0;
  for (let r = 0; r < NRC_DMI_FCMS.length; r++) {
    if (NRC_DMI_GRID[r]?.[colIdx] !== null && NRC_DMI_GRID[r]?.[colIdx] !== undefined) {
      maxValidRow = r;
    }
  }
  const minFcm = NRC_DMI_FCMS[0];
  const maxFcm = NRC_DMI_FCMS[maxValidRow] ?? 40;
  const clampedFcm = Math.min(maxFcm, Math.max(minFcm, fcmTarget));
  const step = (clampedFcm - minFcm) / 5;
  const r0 = Math.min(maxValidRow, Math.floor(step));
  const r1 = Math.min(maxValidRow, r0 + 1);
  const v0 = NRC_DMI_GRID[r0]?.[colIdx] ?? 0;
  const v1 = NRC_DMI_GRID[r1]?.[colIdx] ?? v0;
  const t = r1 === r0 ? 0 : step - r0;
  return v0 + (v1 - v0) * t;
}

/**
 * Estimasi kebutuhan Dry Matter Intake (% Bobot Badan) untuk sapi perah laktasi
 * menggunakan interpolasi bilinear pada NRC (1988) Table 6-1
 * (*Live Weight* 400–800 kg × *4% FCM* 10–60 kg/hari).
 */
export function estimateCattleDryMatterIntakePctBw(
  liveWeightKg: number,
  fcm4PctKgPerDay: number,
): number {
  const minW = NRC_DMI_WEIGHTS[0];
  const maxW = NRC_DMI_WEIGHTS[NRC_DMI_WEIGHTS.length - 1] ?? 800;
  const clampedW = Math.min(maxW, Math.max(minW, liveWeightKg));
  const wStep = (clampedW - minW) / 100;
  const c0 = Math.min(NRC_DMI_WEIGHTS.length - 1, Math.floor(wStep));
  const c1 = Math.min(NRC_DMI_WEIGHTS.length - 1, c0 + 1);
  const d0 = getValidDmiForWeightCol(c0, fcm4PctKgPerDay);
  const d1 = getValidDmiForWeightCol(c1, fcm4PctKgPerDay);
  const wt = c1 === c0 ? 0 : wStep - c0;
  return d0 + (d1 - d0) * wt;
}

const KEARL_MILK_FAT_LEVELS = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0] as const;
const KEARL_MILK_TABLE: ReadonlyArray<{
  readonly meMcal: number;
  readonly tdnKg: number;
  readonly cpG: number;
  readonly caG: number;
  readonly pG: number;
}> = [
  { meMcal: 0.93, tdnKg: 0.26, cpG: 57, caG: 2.4, pG: 1.7 },
  { meMcal: 1.0, tdnKg: 0.28, cpG: 64, caG: 2.5, pG: 1.8 },
  { meMcal: 1.07, tdnKg: 0.3, cpG: 71, caG: 2.6, pG: 1.9 },
  { meMcal: 1.14, tdnKg: 0.31, cpG: 79, caG: 2.7, pG: 2.0 },
  { meMcal: 1.21, tdnKg: 0.33, cpG: 86, caG: 2.8, pG: 2.1 },
  { meMcal: 1.28, tdnKg: 0.35, cpG: 93, caG: 2.9, pG: 2.2 },
  { meMcal: 1.35, tdnKg: 0.37, cpG: 100, caG: 3.0, pG: 2.3 },
  { meMcal: 1.42, tdnKg: 0.39, cpG: 107, caG: 3.1, pG: 2.4 },
];

/**
 * Menghitung kebutuhan nutrien harian sapi perah laktasi (ME Mcal/kg BK, TDN % BK, CP % BK,
 * Ca % BK, P % BK) dengan menjumlahkan kebutuhan hidup pokok + produksi susu berdasarkan
 * Kearl (1982) Table 15 (*Nutrient Constituents of Cattle Milk at Different Fat Levels*, hlm. 87).
 */
export function computeKearlLactationRequirement(
  maintenanceProfile: {
    readonly dmiKg: number;
    readonly meMcal: number;
    readonly tdnKg: number;
    readonly cpG: number;
    readonly caG: number;
    readonly pG: number;
  },
  milkKgPerDay: number,
  fatPct: number,
): {
  readonly dmiKg: number;
  readonly mePctOrMcalPerKgDm: number;
  readonly tdnPctDm: number;
  readonly cpPctDm: number;
  readonly caPctDm: number;
  readonly pPctDm: number;
} {
  const safeMilk = Math.max(0, milkKgPerDay);
  const clampedFat = Math.min(6.0, Math.max(2.5, fatPct));
  const step = (clampedFat - KEARL_MILK_FAT_LEVELS[0]) / 0.5;
  const i0 = Math.min(KEARL_MILK_TABLE.length - 1, Math.floor(step));
  const i1 = Math.min(KEARL_MILK_TABLE.length - 1, i0 + 1);
  const t = i1 === i0 ? 0 : step - i0;
  const row0 = KEARL_MILK_TABLE[i0];
  const row1 = KEARL_MILK_TABLE[i1];
  if (!row0 || !row1 || maintenanceProfile.dmiKg <= 0) {
    return {
      dmiKg: Math.max(0, maintenanceProfile.dmiKg),
      mePctOrMcalPerKgDm: 0,
      tdnPctDm: 0,
      cpPctDm: 0,
      caPctDm: 0,
      pPctDm: 0,
    };
  }
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const totalMeMcal = maintenanceProfile.meMcal + safeMilk * lerp(row0.meMcal, row1.meMcal);
  const totalTdnKg = maintenanceProfile.tdnKg + safeMilk * lerp(row0.tdnKg, row1.tdnKg);
  const totalCpG = maintenanceProfile.cpG + safeMilk * lerp(row0.cpG, row1.cpG);
  const totalCaG = maintenanceProfile.caG + safeMilk * lerp(row0.caG, row1.caG);
  const totalPG = maintenanceProfile.pG + safeMilk * lerp(row0.pG, row1.pG);
  const dmiKg = maintenanceProfile.dmiKg;

  return {
    dmiKg,
    mePctOrMcalPerKgDm: totalMeMcal / dmiKg,
    tdnPctDm: (totalTdnKg / dmiKg) * 100,
    cpPctDm: (totalCpG / (dmiKg * 1000)) * 100,
    caPctDm: (totalCaG / (dmiKg * 1000)) * 100,
    pPctDm: (totalPG / (dmiKg * 1000)) * 100,
  };
}
