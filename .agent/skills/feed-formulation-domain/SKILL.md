---
name: feed-formulation-domain
description: Pengetahuan domain nutrisi ternak untuk Open Formul — basis As-Fed vs Bahan Kering (BK/DM), satuan nutrien (% vs kcal/kg), batasan nutrien min/max, rasio nutrien, dan deteksi infeasible solution. Gunakan saat menulis/mereview logika formulasi, data bahan pakan, atau profil kebutuhan ternak.
---

# Domain Formulasi Pakan Ternak

## 1. Basis Nutrien: As-Fed vs Bahan Kering (BK / DM)

- **As-Fed (AF):** kandungan dalam bahan apa adanya (termasuk air).
- **Dry Matter (DM/BK):** kandungan setelah air dihilangkan.

Konversi (BK dalam %):

```
nilai_DM = nilai_AF × 100 / BK
nilai_AF = nilai_DM × BK / 100
```

Contoh: jagung PK 8,5% AF, BK 86% → PK DM = 8,5 × 100 / 86 = 9,88%.

**Aturan:**

1. Setiap `Ingredient` wajib punya `dryMatter` dan `basis`.
2. Sebelum membangun model LP, normalisasi **semua** bahan ke basis target (`requirement.basis`).
3. Unggas/babi umumnya memakai basis As-Fed; ruminansia umumnya basis BK.
4. Harga selalu per kg **As-Fed**. Jika model berbasis BK, biaya per kg BK = `harga / (BK/100)`, lalu hasil dikonversi kembali ke As-Fed untuk ditampilkan.
5. Jika ransum berbasis BK dan pengguna menginginkan proporsi As-Fed: `af_i = (x_i / BK_i) / Σ_j (x_j / BK_j)`.

## 2. Satuan

| Nutrien                  | Kode                   | Satuan  |
| ------------------------ | ---------------------- | ------- |
| Protein Kasar            | `cp`                   | %       |
| Energi Metabolis unggas  | `me_poultry`           | kcal/kg |
| TDN                      | `tdn`                  | %       |
| Serat Kasar              | `cf`                   | %       |
| Lemak Kasar              | `ee`                   | %       |
| Kalsium                  | `ca`                   | %       |
| Fosfor total / tersedia  | `p` / `avp`            | %       |
| Lisin, Metionin, Met+Sis | `lys`, `met`, `metcys` | %       |

- Kandungan campuran dihitung **linear berbobot**: `N_mix = Σ x_i · n_i` (berlaku untuk % maupun kcal/kg, karena keduanya per satuan massa).
- Jangan konversi kcal↔MJ secara implisit (1 kcal = 4,184 kJ); simpan satuan eksplisit di `Nutrient.unit`.
- Premix vitamin-mineral biasanya ditetapkan dengan inklusi tetap (`min = max`, mis. 0,5%).

## 3. Batasan Nutrien

- `min` saja: ≥ (mis. PK ≥ 21%).
- `max` saja: ≤ (mis. SK ≤ 5%).
- `min` & `max`: rentang. Validasi `min ≤ max` sebelum solve.
- `null/undefined` = tidak dibatasi.
- **Rasio** (mis. Ca:P antara 1,5–2,5) dilinearkan: `Σ x_i(ca_i − 1,5·p_i) ≥ 0` dan `Σ x_i(ca_i − 2,5·p_i) ≤ 0`.

## 4. Batas Inklusi Bahan

- `x_i_min ≤ x_i ≤ x_i_max` (fraksi). Validasi `Σ min_i ≤ 1` dan `Σ max_i ≥ 1`.

## 5. Deteksi Infeasible

Lakukan **pra-pemeriksaan** cepat sebelum solver, lalu tafsirkan status solver:

1. Untuk tiap nutrien dengan `min`: jika `max_i n_i < min` → mustahil (tidak ada bahan cukup kaya). Laporkan nutrien tsb.
2. Untuk tiap nutrien dengan `max`: jika `min_i n_i > max` → mustahil.
3. Batas inklusi: `Σ min_i > 1` atau `Σ max_i < 1` → mustahil.
4. Jika solver mengembalikan `Infeasible`, sarankan: tambah bahan kaya nutrien yang kurang, longgarkan batas, atau periksa satuan/basis.
5. Opsional (Fase 3): model _elastic_ dengan variabel slack berpenalti untuk menunjukkan kendala mana yang paling dilanggar.

## 6. Verifikasi Hasil

- `|Σ x_i − 1| < 1e-6`
- Setiap nutrien dalam `[min − 1e-6, max + 1e-6]`.
- Tandai status per nutrien: `met`, `below_min`, `above_max`.

## 7. Sumber Data Rujukan

NRC (Poultry 1994, Swine 2012, Beef 2016, Small Ruminants 2007), Feedipedia (INRAE-CIRAD-AFZ-FAO), SNI pakan, dan tabel komposisi bahan pakan Indonesia. Selalu cantumkan `source`.
