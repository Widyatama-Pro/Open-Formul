# 🗺️ Roadmap OpenFormul

Status: ⬜ belum dimulai · 🟨 berjalan · ✅ selesai · 🕒 _Coming Soon_ / Opsional di menu **Modul Lanjutan (Advance)** · 🔧 dipisah ke CLI/tooling terpisah · 🚫 _Out of Scope_ PWA offline

> Rincian matematis, skema tipe, dan strategi pengujian tiap fitur pasca-deploy didokumentasikan pada [docs/advanced-feature-research-plan.md](advanced-feature-research-plan.md), sedangkan klasifikasi batas lingkup _offline-first_ tercatat pada Bagian 3.3 di [docs/prd.md](prd.md#33-audit-lingkup-offline-first-pwa-in-scope-vs-out-of-scope).

## Fase 1 — Pondasi Proyek, Skema Data & UI Prototype Cross-Platform ✅

- ✅ Struktur repositori, dokumentasi open-source, dan AI agent skills
- ✅ Scaffold Vite + React + TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + Tailwind CSS v4
- ✅ ESLint, Prettier, Vitest (`@testing-library/react`), dan GitHub Actions CI ([ci.yml](../.github/workflows/ci.yml))
- ✅ Skema data kanonik `Ingredient`, `Nutrient`, `Requirement`, `FormulationConfig`, `FormulationResult`, `Recipe`, `UserPreferences` ([data-schema](data-schema.md))
- ✅ Sampel database bahan pakan JSON (`src/data/*.sample.json`) & dataset kerja interaktif (`src/data/mock-state.ts`)
- ✅ **UI Prototype Lintas Perangkat (`CORE-01` s/d `FE-10`):** Precision Agritech Light Mode (`#0F3D3E` / `#F8FAFC` / `#059669` / `#D97706`), 64px Liquid Concave Cutout Sidebar (`motion/react`), intro reveal `380ms`, workspace utama `70%–75%` + kolom `Inklusi %` + inspector Target Nutrien `310px` _collapsible_, header `52px` + bar KPI `76px`, custom scrollbar `5px`, Mobile Bottom Nav/Drawer & 3-Step Stepper, Input Desimal Lokal (`locale-number`), Mode Optimasi 1–5, Advance (AA/NDF/ANF + SID/AvP), Anti-Nol, Batch Mixer, Grafik SVG, Shadow Price/What-If, Database Bahan/Ternak, Resep/Ekspor, & Pengaturan Bahasa/Tema
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
- ✅ Halaman **Modul Lanjutan (Advance)** menampilkan seluruh 15 modul riset berstatus **Coming Soon** dengan penjelasan fungsi sederhana (`AdvancedModulesPreview.tsx`) _(arsip peta konsep UI; pemisahan lingkup offline-first dicatat di Fase 4A–6 di bawah)_
- ✅ Penyimpanan IndexedDB via `idb` (`openformul-db` v1) + fallback memori
- ✅ Ekspor/impor `.feed.json`, CSV partial-merge, Excel `.xlsx` (OOXML), TSV Multi-Cell Paste, & PDF 1.4 offline
- ✅ Pembungkus aplikasi native lintas platform siap rilis otomatis di [GitHub Releases](../.github/workflows/release-offline.yml): **PC Windows `.exe` (Tauri v2)** + **Android `.apk` (Capacitor 8)** + dialog simpan/berbagi file ekspor native ([download.ts](../src/utils/download.ts)) & mode build `build:native`
- 🟨 Internasionalisasi penuh seluruh label & pesan diagnostik (`ID / EN`) serta penandatanganan _keystore_ rilis Play Store / Microsoft Store opsional di fase publikasi lanjutan

---

> **Audit Lingkup Offline-First (PWA + HiGHS WASM + IndexedDB):** Fitur **Fase 4A (`PR-01`–`PR-05`)** dilanjutkan penuh di aplikasi PWA offline karena murni LP/SLP/aljabar di Web Worker HiGHS WASM; fitur _single-mix_ pabrik (`ML-01`–`ML-03`) bersifat opsional; tooling eksternal (`EN-01` / `F-19` crawler) dipisah ke CLI _build-time_; sedangkan fitur yang membutuhkan server multi-user, hardware pabrik/FT-NIR, regulasi hukum dinamis, database LCA berlisensi, atau solver NLP/GA (`ML-04`, `ML-05`, `EN-02`–`EN-05`) berstatus **🚫 Out of Scope PWA**.

## Fase 4A — Presisi Inti, Diagnostik Akar Masalah & Stokastik (`PR-01` s/d `PR-05` — Lanjut Offline PWA) ⬜

> _Dependensi:_ Mesin LP HiGHS WASM Fase 2–3 + stabilitas deploy publik Fase 4. Semua fitur diselesaikan dengan LP murni atau _Successive Linear Programming_ (SLP) di Web Worker tanpa dependensi eksternal berat.

- 🕒 **`PR-01` Minimal IIS & Relaksasi Bertingkat (Lanjut — Offline LP):** Algoritma _Chinneck Deletion Filter_ untuk isolasi 2–3 kendala pemicu konflik, _Priority Tiers_ (Tier 0 Hard toksin/VFD tidak bisa dilonggarkan; Tier 1–3 berbobot), & Chebyshev $\epsilon$-Lexicographic Mode 5 agar _dual_ tetap hidup
- 🕒 **`PR-02` RHS Validity Ranging & Critical-Region Stepping (Lanjut — Offline LP):** Ekstraksi rentang validitas target nutrien $[b_i^{\text{down}}, b_i^{\text{up}}]$, deteksi _dual degeneracy_, dan tangga harga beli eksak (_Buy/No-Buy Step Ladder_)
- 🕒 **`PR-03` Charnes–Cooper Fractional LP & Kendala Aktif `dEB/DCAD` (Lanjut — Offline LP):** Optimasi $\min \text{Cost/Mcal ME}$ atau $\text{Cost/g SID Lys}$ langsung via substitusi LP linear, proteksi penyebut rasio `0/0`, dan kendala aktif `dEB/DCAD` (termasuk garam anionik & $\text{Cl}^-$ L-Lysine HCl)
- 🕒 **`PR-04` Formulasi Stokastik Lanjutan (Kovarians, $\sigma\_{b_i}^2$, & Cantelli) (Lanjut — Offline SLP):** Implementasi _Munford SLP_ dengan matriks kovarians ($\mathbf{x}^\top \Sigma \mathbf{x}$), varians kebutuhan ternak, batas bebas-distribusi _Cantelli_ untuk parameter miring, dan langkah redaman iteratif di HiGHS WASM
- 🕒 **`PR-05` Multi-Enzim Sub-Aditif & Evaluator Rumen/CNCPS (Lanjut — Offline LP & Aljabar):** Matriks Fitase (`Phytate-P`), Xilanase (`Arabinoxylan/NSP`), Protease (`(1-SID)CP`), plafon gabungan pencegah _double-counting_, retensi termal peleting vs PPLA, serta evaluator pasca-solve CNCPS v6.5 / NASEM 2021 + $\text{peuNDF}_{240}$ _(tanpa Genetic Algorithm)_

## Fase 5 — Operasional Pabrik Single-Mix (Opsional) vs Ekologi & IOFC (Out of Scope PWA) ⬜

> _Catatan Lingkup:_ Hanya perluasan _single-mix_ di [toLpString.ts](../src/solver/toLpString.ts) (`ML-01`–`ML-03`) yang kompatibel dengan arsitektur offline HiGHS WASM; `ML-04` dan `ML-05` dikeluarkan dari lingkup PWA.

- 🕒 **`ML-01` Anti-Nol Pintar (Semi-Continuous) & Resolusi Timbangan MILP (Opsional Single-Mix MILP):** Variabel biner $L_j^{\text{prod}} y_j \le x_j \le U_j y_j$ (boleh `0%`, tapi bila masuk minimal sebesar resolusi timbangan mikro) & kelipatan kantong/timbangan ($z_j \in \mathbb{Z}_{\ge 0}$) untuk 1 formula tunggal
- 🕒 **`ML-02` Koreksi Susut Peleting & Indeks Kualitas Pelet (PDI) (Opsional Single-Mix LP):** Neraca massa produk jadi pasca-penguapan & debu siklon, pemisahan variabel _mixer fat_ vs _post-pellet coater fat_, batas kelembaban _die_ ($\le 18\%$) & kemasan ($\le 12{,}5\%$), dan skor PDI linear
- 🕒 **`ML-03` Aturan Bentrok Aditif & Beban Mikotoksin Kumulatif (Opsional Single-Mix MILP):** Larangan MILP pasangan fatal (ionofor–tiamulin) & rotasi koksidiostat, serta indeks akumulasi racun jamur ($\text{AFB1} + \text{DON} + \text{ZEA} \le 1{,}0$)
- 🚫 **`ML-04` Eco-Nutrition LCA & Neraca Retensi N/P _(Out of Scope PWA)_:** Multi-objektif $\epsilon$-constraint biaya vs jejak karbon _cradle-to-mill-gate_ + LUC (GFLI/ECOALIM) — ditangguhkan karena ketergantungan database LCA berlisensi komersial; hanya kalkulator aljabar ringan emisi ($\text{eCH}_4$/N-P) yang dipertahankan di `F-31`
- 🚫 **`ML-05` Maksimasi Profit Karkas & Laba Susu (IOFC / Gompertz / GA) _(Out of Scope PWA)_:** Optimizer non-linear GRG / _Genetic Algorithm_ — dikeluarkan karena memerlukan solver non-linear di luar HiGHS WASM serta kalibrasi genetik/kandang yang sangat spesifik

## Fase 6 — Tooling CLI Terpisah & Enterprise Pabrik (`EN-01` Dipisah · `EN-02`–`EN-05` Out of Scope PWA) ⬜

> _Catatan Lingkup:_ Hanya `EN-01` yang relevan dilanjutkan sebagai paket CLI/_build-time_ terpisah di luar aplikasi browser; `EN-02` s/d `EN-05` berstatus **🚫 Out of Scope PWA** karena membutuhkan server multi-user, hardware pabrik/FT-NIR, dan regulasi hukum dinamis.

- 🔧 **`EN-01` Paket Engine Terpisah (`@openformul/core`) & Dataset Crawler _(Dipisah ke CLI/NPM Build-Time)_:** Rilis CLI/NPM bebas DOM untuk riset Python/Jupyter/Node + skrip kurasi statis dataset pakan terbuka (tidak dijalankan di runtime PWA browser)
- 🚫 **`EN-02` Multi-Blend, Multi-Plant, Silo Allocation & Multi-Lot Blending _(Out of Scope PWA)_:** Optimasi blok diagonal lintas formula dengan konservasi stok multi-periode $I_{j,p,t}$, _tight Big-M_ bin/silo, serta pencampuran _multi-lot_ (memerlukan database server multi-user & MILP skala pabrik)
- 🚫 **`EN-03` Cross-Formula Procurement Matrix (Purchase Assistant) _(Out of Scope PWA)_:** Evaluasi harga penawaran pemasok secara serentak di seluruh formula aktif pabrik (memerlukan inventaris/kontrak terpusat lintas departemen)
- 🚫 **`EN-04` Loop Tertutup QC Lab / FT-NIR ke Stokastik (EWMA) _(Out of Scope PWA)_:** _Base vs Overlay Ingredients_ lintas pabrik, _Sample Basket_, & koneksi instrumen FT-NIR (memerlukan integrasi hardware lab/LIMS pabrik)
- 🚫 **`EN-05` Batch Sequencing Anti-Carryover (GLSP/ATSP) & Label SNI/EU/AAFCO _(Out of Scope PWA)_:** Penjadwalan urutan produksi mixer pabrik & generator label hukum lintas negara (memerlukan jadwal mesin mixer & pemeliharaan regulasi hukum dinamis)
