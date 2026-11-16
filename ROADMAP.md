# 🗺️ Roadmap Open Formul

Status: ⬜ belum dimulai · 🟨 berjalan · ✅ selesai

## Fase 1 — Pondasi Proyek, Skema Data & UI Prototype Cross-Platform ✅

- ✅ Struktur repositori, dokumentasi open-source, dan AI agent skills
- ✅ Scaffold Vite + React + TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + Tailwind CSS v4
- ✅ ESLint, Prettier, Vitest (`@testing-library/react`), dan GitHub Actions CI ([ci.yml](.github/workflows/ci.yml))
- ✅ Skema data kanonik `Ingredient`, `Nutrient`, `Requirement`, `FormulationConfig`, `FormulationResult`, `Recipe`, `UserPreferences` ([data-schema](docs/data-schema.md))
- ✅ Sampel database bahan pakan JSON (`src/data/*.sample.json`) & dataset kerja interaktif (`src/data/mock-state.ts`)
- ✅ **UI Prototype Lintas Perangkat (`CORE-01` s/d `FE-10`):** Adaptive AppShell (Desktop Sidebar + Mobile Bottom Nav/Drawer), 3-Panel Workbench, 3-Step Mobile Stepper, Input Desimal Lokal (`locale-number`), Mode Optimasi 1–5, Advance (AA/NDF/ANF + SID/AvP), Anti-Nol, Batch Mixer, Grafik SVG, Shadow Price/What-If, Database Bahan/Ternak, Resep/Ekspor, & Pengaturan Bahasa/Tema
- ✅ Integrasi HiGHS WASM (`highs`) di Web Worker (`ENG-01` s/d `ENG-08`)
- ✅ Model builder LP, L1 elastik, & verifikasi pasca-solve (`1e-6`) terhadap hitungan manual

**Catatan:** Pondasi UI & engine optimasi Linear Programming nyata (`highs` WebAssembly di Web Worker) telah terintegrasi penuh dan terverifikasi terhadap benchmark manual (2 bahan & multi-bahan).

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
- ✅ Ekspansi penuh pustaka bahan & standar kebutuhan ruminansia beserta arsip referensi lokal (`docs/references/`): **304 bahan** [`hartadi-feeds.ts`](src/data/hartadi-feeds.ts) (14 kurasi awal + 246 bahan Tabel 12 tergabung Tabel 13/14 + 44 suplemen mineral Tabel 15), **82 profil Kearl 1982** (`KEARL_REQUIREMENTS`: 6 profil awal + 76 profil Tabel 14), **24 profil sapi perah NRC 1988** (`NRC_1988_DAIRY_REQUIREMENTS`), serta _windowing_ progresif katalog `> 50` item (`Tampilkan Semua`)

## Fase 4 — PWA Penuh & Ekspor/Impor 🟨

- ✅ Service Worker + manifest, instalable, offline penuh (`vite-plugin-pwa`, _precache_ aset + `highs-*.wasm`)
- ✅ Penyimpanan IndexedDB via `idb` (`open-formul-db` v1: `ingredients`, `requirements`, `recipes`, `active_session`, `preferences`) + fallback memori
- ✅ Ekspor/impor `.feed.json` (kanonik `schemaVersion: 1`), CSV partial-merge, Excel `.xlsx` (OOXML), & Excel/Sheets TSV Multi-Cell Paste
- ✅ Ekspor laporan PDF 1.4 offline (_PDF Lembar Formula Lengkap_ & _PDF Print Batch Only_ dengan gerbang status aman)
- 🟨 Internasionalisasi (Bahasa Indonesia & English)

## Ide Masa Depan

- Formulasi multi-campuran (_multi-blend_)
- Formulasi stokastik untuk variasi kandungan bahan
- Sinkronisasi opsional antar perangkat
