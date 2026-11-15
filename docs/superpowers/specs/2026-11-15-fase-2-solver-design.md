# Desain Sistem Fase 2 — Engine Optimasi HiGHS WASM & Rebranding Open Formul

**Tanggal:** 2026-11-15
**Status:** Disetujui untuk Implementasi (`Pendekatan A`, `Opsi 1`, rename `Open Formu -> Open Formul`)
**Dokumen Acuan:** [prd.md](../../prd.md) (`ENG-01` s/d `ENG-08`), [ROADMAP.md](../../ROADMAP.md), [docs/formulation-math.md](../formulation-math.md)

## 1. Tujuan & Lingkup

1. Mengganti evaluator simulasi Fase 1 (`evaluateMockFormulation`) dengan **engine optimasi Linear Programming nyata (`highs` WebAssembly)** yang berjalan **100% offline-first** dan **non-blocking di Web Worker**.
2. Memenuhi seluruh fitur inti Fase 2:
   - Normalisasi basis murni **As-Fed ↔ Bahan Kering (BK/DM)** dan konversi proporsi penimbangan As-Fed ([basis.ts](../../../src/utils/basis.ts)).
   - Persamaan nutrisi dasar **dEB / DCAD** dan regresi energi unggas/babi berpenjepit `>= 0` ([equations.ts](../../../src/utils/equations.ts)).
   - **Pre-check cepat** sebelum solver (`MIN_GT_MAX`, `Σ min > 1`, `Σ max < 1`, `NUTRIENT_UNREACHABLE`, `ANTI_NOL_CONFLICT`, `ADVANCE_NULL_DATA`).
   - **LP Model Builder** (CPLEX LP) mendukung **5 Mode Optimasi** (Mode 1 _least-cost_ murni hingga Mode 5 _Presisi Tinggi_ deviasi minimum terhadap _target midpoint_ tanpa faktor harga), **Mode Advance** (`SID` & `AvP`), **rasio nutrien terlinearisasi** (mis. `Ca:P`), **batas grup bahan**, **Anti-Nol**, **What-If Manual Lock**, dan **Mode Relaksasi Elastik** ($\ell_1$) dengan pemisahan biaya riil dari penalti.
   - **Parser & Verifikator Pasca-Solve** toleransi `1e-6`, pemisahan **Shadow Price** nutrisi dari **Bound Duals** batas inklusi, **Opportunity Cost / Break-even Price** bahan `0%`, serta estimasi cepat **Price Range** untuk bahan terpakai.
   - Integrasi live ke UI (`usePrototypeStore` debounced dengan pembatalan `requestId` usang), tetap memakai `"Solver HiGHS (Live)"` secara default dan mempertahankan opsi simulasi demo pada dropdown.
3. Mengubah seluruh nama merek aplikasi dari **Open Formu / Open-Formu** menjadi **Open Formul** (tampilan UI, judul HTML, skill, dokumentasi, test) dan **`open-formul`** di `package.json` / key teknis.

## 2. Non-Goals & Anti-Goals

- **Non-Goals (Fase 3–4):** Belum mencakup persistensi IndexedDB (`db.ts`), Service Worker precache (`vite-plugin-pwa`), generator ekspor file `.xlsx`/`.pdf` penuh, maupun formulasi stokastik ($\sigma$) / kurva enzim / Multi-Blend MILP.
- **Anti-Goals:**
  - Tidak pernah memblokir thread UI untuk kalkulasi solver di browser.
  - Tidak pernah mencampur basis As-Fed dan BK dalam satu matriks LP.
  - Tidak pernah menampilkan status selain `"optimal"` atau `"near_feasible"` (ketika elastik aktif) sebagai solusi valid, maupun membocorkan penalti elastik ke `costPerKg`.
  - Tidak pernah menganggap nilai `null` sebagai `0` secara diam-diam saat nutrien _Advance_ aktif.

## 3. Arsitektur & Pilihan Pendekatan

**Pendekatan Terpilih (Pendekatan A — Hybrid LP Goal-Programming + Elastik di Web Worker & Price Range Terbatas):**

- Alih-alih menjalankan solver di main thread (membekukan UI) atau melakukan full parametric sweep puluhan kali pada setiap ketikan (lambat di perangkat mobile), setiap perubahan state di-debounce `220 ms`, melewati validasi `precheck.ts`, disusun menjadi model CPLEX LP oleh `buildModel.ts` + `toLpString.ts`, dan diselesaikan sekali di `highs.worker.ts`.
- Untuk Mode 2–5, kendala deviasi ter-normalisasi ($d_k^+, d_k^- \ge 0$ terhadap `idealTarget` atau midpoint rentang) dimasukkan ke fungsi tujuan linear sehingga skala satuan (`kcal/kg` vs `%`) seimbang.
- Jika solver mengembalikan `Infeasible` dan `enableElasticFallback === true`, model dibangun ulang dengan variabel slack elastik berpenalti dominan $M \gg c_{\max}$, diselesaikan, lalu biaya bahan dihitung ulang murni dari $\sum x_i c_i$.
- Rentang harga aman (_Price Range_) dihitung terukur menggunakan pencarian biner terbatas (`<= 6` iterasi arah turun & naik) hanya untuk bahan aktif terpilih, dengan batas atas `price <= 1e7` bila tak terbatas, sehingga total eksekusi tetap sangat cepat dan dapat dimatikan lewat opsi pada uji spesifik.

## 4. Kontrak Modul & Verifikasi

- Seluruh fungsi domain (`src/utils/basis.ts`, `src/utils/equations.ts`, `src/solver/*` kecuali worker wrapper) murni, bebas DOM/React, mematuhi `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, serta menggunakan `readonly`.
- Verifikasi matematis wajib lewat Vitest terhadap HiGHS nyata di Node:
  1. Kasus acuan manual 2 bahan ([docs/formulation-math.md](../formulation-math.md)): Jagung 67,61% + SBM 32,39% = Rp6.374/kg untuk target PK = 20%.
  2. Konversi hijauan BK 22% (`dry_matter`) ↔ penimbangan As-Fed.
  3. Rasio `Ca:P` terlinearisasi, Mode Optimasi 1 vs Mode 5 (tanpa _over-dosing_), Anti-Nol, Mode Advance + `ADVANCE_NULL_DATA`, dan What-If Lock.
  4. Infeasible pre-check & solver vs Mode Relaksasi Elastik (`near_feasible` + deviasi terukur).
  5. Seluruh UI integration test [prototype-flow.test.tsx](../../../tests/ui/prototype-flow.test.tsx), `tsc --noEmit`, `eslint .`, `prettier --check`, dan `vite build`.
