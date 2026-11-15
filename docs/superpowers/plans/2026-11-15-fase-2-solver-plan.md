# Fase 2 Solver HiGHS & Brand Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengintegrasikan engine optimasi Linear Programming HiGHS WASM nyata (`ENG-01`–`ENG-08`) ke Web Worker + antarmuka Open Formul secara offline-first, serta mengganti seluruh penamaan `Open Formu` / `Open-Formu` menjadi `Open Formul` / `open-formul`.

**Architecture:** Domain murni (`src/utils/basis.ts`, `src/utils/equations.ts`, `src/solver/*`) bebas React dan dapat diuji langsung terhadap instance `highs` di Node/Vitest. Di browser, `solverClient.ts` memanggil `highs.worker.ts` dengan pembatalan `requestId` usang dan debounce di `usePrototypeStore`.

**Tech Stack:** TypeScript strict, React 19, Vite 8, Tailwind CSS v4, HiGHS WASM (`highs`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-15-fase-2-solver-design.md`

## Global Constraints

- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`; dilarang `any`, `as unknown as`, dan `@ts-ignore` tanpa justifikasi.
- Tidak ada panggilan jaringan runtime; file `.wasm` dari `highs` wajib dibundel lokal oleh Vite.
- Jangan mencampur basis As-Fed dan Bahan Kering (BK) dalam satu matriks LP; konversi harga BK memakai `c^DM = c^AF * 100 / BK`.
- Verifikasi pasca-solve wajib memvalidasi `|Σ x_i - 1| < 1e-6` dan setiap batas nutrien dalam toleransi `1e-6`.
- Jangan menamai bahan mentah di CPLEX LP; gunakan nama variabel aman `x0`, `x1`, … dan format angka dengan `Number.prototype.toString()` tanpa koefisien 0.
- Status solver selain `Optimal` tidak boleh ditampilkan sebagai solusi valid; Mode Relaksasi Elastik hanya menandai `near_feasible` dengan `costPerKg` dihitung murni dari `Σ x_i c_i` (tanpa penalti).
- `AGENTS.md` §9 & `docs-sync-maintainer`: jaga animasi/hover/shimmer, audit aksesibilitas, dan perbarui `README.md`, `ROADMAP.md`, serta `docs/` setelah selesai.

## Review Focus

- `dryMatter <= 0` atau `dryMatter > 100` pada bahan impor/custom: harus ditolak di validasi/precheck (`MIN_GT_MAX` / range error), tidak memicu pembagian nol (`Infinity`/`NaN`).
- Bahan bernilai `null` (N/A) pada nutrien non-wajib vs Mode Advance: di matriks LP diperlakukan hati-hati (`null` tidak diperlakukan diam-diam sebagai `0` saat Advance aktif tanpa memunculkan warning `ADVANCE_NULL_DATA`).
- Kendala rasio `Ca:P` dengan semua bahan bernilai `p = 0`: dicegah dari kondisi `0/0` palsu dan tetap konsisten saat relaksasi elastik.
- Pembatalan balapan request (`requestId` usang) saat pengguna mengetik cepat: balasan worker dengan `requestId` lama wajib diabaikan agar hasil usang tidak menimpa state terbaru.
- Mode 5 (_Presisi Tinggi_) pada target rentang tanpa `idealTarget`: wajib memakai titik tengah `(min + max) / 2` sehingga tidak melakukan _over-dosing_ protein/lemak hingga batas maksimum.

---

### Task 1: Domain Utilities — Basis Normalization & Nutritional Equations (`ENG-01`, `ENG-03`)

**Files:**

- Create: `src/utils/basis.ts`
- Create: `src/utils/equations.ts`
- Test: `tests/basis-equations.test.ts`

**Interfaces:**

- Produces in `src/utils/basis.ts`:
  - `convertNutrientValue(value: number | null, fromBasis: Basis, toBasis: Basis, dryMatterPct: number): number | null`
  - `convertPriceToModelBasis(pricePerKgAsFed: number, targetBasis: Basis, dryMatterPct: number): number`
  - `normalizeIngredientToBasis(ingredient: Ingredient, targetBasis: Basis): Ingredient`
  - `computeAsFedFractions(items: readonly { readonly ingredient: Ingredient; readonly fraction: number }[], modelBasis: Basis): ReadonlyMap<string, number>`
- Produces in `src/utils/equations.ts`:
  - `computeElectrolyteBalance(mineralsMgPerKg: { readonly na?: number; readonly k?: number; readonly cl?: number; readonly s?: number }): { readonly deb: number; readonly dcad: number }`
  - `computePoultryMeWpsaMjPerKg(proximatePct: { readonly cp: number; readonly cfat: number; readonly sugar: number; readonly starch: number }): number`
  - `computePoultryMeFromProximateKcal(proximatePct: { readonly cp: number; readonly cfat: number; readonly sugar: number; readonly starch: number }): number`
  - `computeSwineDigestibleFat(eePct: number, ndfPct: number): number`

- [ ] **Step 1: Write failing tests in `tests/basis-equations.test.ts`** (menguji konversi jagung PK 8,5% AF BK 86% -> 9,8837% DM, harga BK, proporsi timbang As-Fed hijauan BK 22% vs konsentrat BK 89%, validasi `dryMatter <= 0`, serta perhitungan dEB/DCAD L-Lysine HCl & clamp `>= 0` pada persamaan energi/lemak babi).
- [ ] **Step 2: Run `npm run test -- tests/basis-equations.test.ts`** dan pastikan gagal karena modul belum ada.
- [ ] **Step 3: Implement `src/utils/basis.ts` and `src/utils/equations.ts`** dengan tipe ketat `readonly`.
- [ ] **Step 4: Run `npm run test -- tests/basis-equations.test.ts`** dan pastikan semua kasus lulus.

---

### Task 2: Dependency Setup (`highs`) & Pre-Check / LP Model Builder / LP Formatter (`ENG-02`, `ENG-04`, `ENG-05`)

**Files:**

- Modify: `package.json` (install `highs` + check WASM export paths)
- Create: `src/solver/types.ts`
- Create: `src/solver/precheck.ts`
- Create: `src/solver/buildModel.ts`
- Create: `src/solver/toLpString.ts`
- Test: `tests/solver-model.test.ts`

**Interfaces:**

- Produces in `src/solver/precheck.ts`:
  - `runPrecheck(ingredients: readonly Ingredient[], requirement: Requirement, config: FormulationConfig): PrecheckResult`
- Produces in `src/solver/buildModel.ts`:
  - `buildLpModel(ingredients: readonly Ingredient[], requirement: Requirement, config: FormulationConfig, options?: BuildModelOptions): LpModel`
- Produces in `src/solver/toLpString.ts`:
  - `toLpString(model: LpModel): string`

- [ ] **Step 1: Install `highs` via `npm install highs` dan verifikasi struktur modul `node_modules/highs`** (cek file JS & `.wasm` agar import worker akurat offline).
- [ ] **Step 2: Write failing tests in `tests/solver-model.test.ts`** menguji: deteksi `MIN_GT_MAX`, `INCLUSION_SUM_EXCEEDS_100`, `INCLUSION_MAX_UNDER_100`, `NUTRIENT_UNREACHABLE`, `ANTI_NOL_CONFLICT`, `ADVANCE_NULL_DATA`, konversi nama variabel aman `x0..xn`, linearisasi rasio `Ca:P`, kendala deviasi Mode 5 midpoint, dan baris slack elastik L1.
- [ ] **Step 3: Run `npm run test -- tests/solver-model.test.ts`** dan verifikasi gagal (RED).
- [ ] **Step 4: Implement `src/solver/types.ts`, `precheck.ts`, `buildModel.ts`, `toLpString.ts`**.
- [ ] **Step 5: Run `npm run test -- tests/solver-model.test.ts`** dan verifikasi lulus (GREEN).

---

### Task 3: HiGHS Result Parser, Dual Extractor, Verification (`1e-6`), Price Ranging, & Solver Orchestrator (`ENG-06`, `ENG-07`)

**Files:**

- Create: `src/solver/highsTypes.ts`
- Create: `src/solver/parseResult.ts`
- Create: `src/solver/solveFormulation.ts`
- Create: `src/solver/highsNodeRunner.ts`
- Test: `tests/solver-highs.test.ts`

**Interfaces:**

- Produces in `src/solver/parseResult.ts`:
  - `parseHighsResult(model: LpModel, rawSolution: HighsSolution, ingredients: readonly Ingredient[], requirement: Requirement, config: FormulationConfig, precheckWarnings: readonly ConflictDiagnostic[]): FormulationResult`
- Produces in `src/solver/solveFormulation.ts`:
  - `solveFormulationWithRunner(ingredients: readonly Ingredient[], requirement: Requirement, config: FormulationConfig, solveLp: LpRunner, options?: SolveOptions): Promise<FormulationResult>`
- Produces in `src/solver/highsNodeRunner.ts`:
  - `solveLpInNode(lpString: string): Promise<HighsSolution>`

- [ ] **Step 1: Write failing integration/unit tests in `tests/solver-highs.test.ts`** menguji langsung HiGHS WASM di Node:
  - Contoh acuan manual 2 bahan ([docs/formulation-math.md](../formulation-math.md)): Jagung PK 8,5% Rp5.500 + SBM PK 44% Rp8.200 target PK = 20% → `x_corn ≈ 0,6761`, `x_sbm ≈ 0,3239`, `cost ≈ Rp6.374/kg`, `|Σx - 1| < 1e-6`.
  - Inklusi tetap (premix 0,5%).
  - Preset lengkap `MOCK_REQUIREMENTS[0]` (Broiler Starter) dengan `MOCK_INGREDIENTS` + rasio `Ca:P`.
  - Preset Sapi Potong (`dry_matter`) dengan Rumput Gajah BK 22% & konversi `asFedFraction`.
  - Mode 1 (Hemat) vs Mode 5 (Presisi Tinggi mendekati midpoint tanpa over-dosing biaya).
  - Infeasible murni vs Mode Relaksasi Elastik (`near_feasible`, biaya riil bebas penalti, deviasi terukur).
  - Ekstraksi Shadow Price nutrisi terpisah dari Bound Duals, Opportunity Cost bahan 0%, Price Range, dan What-If manual lock.
- [ ] **Step 2: Run `npm run test -- tests/solver-highs.test.ts`** dan verifikasi gagal (RED).
- [ ] **Step 3: Implement `highsTypes.ts`, `parseResult.ts`, `solveFormulation.ts`, `highsNodeRunner.ts`**.
- [ ] **Step 4: Run `npm run test -- tests/solver-highs.test.ts`** dan verifikasi semua skenario lulus akurat.

---

### Task 4: Web Worker, Browser Client, & Live UI Store Integration (`ENG-08`)

**Files:**

- Create: `src/solver/highs.worker.ts`
- Create: `src/solver/solverClient.ts`
- Modify: `src/solver/index.ts`
- Modify: `src/hooks/use-prototype-store.ts`
- Modify: `src/components/formulation/WorkbenchToolbar.tsx`
- Modify: `src/components/formulation/FormulationWorkbench.tsx`
- Modify: `src/components/analytics/ResultsPanel.tsx`
- Modify: `src/components/analytics/ShadowPriceTab.tsx`
- Test: `tests/ui/prototype-flow.test.tsx` (tambahkan cakupan status live/skenario)

**Interfaces:**

- Produces in `src/solver/solverClient.ts`:
  - `solveFormulation(ingredients: readonly Ingredient[], requirement: Requirement, config: FormulationConfig): Promise<FormulationResult>`
  - `prewarmSolver(): void`
- Modifies `PrototypeStore`: menambahkan `readonly isSolving: boolean` dan menukar kalkulasi `"auto"` dari `evaluateMockFormulation` menjadi orkestrasi HiGHS debounced dengan pembatalan `requestId` usang (sambil mendukung fallback runner langsung di lingkungan tanpa Web Worker seperti JSDOM/test).

- [ ] **Step 1: Add UI test assertion** di `tests/ui/prototype-flow.test.tsx` untuk memverifikasi mode live default menghasilkan optimasi `Optimal` dari HiGHS pada Broiler Starter dan merespons perubahan input.
- [ ] **Step 2: Implement `highs.worker.ts`, `solverClient.ts`, dan ekspor publik di `src/solver/index.ts`**.
- [ ] **Step 3: Connect `usePrototypeStore` & komponen UI** (`isSolving` skeleton shimmer / lencana `"Solver HiGHS (Live)"`, badge `"HiGHS Simplex"` di `ShadowPriceTab` saat bukan demo override).
- [ ] **Step 4: Verify `tests/ui/prototype-flow.test.tsx` dan `vite build` membundel worker + `.wasm` secara lokal**.

---

### Task 5: Brand Rename `Open Formu` / `Open-Formu` → `Open Formul` / `open-formul` & Docs Sync

**Files:**

- Modify: `package.json`, `package-lock.json` (root name)
- Modify: `index.html`, `src/index.css`, `src/components/layout/AppShell.tsx`, `src/components/layout/MobileNavDrawer.tsx`, `src/types/index.ts`
- Modify: `README.md`, `ROADMAP.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `prd.md`, `docs/architecture.md`, `.gemini/GEMINI.md`, `.github/ISSUE_TEMPLATE/bug_report.md`, `.agent/skills/{docs-sync-maintainer,feed-formulation-domain,ui-formulation-grid}/SKILL.md`
- Modify: `tests/ui/prototype-flow.test.tsx`

- [ ] **Step 1: Update penamaan `Open Formul` / `open-formul`** di kode, konfigurasi, dan seluruh dokumentasi/skill repositori.
- [ ] **Step 2: Sinkronkan [ROADMAP.md](../../ROADMAP.md), [README.md](../../README.md), dan [docs/architecture.md](../architecture.md)** (status Fase 1–2 `ENG-01`–`ENG-08` selesai, deskripsi modul `src/solver` & `src/utils/basis.ts`/`equations.ts`).
- [ ] **Step 3: Jalankan verifikasi akhir lengkap:** `prettier --write` + `--check`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, serta verifikasi live preview di browser headless `playwright-cli` (termasuk memastikan worker & `.wasm` memuat dengan `0` console error).
