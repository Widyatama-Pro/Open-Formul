# 🗺️ Roadmap Open Formul

Status: ⬜ belum dimulai · 🟨 berjalan · ✅ selesai · 🕒 _Coming Soon_ di menu **Modul Lanjutan (Advance)**

> Rincian matematis, skema tipe, dan strategi pengujian tiap fitur pasca-deploy didokumentasikan pada [docs/advanced-feature-research-plan.md](advanced-feature-research-plan.md).

## Fase 1 — Pondasi Proyek, Skema Data & UI Prototype Cross-Platform ✅

- ✅ Struktur repositori, dokumentasi open-source, dan AI agent skills
- ✅ Scaffold Vite + React + TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + Tailwind CSS v4
- ✅ ESLint, Prettier, Vitest (`@testing-library/react`), dan GitHub Actions CI ([ci.yml](../.github/workflows/ci.yml))
- ✅ Skema data kanonik `Ingredient`, `Nutrient`, `Requirement`, `FormulationConfig`, `FormulationResult`, `Recipe`, `UserPreferences` ([data-schema](data-schema.md))
- ✅ Sampel database bahan pakan JSON (`src/data/*.sample.json`) & dataset kerja interaktif (`src/data/mock-state.ts`)
- ✅ **UI Prototype Lintas Perangkat (`CORE-01` s/d `FE-10`):** Adaptive AppShell (Desktop Sidebar + Mobile Bottom Nav/Drawer), 3-Panel Workbench, 3-Step Mobile Stepper, Input Desimal Lokal (`locale-number`), Mode Optimasi 1–5, Advance (AA/NDF/ANF + SID/AvP), Anti-Nol, Batch Mixer, Grafik SVG, Shadow Price/What-If, Database Bahan/Ternak, Resep/Ekspor, & Pengaturan Bahasa/Tema
- ✅ Integrasi HiGHS WASM (`highs`) di Web Worker (`ENG-01` s/d `ENG-08`)
- ✅ Model builder LP, L1 elastik, & verifikasi pasca-solve (`1e-6`) terhadap hitungan manual

## Fase 2 — Antarmuka Input & Kalkulasi Solver Nyata ✅

- ✅ Grid matriks bahan pakan (harga custom/override, batas min/max, detail sheet) — _terhubung solver live_
- ✅ Pemilihan bahan aktif, kunci manual What-If, & aturan Anti-Nol — _terhubung solver live_
- ✅ Input target nutrien min/max per profil ternak + rasio terlinearisasi Ca:P — _terhubung solver live_
- ✅ Kalkulasi otomatis _debounced_ via Web Worker HiGHS WASM (`solveFormulation()` dengan pembatalan tiket usang & fallback JSDOM/Node)
- ✅ Tabel hasil, batch mixer As-Fed/BK, grafik SVG, Shadow Price/Bound Duals/Price Range, Mode 1–5, & Mode Relaksasi Elastik $\ell_1$

## Fase 3 — Fitur Presisi ✅

- ✅ Konversi basis As-Fed ↔ Bahan Kering (BK/DM) & kalkulator persamaan nutrisi (`src/utils/basis.ts`, `src/utils/equations.ts` mencakup persamaan ruminansia & babi Hartadi 1980, Garrett 1977, NRC 1988 Table 6-1, dan Kearl 1982 Table 15)
- ✅ Batas inklusi bahan (min/max %, grup bahan, What-If lock)
- ✅ Nutrien kustom penuh (nama, satuan, basis dinamis pengguna) pada target nutrien, tabel grid/detail bahan, impor/ekspor CSV, serta solver HiGHS LP
- ✅ Rasio nutrien terlinearisasi (`Ca:P` dan batas min/max rasio lain tanpa `0/0`)
- ✅ Analisis sensitivitas / _shadow price_, _bound duals_, _opportunity cost_, dan rentang harga bahan
- ✅ Ekspansi penuh pustaka bahan & standar kebutuhan ruminansia beserta arsip referensi lokal (`docs/references/`): **304 bahan** [`hartadi-feeds.ts`](../src/data/hartadi-feeds.ts) (14 kurasi awal + 246 bahan Tabel 12 tergabung Tabel 13/14 + 44 suplemen mineral Tabel 15), **82 profil Kearl 1982** (`KEARL_REQUIREMENTS`: 6 profil awal + 76 profil Tabel 14), **24 profil sapi perah NRC 1988** (`NRC_1988_DAIRY_REQUIREMENTS`), serta _windowing_ progresif katalog `> 50` item (`Tampilkan Semua`)

## Fase 4 — Publikasi Lintas Platform, PWA Penuh & Ekspor/Impor 🟨

- ✅ Service Worker + manifest adaptif (`start_url: "./"`, `scope: "./"`), instalable via `beforeinstallprompt` & panduan Desktop/Android/iOS (`SettingsPage`), offline penuh (`vite-plugin-pwa`, _precache_ aset + `highs-*.wasm`)
- ✅ Workflow deploy otomatis ke **GitHub Pages** ([deploy-pages.yml](../.github/workflows/deploy-pages.yml)) & **Bundel Offline Portabel GitHub Releases** ([release-offline.yml](../.github/workflows/release-offline.yml))
- ✅ Halaman **Modul Lanjutan (Advance)** menampilkan seluruh 15 modul riset berstatus **Coming Soon** dengan penjelasan fungsi sederhana (`AdvancedModulesPreview.tsx`)
- ✅ Penyimpanan IndexedDB via `idb` (`open-formul-db` v1) + fallback memori
- ✅ Ekspor/impor `.feed.json`, CSV partial-merge, Excel `.xlsx` (OOXML), TSV Multi-Cell Paste, & PDF 1.4 offline
- ✅ Pembungkus aplikasi native lintas platform siap rilis otomatis di [GitHub Releases](../.github/workflows/release-offline.yml): **PC Windows `.exe` (Tauri v2)** + **Android `.apk` (Capacitor 8)** + dialog simpan/berbagi file ekspor native ([download.ts](../src/utils/download.ts)) & mode build `build:native`
- 🟨 Internasionalisasi penuh seluruh label & pesan diagnostik (`ID / EN`) serta penandatanganan _keystore_ rilis Play Store / Microsoft Store opsional di fase publikasi lanjutan

---

## Fase 4A — Presisi Inti, Diagnostik Akar Masalah & Stokastik (`PR-01` s/d `PR-05`) ⬜

> _Dependensi:_ Mesin LP HiGHS WASM Fase 2–3 + stabilitas deploy publik Fase 4. Semua fitur diselesaikan dengan LP murni atau _Successive Linear Programming_ (SLP) di Web Worker tanpa dependensi eksternal berat.

- 🕒 **`PR-01` Minimal IIS & Relaksasi Bertingkat:** Algoritma _Chinneck Deletion Filter_ untuk isolasi 2–3 kendala pemicu konflik, _Priority Tiers_ (Tier 0 Hard toksin/VFD tidak bisa dilonggarkan; Tier 1–3 berbobot), & Chebyshev $\epsilon$-Lexicographic Mode 5 agar _dual_ tetap hidup
- 🕒 **`PR-02` RHS Validity Ranging & Critical-Region Stepping:** Ekstraksi rentang validitas target nutrien $[b_i^{\text{down}}, b_i^{\text{up}}]$, deteksi _dual degeneracy_, dan tangga harga beli eksak (_Buy/No-Buy Step Ladder_)
- 🕒 **`PR-03` Charnes–Cooper Fractional LP & Kendala Aktif `dEB/DCAD`:** Optimasi $\min \text{Cost/Mcal ME}$ atau $\text{Cost/g SID Lys}$ langsung via substitusi LP linear, proteksi penyebut rasio `0/0`, dan kendala aktif `dEB/DCAD` (termasuk garam anionik & $\text{Cl}^-$ L-Lysine HCl)
- 🕒 **`PR-04` Formulasi Stokastik Lanjutan (Kovarians, $\sigma\_{b_i}^2$, & Cantelli):** Implementasi _Munford SLP_ dengan matriks kovarians ($\mathbf{x}^\top \Sigma \mathbf{x}$), varians kebutuhan ternak, batas bebas-distribusi _Cantelli_ untuk parameter miring, dan langkah redaman iteratif di HiGHS WASM
- 🕒 **`PR-05` Multi-Enzim Sub-Aditif & Hybrid CNCPS SLP:** Matriks Fitase (`Phytate-P`), Xilanase (`Arabinoxylan/NSP`), Protease (`(1-SID)CP`), plafon gabungan pencegah _double-counting_, retensi termal peleting vs PPLA, serta iterasi _fixed-point_ CNCPS v6.5 / NASEM 2021 + $\text{peuNDF}_{240}$

## Fase 5 — Operasional Pabrik (MILP), Fisika Peleting, Ekologi & IOFC (`ML-01` s/d `ML-05`) ⬜

> _Dependensi:_ Perluasan [toLpString.ts](../src/solver/toLpString.ts) untuk bagian `Binaries` / `Generals` MILP serta fondasi analitik Fase 4A.

- 🕒 **`ML-01` Anti-Nol Pintar (Semi-Continuous) & Resolusi Timbangan MILP:** Variabel biner $L_j^{\text{prod}} y_j \le x_j \le U_j y_j$ (boleh `0%`, tapi bila masuk minimal sebesar resolusi timbangan mikro) & kelipatan kantong/timbangan ($z_j \in \mathbb{Z}_{\ge 0}$)
- 🕒 **`ML-02` Koreksi Susut Peleting & Indeks Kualitas Pelet (PDI):** Neraca massa produk jadi pasca-penguapan & debu siklon, pemisahan variabel _mixer fat_ vs _post-pellet coater fat_, batas kelembaban _die_ ($\le 18\%$) & kemasan ($\le 12{,}5\%$), dan skor PDI linear
- 🕒 **`ML-03` Aturan Bentrok Aditif & Beban Mikotoksin Kumulatif:** Larangan MILP pasangan fatal (ionofor–tiamulin) & rotasi koksidiostat, serta indeks akumulasi racun jamur ($\text{AFB1} + \text{DON} + \text{ZEA} \le 1{,}0$)
- 🕒 **`ML-04` Eco-Nutrition LCA & Neraca Retensi N/P:** Multi-objektif $\epsilon$-constraint biaya vs jejak karbon _cradle-to-mill-gate_ + LUC (GFLI/ECOALIM), neraca ekskresi N/P monogastrik, dan metana enterik ($\text{eCH}_4$)
- 🕒 **`ML-05` Maksimasi Profit Karkas & Laba Susu (IOFC / Gompertz / GA):** Optimizer non-linear GRG / _Genetic Algorithm_ dengan penguncian domain kalibrasi biologis (broiler, babi, sapi perah)

## Fase 6 — Ekosistem Riset & Pabrik Skala Enterprise (`EN-01` s/d `EN-05`) ⬜

> _Dependensi:_ Solver MILP Fase 5, model blok Multi-Plant/Batch, serta paket inti terpisah (_decoupled core_).

- 🕒 **`EN-01` Paket Engine Terpisah (`@open-formul/core`) & Dataset Crawler:** Rilis CLI/NPM bebas DOM untuk riset Python/Jupyter/Node + skrip kurasi dataset pakan terbuka
- 🕒 **`EN-02` Multi-Blend, Multi-Plant, Silo Allocation & Multi-Lot Blending:** Optimasi blok diagonal lintas formula dengan konservasi stok multi-periode $I_{j,p,t}$, _tight Big-M_ bin/silo, serta pencampuran _multi-lot_
- 🕒 **`EN-03` Cross-Formula Procurement Matrix (Purchase Assistant):** Evaluasi harga penawaran pemasok secara serentak di seluruh formula aktif pabrik untuk menentukan tonase & harga beli paling optimal
- 🕒 **`EN-04` Loop Tertutup QC Lab / FT-NIR ke Stokastik (EWMA):** _Base vs Overlay Ingredients_, _Sample Basket_, pembaruan $\hat{\mu}_t, \hat{\sigma}_t^2$ secara EWMA langsung ke matriks stokastik, dan evaluator DAG bebas _circular dependency_
- 🕒 **`EN-05` Batch Sequencing Anti-Carryover (GLSP/ATSP) & Label SNI/EU/AAFCO:** Penjadwalan urutan produksi + audit batch pembilasan mixer serta ekspor label otomatis patuh **SNI / Permentan RI**, **EU Reg 767/2009**, & **AAFCO / VFD**
