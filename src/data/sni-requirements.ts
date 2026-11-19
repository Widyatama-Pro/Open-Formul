import type { Requirement } from "../types";

/**
 * Standar Kebutuhan Nutrien Ternak resmi berdasarkan Standar Nasional Indonesia (SNI)
 * lengkap dengan nomor seri & tahun terbitnya (Badan Standardisasi Nasional / BSN):
 *
 * - Ayam Ras Pedaging (Broiler): SNI 8173.1:2015, SNI 8173.2:2015, SNI 8173.3:2015
 * - Ayam Ras Petelur (Layer): SNI 8290.1:2016 s/d SNI 8290.5:2016
 * - Ayam Buras / Kampung: SNI 7783.1:2013 s/d SNI 7783.3:2013
 * - Itik Petelur: SNI 3908:2017, SNI 3909:2017, SNI 3910:2017
 * - Pakan Konsentrat Sapi Perah: SNI 3148-1:2017 (KSP1, KSP3, KSP4, KSP5, KSP6)
 * - Pakan Konsentrat Sapi Potong: SNI 3148-2:2017 (Penggemukan, Induk, Pejantan)
 * - Pakan Konsentrat Domba/Kambing Penggemukan: SNI 8819:2019
 */
export const SNI_REQUIREMENTS: readonly Requirement[] = [
  // =========================================================================
  // 1. AYAM RAS PEDAGING (BROILER) — SNI 8173:2015
  // =========================================================================
  {
    id: "sni-8173-1-2015",
    name: "Broiler Pre-Starter 1–7 hr (SNI 8173.1:2015)",
    nameEn: "Broiler Pre-Starter 1–7 d (SNI 8173.1:2015)",
    species: "broiler",
    phase: "Pre-Starter (1–7 hari)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 22.0, idealTarget: 23.0, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 3000, enabled: true },
      { nutrientId: "ee", min: 5.0, idealTarget: 5.5, enabled: true },
      { nutrientId: "cf", max: 4.0, idealTarget: 3.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.1, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.7, enabled: true },
      { nutrientId: "lys", min: 1.3, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.5, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.9, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source:
      "SNI 8173.1:2015 — Pakan Ayam Ras Pedaging (Broiler) Bagian 1: Sebelum Masa Awal (BSN, 2015)",
  },
  {
    id: "sni-8173-2-2015",
    name: "Broiler Starter 8–21 hr (SNI 8173.2:2015)",
    nameEn: "Broiler Starter 8–21 d (SNI 8173.2:2015)",
    species: "broiler",
    phase: "Starter (8–21 hari)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20.0, idealTarget: 21.5, enabled: true },
      { nutrientId: "me_poultry", min: 3000, idealTarget: 3050, enabled: true },
      { nutrientId: "ee", min: 5.0, idealTarget: 5.5, enabled: true },
      { nutrientId: "cf", max: 5.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.1, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.68, enabled: true },
      { nutrientId: "lys", min: 1.2, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.45, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source: "SNI 8173.2:2015 — Pakan Ayam Ras Pedaging (Broiler) Bagian 2: Masa Awal (BSN, 2015)",
  },
  {
    id: "sni-8173-3-2015",
    name: "Broiler Finisher >21 hr (SNI 8173.3:2015)",
    nameEn: "Broiler Finisher >21 d (SNI 8173.3:2015)",
    species: "broiler",
    phase: "Finisher (>21 hari – panen)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 19.0, idealTarget: 20.0, enabled: true },
      { nutrientId: "me_poultry", min: 3100, idealTarget: 3150, enabled: true },
      { nutrientId: "ee", min: 5.0, idealTarget: 6.0, enabled: true },
      { nutrientId: "cf", max: 6.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.1, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.8, idealTarget: 0.62, enabled: true },
      { nutrientId: "lys", min: 1.0, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.38, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source: "SNI 8173.3:2015 — Pakan Ayam Ras Pedaging (Broiler) Bagian 3: Masa Akhir (BSN, 2015)",
  },

  // =========================================================================
  // 2. AYAM RAS PETELUR (LAYER) — SNI 8290:2016
  // =========================================================================
  {
    id: "sni-8290-1-2016",
    name: "Layer Pre-Starter 1 hr–4 mgg (SNI 8290.1:2016)",
    nameEn: "Layer Pre-Starter 1 d–4 wk (SNI 8290.1:2016)",
    species: "layer",
    phase: "Pre-Starter (1 hari–4 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20.0, idealTarget: 20.5, enabled: true },
      { nutrientId: "me_poultry", min: 2800, idealTarget: 2850, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 6.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.68, enabled: true },
      { nutrientId: "lys", min: 1.0, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.5, isAdvance: true, enabled: true },
    ],
    source: "SNI 8290.1:2016 — Pakan Ayam Ras Petelur Bagian 1: Sebelum Masa Awal (BSN, 2016)",
  },
  {
    id: "sni-8290-2-2016",
    name: "Layer Starter 5–10 mgg (SNI 8290.2:2016)",
    nameEn: "Layer Starter 5–10 wk (SNI 8290.2:2016)",
    species: "layer",
    phase: "Starter (5–10 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 19.0, idealTarget: 19.5, enabled: true },
      { nutrientId: "me_poultry", min: 2750, idealTarget: 2800, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.8, idealTarget: 0.65, enabled: true },
      { nutrientId: "lys", min: 0.9, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.4, isAdvance: true, enabled: true },
    ],
    source: "SNI 8290.2:2016 — Pakan Ayam Ras Petelur Bagian 2: Masa Awal (BSN, 2016)",
  },
  {
    id: "sni-8290-3-2016",
    name: "Layer Grower / Dara 11–16 mgg (SNI 8290.3:2016)",
    nameEn: "Layer Grower / Pullet 11–16 wk (SNI 8290.3:2016)",
    species: "layer",
    phase: "Grower / Dara (11–16 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 15.5, idealTarget: 16.0, enabled: true },
      { nutrientId: "me_poultry", min: 2700, idealTarget: 2750, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.46, max: 0.75, idealTarget: 0.58, enabled: true },
      { nutrientId: "lys", min: 0.65, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.3, isAdvance: true, enabled: true },
    ],
    source: "SNI 8290.3:2016 — Pakan Ayam Ras Petelur Bagian 3: Dara / Grower (BSN, 2016)",
  },
  {
    id: "sni-8290-4-2016",
    name: "Pre-Layer 17–18 mgg (SNI 8290.4:2016)",
    nameEn: "Pre-Layer 17–18 wk (SNI 8290.4:2016)",
    species: "layer",
    phase: "Pre-Layer (transisi bertelur)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 16.5, idealTarget: 17.0, enabled: true },
      { nutrientId: "me_poultry", min: 2700, idealTarget: 2750, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.5, enabled: true },
      { nutrientId: "ca", min: 2.0, max: 2.7, idealTarget: 2.35, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.75, idealTarget: 0.6, enabled: true },
      { nutrientId: "lys", min: 0.75, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.35, isAdvance: true, enabled: true },
    ],
    source: "SNI 8290.4:2016 — Pakan Ayam Ras Petelur Bagian 4: Sebelum Produksi (BSN, 2016)",
  },
  {
    id: "sni-8290-5-2016",
    name: "Layer Produksi 19–50 mgg (SNI 8290.5:2016)",
    nameEn: "Layer Production 19–50 wk (SNI 8290.5:2016)",
    species: "layer",
    phase: "Masa Produksi (19–50 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 16.5, idealTarget: 17.5, enabled: true },
      { nutrientId: "me_poultry", min: 2700, idealTarget: 2750, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.0, enabled: true },
      { nutrientId: "ca", min: 3.25, max: 4.25, idealTarget: 3.75, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.9, idealTarget: 0.65, enabled: true },
      { nutrientId: "lys", min: 0.8, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.4, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 4.5,
        max: 7.5,
      },
    ],
    source: "SNI 8290.5:2016 — Pakan Ayam Ras Petelur Bagian 5: Masa Produksi (BSN, 2016)",
  },

  // =========================================================================
  // 3. AYAM BURAS / KAMPUNG — SNI 7783:2013
  // =========================================================================
  {
    id: "sni-7783-1-2013",
    name: "Ayam Buras Starter 0–4 mgg (SNI 7783.1:2013)",
    nameEn: "Native Chicken Starter 0–4 wk (SNI 7783.1:2013)",
    species: "buras",
    phase: "Starter (0–4 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 17.0, idealTarget: 18.0, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 2950, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.0, enabled: true },
      { nutrientId: "ca", min: 0.7, max: 1.2, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.45, max: 0.8, idealTarget: 0.55, enabled: true },
    ],
    source: "SNI 7783.1:2013 — Pakan Ayam Buras Bagian 1: Starter (BSN, 2013)",
  },
  {
    id: "sni-7783-2-2013",
    name: "Ayam Buras Grower >4–20 mgg (SNI 7783.2:2013)",
    nameEn: "Native Chicken Grower >4–20 wk (SNI 7783.2:2013)",
    species: "buras",
    phase: "Grower (>4–20 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 14.0, idealTarget: 15.0, enabled: true },
      { nutrientId: "me_poultry", min: 2500, idealTarget: 2650, enabled: true },
      { nutrientId: "cf", max: 8.0, idealTarget: 6.0, enabled: true },
      { nutrientId: "ca", min: 0.7, max: 1.2, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.28, max: 0.7, idealTarget: 0.45, enabled: true },
    ],
    source: "SNI 7783.2:2013 — Pakan Ayam Buras Bagian 2: Grower (BSN, 2013)",
  },
  {
    id: "sni-7783-3-2013",
    name: "Ayam Buras Layer >20 mgg (SNI 7783.3:2013)",
    nameEn: "Native Chicken Layer >20 wk (SNI 7783.3:2013)",
    species: "buras",
    phase: "Layer (>20 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 14.0, idealTarget: 15.5, enabled: true },
      { nutrientId: "me_poultry", min: 2500, idealTarget: 2600, enabled: true },
      { nutrientId: "cf", max: 8.0, idealTarget: 6.0, enabled: true },
      { nutrientId: "ca", min: 2.5, max: 4.0, idealTarget: 3.2, enabled: true },
      { nutrientId: "p", min: 0.35, max: 0.75, idealTarget: 0.5, enabled: true },
    ],
    source: "SNI 7783.3:2013 — Pakan Ayam Buras Bagian 3: Bertelur / Layer (BSN, 2013)",
  },

  // =========================================================================
  // 4. ITIK PETELUR — SNI 3908 / 3909 / 3910:2017
  // =========================================================================
  {
    id: "sni-3908-2017",
    name: "Itik Starter / Meri 1 hr–6 mgg (SNI 3908:2017)",
    nameEn: "Laying Duck Starter 1 d–6 wk (SNI 3908:2017)",
    species: "duck",
    phase: "Meri / Starter (1 hari–6 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 18.0, idealTarget: 19.0, enabled: true },
      { nutrientId: "me_poultry", min: 2700, idealTarget: 2800, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 8.0, idealTarget: 6.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.65, enabled: true },
    ],
    source: "SNI 3908:2017 — Pakan Meri Petelur / Itik Starter (BSN, 2017)",
  },
  {
    id: "sni-3909-2017",
    name: "Itik Grower / Dara 7–18 mgg (SNI 3909:2017)",
    nameEn: "Laying Duck Grower 7–18 wk (SNI 3909:2017)",
    species: "duck",
    phase: "Dara / Grower (7–18 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 15.0, idealTarget: 15.5, enabled: true },
      { nutrientId: "me_poultry", min: 2600, idealTarget: 2650, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 9.0, idealTarget: 7.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 2.0, idealTarget: 1.2, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.8, idealTarget: 0.6, enabled: true },
    ],
    source: "SNI 3909:2017 — Pakan Itik Petelur Dara / Grower (BSN, 2017)",
  },
  {
    id: "sni-3910-2017",
    name: "Itik Layer >18 mgg (SNI 3910:2017)",
    nameEn: "Laying Duck Layer >18 wk (SNI 3910:2017)",
    species: "duck",
    phase: "Produksi / Layer (>18 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 17.0, idealTarget: 18.0, enabled: true },
      { nutrientId: "me_poultry", min: 2650, idealTarget: 2700, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 10.0, idealTarget: 7.0, enabled: true },
      { nutrientId: "ca", min: 2.9, max: 4.25, idealTarget: 3.4, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.85, idealTarget: 0.65, enabled: true },
    ],
    source: "SNI 3910:2017 — Pakan Itik Petelur Masa Produksi / Layer (BSN, 2017)",
  },

  // =========================================================================
  // 5. KONSENTRAT SAPI PERAH — SNI 3148-1:2017
  // =========================================================================
  {
    id: "sni-3148-1-ksp1-2017",
    name: "Konsentrat Sapi Perah Pedet Pemula-1 (SNI 3148-1:2017)",
    nameEn: "Dairy Calf Starter-1 Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP1 · Pedet 1–4 minggu",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 21.0, idealTarget: 22.0, enabled: true },
      { nutrientId: "tdn", min: 80.0, idealTarget: 82.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.7, max: 0.9, idealTarget: 0.8, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.8, idealTarget: 0.55, enabled: true },
    ],
    source: "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP1 Pemula-1, BSN 2017)",
  },
  {
    id: "sni-3148-1-ksp3-2017",
    name: "Konsentrat Sapi Perah Dara (SNI 3148-1:2017)",
    nameEn: "Dairy Heifer Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP3 · Dara 7–18 bulan",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 15.0, idealTarget: 16.0, enabled: true },
      { nutrientId: "tdn", min: 70.0, idealTarget: 72.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 1.0, idealTarget: 0.8, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.6, idealTarget: 0.5, enabled: true },
      { nutrientId: "ndf", max: 30.0, isAdvance: true, enabled: true },
    ],
    source: "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP3 Dara, BSN 2017)",
  },
  {
    id: "sni-3148-1-ksp4-2017",
    name: "Konsentrat Sapi Perah Laktasi Normal (SNI 3148-1:2017)",
    nameEn: "Dairy Lactation Normal Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP4 · Laktasi Normal",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 14.0, idealTarget: 15.5, enabled: true },
      { nutrientId: "tdn", min: 68.0, idealTarget: 70.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 1.2, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.6, idealTarget: 0.5, enabled: true },
      { nutrientId: "ndf", max: 35.0, isAdvance: true, enabled: true },
    ],
    source: "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP4 Laktasi, BSN 2017)",
  },
  {
    id: "sni-3148-1-ksp5-2017",
    name: "Konsentrat Sapi Perah Laktasi Tinggi (SNI 3148-1:2017)",
    nameEn: "Dairy High-Yield Lactation Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP5 · Laktasi Produksi Tinggi",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 18.0, idealTarget: 19.0, enabled: true },
      { nutrientId: "tdn", min: 68.0, idealTarget: 72.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 5.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.3, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.8, idealTarget: 0.6, enabled: true },
      { nutrientId: "ndf", max: 33.0, isAdvance: true, enabled: true },
    ],
    source:
      "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP5 Laktasi Tinggi, BSN 2017)",
  },
  {
    id: "sni-3148-1-ksp6-2017",
    name: "Konsentrat Sapi Perah Kering Bunting (SNI 3148-1:2017)",
    nameEn: "Dairy Dry Pregnant Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP6 · Kering Bunting (2 bln pra-beranak)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 16.0, idealTarget: 16.5, enabled: true },
      { nutrientId: "tdn", min: 68.0, idealTarget: 70.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.8, idealTarget: 0.55, enabled: true },
      { nutrientId: "ndf", max: 35.0, isAdvance: true, enabled: true },
    ],
    source:
      "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP6 Kering Bunting, BSN 2017)",
  },

  // =========================================================================
  // 6. KONSENTRAT SAPI POTONG — SNI 3148-2:2017
  // =========================================================================
  {
    id: "sni-3148-2-penggemukan-2017",
    name: "Konsentrat Sapi Potong Penggemukan (SNI 3148-2:2017)",
    nameEn: "Beef Fattening Concentrate (SNI 3148-2:2017)",
    species: "cattle_beef",
    phase: "Penggemukan (Fattening)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 13.0, idealTarget: 14.0, enabled: true },
      { nutrientId: "tdn", min: 68.0, idealTarget: 72.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 1.2, idealTarget: 0.8, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.8, idealTarget: 0.5, enabled: true },
    ],
    source: "SNI 3148-2:2017 — Pakan Konsentrat Bagian 2: Sapi Potong Penggemukan (BSN, 2017)",
  },
  {
    id: "sni-3148-2-induk-2017",
    name: "Konsentrat Sapi Potong Induk (SNI 3148-2:2017)",
    nameEn: "Beef Broodcow Concentrate (SNI 3148-2:2017)",
    species: "cattle_beef",
    phase: "Induk (Broodcow)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 12.0, idealTarget: 13.0, enabled: true },
      { nutrientId: "tdn", min: 65.0, idealTarget: 68.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.8, idealTarget: 0.65, enabled: true },
    ],
    source: "SNI 3148-2:2017 — Pakan Konsentrat Bagian 2: Sapi Potong Induk (BSN, 2017)",
  },
  {
    id: "sni-3148-2-pejantan-2017",
    name: "Konsentrat Sapi Potong Pejantan (SNI 3148-2:2017)",
    nameEn: "Beef Bull Concentrate (SNI 3148-2:2017)",
    species: "cattle_beef",
    phase: "Pejantan (Beef Bull)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 12.0, idealTarget: 13.0, enabled: true },
      { nutrientId: "tdn", min: 65.0, idealTarget: 68.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 0.8, idealTarget: 0.7, enabled: true },
      { nutrientId: "p", min: 0.3, max: 0.6, idealTarget: 0.45, enabled: true },
    ],
    source: "SNI 3148-2:2017 — Pakan Konsentrat Bagian 2: Sapi Potong Pejantan (BSN, 2017)",
  },

  // =========================================================================
  // 7. KONSENTRAT DOMBA / KAMBING PENGGEMUKAN — SNI 8819:2019
  // =========================================================================
  {
    id: "sni-8819-2019",
    name: "Konsentrat Domba/Kambing Penggemukan (SNI 8819:2019)",
    nameEn: "Fattening Sheep/Goat Concentrate (SNI 8819:2019)",
    species: "goat_sheep",
    phase: "Penggemukan Ruminansia Kecil",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 10.0, idealTarget: 12.0, enabled: true },
      { nutrientId: "tdn", min: 60.0, idealTarget: 65.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.3, max: 0.8, idealTarget: 0.55, enabled: true },
      { nutrientId: "p", min: 0.2, max: 0.6, idealTarget: 0.35, enabled: true },
      { nutrientId: "ndf", max: 35.0, isAdvance: true, enabled: true },
    ],
    source: "SNI 8819:2019 — Pakan Konsentrat Domba Penggemukan (BSN, 2019)",
  },
];
