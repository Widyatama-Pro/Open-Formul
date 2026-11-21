# Matematika Formulasi (Linear Programming)

## Notasi

| Simbol                 | Arti                                      |
| ---------------------- | ----------------------------------------- |
| $i = 1..n$             | indeks bahan pakan                        |
| $k = 1..m$             | indeks nutrien                            |
| $x_i$                  | fraksi bahan $i$ dalam ransum (0–1)       |
| $c_i$                  | harga bahan $i$ per kg (pada basis model) |
| $a_{ki}$               | kandungan nutrien $k$ pada bahan $i$      |
| $b_k^{min}, b_k^{max}$ | batas nutrien $k$                         |
| $L_i, U_i$             | batas inklusi bahan $i$                   |

## Model Least-Cost

$$
\min_{x} \; Z = \sum_{i=1}^{n} c_i x_i
$$

dengan kendala:

$$
\sum_{i=1}^{n} x_i = 1
$$

$$
b_k^{min} \le \sum_{i=1}^{n} a_{ki} x_i \le b_k^{max} \quad \forall k
$$

$$
L_i \le x_i \le U_i, \quad 0 \le L_i \le U_i \le 1 \quad \forall i
$$

Kandungan nutrien campuran bersifat linear karena nutrien dinyatakan per satuan massa (% atau kcal/kg).

## Kendala Rasio

Rasio $r^{min} \le \frac{\sum a_{pi}x_i}{\sum a_{qi}x_i} \le r^{max}$ dilinearkan (penyebut positif):

$$
\sum_i (a_{pi} - r^{min} a_{qi}) x_i \ge 0, \qquad \sum_i (a_{pi} - r^{max} a_{qi}) x_i \le 0
$$

## Konversi Basis

$$
a^{DM} = a^{AF} \cdot \frac{100}{BK}, \qquad c^{DM} = c^{AF} \cdot \frac{100}{BK}
$$

Proporsi As-Fed dari solusi berbasis BK:

$$
x_i^{AF} = \frac{x_i / BK_i}{\sum_j x_j / BK_j}
$$

## Infeasibility

Model tidak layak bila tidak ada $x$ yang memenuhi semua kendala. Syarat perlu (pra-pemeriksaan):

- $\max_i a_{ki} \ge b_k^{min}$ dan $\min_i a_{ki} \le b_k^{max}$ untuk setiap $k$ (dengan bahan aktif)
- $\sum_i L_i \le 1 \le \sum_i U_i$

## Contoh 2 Bahan (verifikasi manual)

Jagung (PK 8,5%, Rp5.500) dan SBM (PK 44%, Rp8.200), target PK = 20%:

$$
8.5x_1 + 44x_2 = 20,\; x_1 + x_2 = 1 \Rightarrow x_2 = \frac{11.5}{35.5} \approx 0.3239,\; x_1 \approx 0.6761
$$

Biaya ≈ 5.500·0,6761 + 8.200·0,3239 ≈ **Rp6.374/kg**. Kasus ini dipakai sebagai unit test acuan.

## Analisis Sensitivitas (Fase 3)

- _Shadow price_ (nilai dual) kendala nutrien: perubahan biaya per kenaikan satu satuan target.
- _Reduced cost_ bahan tak terpakai: penurunan harga yang dibutuhkan agar bahan masuk ransum.

## Persamaan Nutrisi Ruminansia & Monogastrik (`src/utils/equations.ts`)

Seluruh persamaan berikut diimplementasikan murni pada basis Bahan Kering (BK) dengan _safety clamp_ $\ge 0$:

- **Protein Tercerna Hijauan/Silase (Knight & Harris, 1966; Hartadi et al., 1980 Tabel 10 Kelas 3):** $\text{DP}\% = \max(0,\, 0,908 \cdot \text{CP}\% - 3,77)$.
- **Digestible Energy (Crampton et al., 1957; Swift, 1957):** $\text{DE}_{\text{sapi/domba}}(\text{Mcal/kg}) = 0,04409 \cdot \text{TDN}\%$.
- **Metabolizable Energy Ruminansia:** $\text{ME}_{\text{regresi}} = \max(0,\, -0,45 + 1,01 \cdot \text{DE})$ (Moe & Tyrrell, 1976 / Tabel 12 Hartadi) dan $\text{ME}_{0,82} = 0,82 \cdot \text{DE}$ (masukan polinomial Garrett, 1977).
- **Net Energy Sapi Potong (Garrett, 1977; teks Inggris Hartadi hlm. 25):**
  - $\text{NE}_m = \max(0,\, 1,115 - 0,8971\text{ME} + 0,6507\text{ME}^2 - 0,1028\text{ME}^3 + 0,005725\text{ME}^4)$
  - $\text{NE}_g = \max(0,\, 3,178\text{ME} - 0,8646\text{ME}^2 + 0,1275\text{ME}^3 - 0,006787\text{ME}^4 - 3,325)$
- **Net Energy Laktasi (Moe & Tyrrell, 1976):** $\text{NE}_l(\text{Mcal/kg}) = \max(0,\, -0,12 + 0,0245 \cdot \text{TDN}\%)$.
- **ME Babi (Asplund & Harris, 1969):** $\text{ME}(\text{kcal/kg}) = \max(0,\, (0,96 - 0,00202 \cdot \text{CP}\%) \cdot \text{DE})$.
- **4% Fat-Corrected Milk & Kebutuhan DMI/Laktasi (NRC, 1988 Tabel 6-1 & Kearl, 1982 Tabel 15):** $\text{FCM}(4\%) = 0,4 \cdot \text{Susu} + 0,15 \cdot \text{Susu} \cdot \text{Lemak}\%$, interpolasi bilinear DMI (`estimateCattleDryMatterIntakePctBw`), dan agregasi kebutuhan harian hidup pokok + produksi susu menjadi konsentrasi `% BK` (`computeKearlLactationRequirement`).

## Modul Presisi Fase 4A (Aktif di `src/solver/`)

> **Status Implementasi:** Fitur `PR-01` s/d `PR-05` telah aktif di Web Worker HiGHS WASM dan unit test solver (`tests/solver-pr01-diagnostics.test.ts` s/d `tests/solver-pr05.test.ts`), bersama evaluator rumen aljabar pasca-solve ([rumenEvaluator.ts](../src/solver/rumenEvaluator.ts)).

- **Minimal IIS & Priority Tiers (`PR-01`, [iis.ts](../src/solver/iis.ts)):** _Chinneck Deletion Filter_ untuk mengisolasi kendala nutrien, rasio, dan grup pemicu konflik, dipadukan penalti bertingkat `tier0` (kaku) hingga `tier3` (lunak) serta Mode 5 Chebyshev $\min D + 10^{-5}\sum c_j x_j$.
- **RHS Validity Ranging, Directional Duals & Parametric Stepping (`PR-02`, [criticalStepping.ts](../src/solver/criticalStepping.ts)):** Ekstraksi rentang RHS `[rowBoundDown, rowBoundUp]`, deteksi degenerasi basis + probing $\pm\delta$ (`shadowPriceDown`, `shadowPriceUp`), serta kurva tangga harga beli _Buy/No-Buy_ berantai melintasi `colCostDown/Up`.
- **Optimasi Rasio Biaya/Nutrisi & Kendala Aktif `dEB/DCAD` (`PR-03`, [solveFormulation.ts](../src/solver/solveFormulation.ts)):** Iterasi parametrik Dinkelbach untuk $\min \frac{\sum c_j x_j}{\sum e_j x_j}$ (setara transformasi Charnes–Cooper) dengan lantai penyebut `1e-4` & guard `FRACTIONAL_DENOMINATOR_ZERO`, ditambah resolusi dinamis `deb`/`dcad` dari `Na/K/Cl/S`.
- **Stokastik CCP + Munford SLP & Cantelli (`PR-04`, [stochastic.ts](../src/solver/stochastic.ts)):** Linearisasi Taylor orde-1 $\sqrt{\sum (\sigma_{ij} x_j)^2 + \sigma_{b_i}^2 + 10^{-12}}$ dengan pengali $\kappa_i = \Phi^{-1}(p_i)$ atau $\sqrt{p_i / (1 - p_i)}$ (_Cantelli_) dan redaman $\alpha$, disertai penskalaan `stdDev` saat konversi basis.
- **Multi-Enzim Sub-Aditif & Evaluator Rumen CNCPS/NASEM (`PR-05`, [enzymes.ts](../src/solver/enzymes.ts), [rumenEvaluator.ts](../src/solver/rumenEvaluator.ts)):** Uplift enzim per bahan dibatasi retensi termal, pool substrat (`phytateP` / `substrateNutrientId`), dan plafon sub-aditif $\psi$, disertai estimasi aljabar pasca-solve `peuNDF240`, `DMI` Mertens, laju alir `kp`, sintesis `MCP`, emisi `eCH4`, dan risiko asidosis.

## Spesifikasi Target Matematis Fase 5 (Opsional Single-Mix vs Out of Scope)

- **Neraca Susut Air Produk Jadi (`ML-02`, Opsional):** $(1 - \delta_{\text{dust}})\sum x_j + x_{\text{steam}} + x_{\text{oil,coater}} - x_{\text{evap}} = 1{,}00$ per 1 kg pakan akhir + kendala indeks PDI linear.
- **Pareto Eco-Nutrition (`ML-04`, Out of Scope PWA):** $\min \sum c_j x_j$ dengan kendala $\sum \text{GWP}_j^{\text{LCA+LUC}} x_j \le \varepsilon_k$ dan neraca retensi N/P (Mackenzie et al., 2016; Garcia-Launay et al., 2018; Moraes et al., 2015).

## Kalkulator Dinamis Sapi Potong/Perah & Proksimat BETN

- **Sapi Potong & Sapi Perah Dinamis ([cattle-requirements.ts](../src/utils/cattle-requirements.ts)):** Kebutuhan harian sapi potong menggunakan interpolasi/ekstrapolasi bilinear Kearl (1982) Tabel 14 (cakupan bobot terlengkap 150–600 kg dengan koreksi _erratum_ cetak `BW=300, ADG=1.10` menjadi `DMI=7,6 kg; ME=19,78 Mcal; TDN=5,46 kg` $\approx 71{,}8\%$ TDN); sapi perah mendukung standar baku **Kearl (1982)** (koreksi _erratum_ `BW=400` laktasi) maupun **NRC (1988)** dengan konversi $\text{FCM 4\%} = 0{,}4M + 15F$ dan estimasi DMI berbasis `%BB`. Setelah bobot badan diinput, fungsi dinamis juga langsung menghitung kendala **Lemak Kasar (`ee`/LK)** (`1,5–6,5% BK` sapi potong; `2,0–6,5% BK` laktasi sesuai plafon lemak rumen SNI 3148-1/2:2017 & NRC 1988/2016) dan **Serat Kasar (`cf`/SK)** yang diskalakan proporsional terhadap kepadatan energi TDN & fase fisiologis (`13–31% BK` merujuk Hartadi et al., 1980 Tabel 7, SNI 3148-2:2017, dan NRC 1988/2016).
- **Bahan Ekstrak Tanpa Nitrogen (`betn`):** Dihitung pada lapisan data proksimat sebagai $\text{BETN} = 100 - (\text{Air} + \text{Abu} + \text{PK} + \text{LK} + \text{SK})$ (bernilai `0` untuk bahan mineral/asam amino/premix murni) dan dievaluasi sebagai nutrien opsional (`config.showBetn`).

## Mode Pendekatan 1 Angka (`targetInputMode = "single"`) & Saran Bahan Indonesia

- **Pendekatan 1 Angka & Plafon Asimetris Serat Kasar (`cf`/SK):** Setiap nutrien aktif dipetakan ke satu target tunggal $T_k$ (`resolveSingleTargetValue`). Nutrien standar diberlakukan kendala $\sum a_{ki} x_i \ge T_k$ beserta minimasi deviasi $\ell_1$ ($\sum a_{ki} x_i - d_k^+ + d_k^- = T_k$) agar hasil mendekati $T_k$ sepresisi mungkin. Khusus **Serat Kasar (`cf`/SK)** berlaku aturan asimetris: kekurangan di bawah `min` boleh direlaksasi lebih longgar (`tier3`), sedangkan kelebihan di atas `max` dipromosikan minimal `tier1` dengan **plafon keras $+15\%$ relatif dari `max`** ($\sum a_{\text{cf},i} x_i \le 1{,}15 \cdot b_{\text{cf}}^{max}$ pada model maupun verifikasi pasca-solve [parseResult.ts](../src/solver/parseResult.ts)). Jika kebutuhan `cf` melampaui `+15%` di atas batas maksimal, formulasi wajib ditolak sebagai `infeasible` meskipun `Toleransi Target` (`elasticMode`) aktif.
- **Algoritma Saran Bahan Prioritas Indonesia ([ingredientAdvisor.ts](../src/solver/ingredientAdvisor.ts)):** Ketika hasil _infeasible_ (memakai _simplex knapsack extrema_ yang menghormati batas inklusi `[min, max]`), _near-feasible_, atau menyimpang jauh dari target tunggal, `recommendIngredientsForGaps` menilai bahan non-aktif yang kompatibel spesies (memblokir protein hewani/ikan/darah untuk ruminansia sambil tetap mengizinkan bungkil kelapa, mengecualikan asam amino sintetis `dl-methionine` dari rekomendasi umum, serta menyaring entri kosong) menggunakan skor penutup celah berbobot prioritas ketersediaan lokal Indonesia (`high = 1,0`, `medium = 0,58`, `low = 0,08`) dengan deduplikasi keluarga bahan. Saran bersifat opsional (pilihan pengguna **Ya, Masukkan / Tidak**).
