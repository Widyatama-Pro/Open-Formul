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
