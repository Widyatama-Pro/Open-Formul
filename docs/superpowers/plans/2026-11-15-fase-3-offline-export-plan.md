# Fase 3 (Batch Opsi A) — PWA Offline, IndexedDB & Ekspor/Impor Nyata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan penyimpanan persisten **IndexedDB (`idb`)**, **PWA 100% offline (`vite-plugin-pwa` dengan precache `highs.wasm`)**, serta pertukaran data nyata **`.feed.json`**, **CSV**, **OOXML `.xlsx`**, **PDF 1.4 (`full` & `batch_only`)**, dan **Paste TSV** tanpa dependensi runtime berat.

**Architecture:** Seluruh validator batas sistem (`src/utils/validators.ts`, `ingredientCsvImport.ts`, `tsvPaste.ts`, `recipeTransfer.ts`) serta generator dokumen (`exportCsvXlsx.ts`, `exportPdf.ts`) ditulis sebagai fungsi murni TypeScript bebas React/DOM agar dapat diuji langsung di Vitest. Lapisan persistensi `src/storage/db.ts` membungkus IndexedDB (`open-formul-db`) dengan fallback aman non-IDB, diorkestrasi oleh `usePrototypeStore` secara non-destruktif terhadap katalog bahan dan preset induk.

**Tech Stack:** TypeScript strict, React 19, Vite 8, Tailwind CSS v4, `idb`, `vite-plugin-pwa` (Workbox `generateSW`), `fake-indexeddb` (dev/test), Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-15-fase-3-offline-export-design.md](../specs/2026-11-15-fase-3-offline-export-design.md)

## Global Constraints

- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`; dilarang `any`, `as unknown as`, dan `@ts-ignore` tanpa justifikasi.
- Tidak ada library eksternal berat (`xlsx`/SheetJS, `jspdf`); seluruh generator `.xlsx` dan PDF ditulis murni TypeScript.
- Tidak memakai `localStorage` untuk menyimpan data bahan, resep, atau preferensi; wajib `IndexedDB` (`open-formul-db`) via `idb`.
- `vite-plugin-pwa` Workbox WAJIB menetapkan `maximumFileSizeToCacheInBytes: 6 * 1024 * 1024` agar `highs-*.wasm` (~3,53 MB) masuk precache manifest `dist/sw.js`.
- Seluruh impor eksternal wajib membedakan sel kosong/`null` (**N/A**) dari angka `0`, dan menolak baris bahan tanpa `source` atau `dryMatter ∉ (0, 100]` atau harga negatif.
- Gerbang status ekspor: `.feed.json` selalu aktif; `PDF Print Batch Only` **wajib `status === "optimal"`** dan **dilarang keras** memuat harga/biaya/nutrien; CSV/`.xlsx`/`PDF full` aktif pada `optimal` & `near_feasible` (berpenanda kompromi) serta nonaktif pada `infeasible`/`error`.
- `AGENTS.md` §9 & `docs-sync-maintainer`: jaga animasi/hover/shimmer, audit UI desktop/mobile via `playwright-cli`, dan sinkronkan `README.md`, `ROADMAP.md`, serta `docs/`.

## Review Focus

- Impor `.feed.json` atau CSV dengan `dryMatter <= 0`, `dryMatter > 100`, `pricePerKg < 0`, `schemaVersion !== 1`, atau JSON/CSV korup: harus ditolak dengan pesan error eksplisit tanpa crash maupun mutasi state/DB.
- Impor bahan _partial merge_ (mis. hanya proksimat `cp`, `ee`, `cf` dengan beberapa kolom kosong dan angka `"0"`): harus memperbarui field yang diisi saja tanpa menghapus `lys`, `met`, `stdDev`, `phytateP`, atau `priceOverride` lama, serta tetap menyimpan `"0"` sebagai `0` dan sel kosong sebagai `null`.
- Memuat resep (`loadRecipe`) atau mengimpor `.feed.json` dengan `id` preset induk (`"broiler-starter"`) yang targetnya dimodifikasi dan `config` dihilangkan: bahan katalog lain tidak terhapus (hanya `isActive: false`), target resep dimuat ke `activeRequirementOverride` tanpa menimpa preset master, `config` fallback ke `DEFAULT_CONFIG`, dan kolisi `recipe.id` saat impor menghasilkan ID unik baru.
- PDF `batch_only` vs `full`: output PDF `batch_only` wajib memiliki header `%PDF-1.4`, daftar bahan & bobot `weightKg`, serta **nol** kemunculan `"Rp"`, `"/kg"`, nama/nilai nutrien, atau `"Shadow Price"`; tombol `PDF Batch Only` harus nonaktif pada `near_feasible` dan `infeasible`.
- Paste TSV pada sel `Harga/kg` di `IngredientDesktopTable` memakai angka Indonesia (`"5.500,25\t89,5\n"`): wajib memperbarui `priceOverride` (bukan `pricePerKg`), menghapus override bila sel harga ditempel kosong tanpa menyisipkan `{ priceOverride: undefined }`, dan tetap mengizinkan paste skalar normal 1 nilai.

---

### Task 1: Boundary Validators, `.feed.json` Transfer, Partial CSV Importer, & TSV Grid Paste (`EXP-01`, Impor/Paste `EXP-02`)

**Files:**

- Create: `src/utils/validators.ts`
- Create: `src/storage/recipeTransfer.ts`
- Create: `src/utils/ingredientCsvImport.ts`
- Create: `src/utils/tsvPaste.ts`
- Test: `tests/validators.test.ts`

**Interfaces:**

- Consumes:
  - Canonical types from `src/types/index.ts` (`Ingredient`, `Requirement`, `FormulationConfig`, `FormulationResult`, `Recipe`, `Basis`, `IngredientCategory`)
  - `DEFAULT_CONFIG` from `src/data/mock-state.ts`
  - `parseLocaleDecimal` from `src/utils/locale-number.ts`
- Produces:
  - In `src/utils/validators.ts`:
    - `export interface ValidationResult<T> { readonly ok: true; readonly data: T; readonly warnings: readonly string[] } | { readonly ok: false; readonly error: string }`
    - `export function validateIngredientInput(raw: unknown): ValidationResult<Ingredient>`
    - `export function validateRequirementInput(raw: unknown): ValidationResult<Requirement>`
    - `export function validateRecipePayload(raw: unknown, fallbackConfig?: FormulationConfig): ValidationResult<Recipe>`
  - In `src/storage/recipeTransfer.ts`:
    - `export function serializeRecipeFeedJson(recipe: Recipe): string`
    - `export function buildRecipeExportFilename(name: string, date?: Date): string`
    - `export function parseAndValidateFeedJson(jsonText: string, existingRecipeIds?: ReadonlySet<string>): ValidationResult<{ readonly recipe: Recipe; readonly wasIdRenamed: boolean }>`
  - In `src/utils/ingredientCsvImport.ts`:
    - `export interface PartialIngredientImportEntry { readonly matchKey: string; readonly ingredient: Ingredient; readonly providedKeys: readonly (keyof Ingredient)[]; readonly providedNutrientIds: readonly string[] }`
    - `export function parseIngredientsImportText(rawText: string, options?: { readonly defaultSource?: string }): ValidationResult<readonly PartialIngredientImportEntry[]>`
    - `export function mergeImportedIngredients(existing: readonly Ingredient[], entries: readonly PartialIngredientImportEntry[]): { readonly ingredients: readonly Ingredient[]; readonly addedCount: number; readonly updatedCount: number }`
  - In `src/utils/tsvPaste.ts`:
    - `export type GridPasteColumnKey = "price" | "dm" | "min" | "max" | string`
    - `export interface IngredientPastePatch { readonly ingredientId: string; readonly patch: Partial<Ingredient>; readonly clearPriceOverride?: boolean }`
    - `export function isMultiCellTsv(clipboardText: string): boolean`
    - `export function buildTsvPastePatches(options: { readonly text: string; readonly startRow: number; readonly startCol: GridPasteColumnKey; readonly orderedCols: readonly GridPasteColumnKey[]; readonly ingredients: readonly Ingredient[] }): { readonly updates: readonly IngredientPastePatch[]; readonly skippedCells: number }`

- [ ] **Step 1: Write failing tests in `tests/validators.test.ts`**
      Menguji:
  1. `parseAndValidateFeedJson`: sukses round-trip `.feed.json` termasuk saat `config` dihilangkan (fallback ke `DEFAULT_CONFIG`) & rename `recipe.id` otomatis bila bentrok dengan `existingRecipeIds`; menolak `schemaVersion: 2`, `dryMatter: 0`, `dryMatter: 105`, `pricePerKg: -100`, `source: ""`, JSON rusak, dan menjaga `nutrients.tannin === 0` vs `null`.
  2. `parseIngredientsImportText` + `mergeImportedIngredients`: mem-parse CSV pemisah `;` Excel Indonesia (`Nama Bahan;Harga/kg;BK %;Sumber;PK;Ca`), menangani `"5.500"` harga vs `"88,5"` BK vs sel kosong `""` -> `null` vs `"0"` -> `0`, menerapkan `defaultSource` bila kolom sumber kosong namun menolak jika keduanya kosong, dan melakukan _partial merge_ tanpa menghapus `lys`/`stdDev`/`phytateP`/`priceOverride` pada bahan cocok.
  3. `buildTsvPastePatches`: tempelan 2x3 mulai kolom `price` menulis `priceOverride` (`"5.500,25"` -> `5500.25`), sel harga kosong menandai `clearPriceOverride: true`, sel nutrien kosong menyetel `null`, `"0"` menjadi `0`, dan `isMultiCellTsv("5500")` bernilai `false`.

- [ ] **Step 2: Run `npm run test -- tests/validators.test.ts`**
      Expected: FAIL karena modul validator/transfer/import/paste belum ada.

- [ ] **Step 3: Implement `src/utils/validators.ts`, `src/storage/recipeTransfer.ts`, `src/utils/ingredientCsvImport.ts`, `src/utils/tsvPaste.ts`**
  - Terapkan helper pure type guard (`isRecord`, `asFiniteNumber`, `asOptionalFinite`) bebas `any`.
  - Pastikan alias header CSV mencakup key kanonik maupun header Indonesia/Inggris umum (`nama`, `nama bahan`, `kategori`, `harga`, `harga/kg`, `bk`, `bk %`, `basis`, `sumber`, `source`, `pk`, `protein kasar`, `me`, `tdn`, `ee`, `lemak kasar`, `cf`, `serat kasar`, `ca`, `p`, dst.).

- [ ] **Step 4: Run `npm run test -- tests/validators.test.ts` & `npm run typecheck`**
      Expected: PASS semua assertions dan 0 error TS.

- [ ] **Step 5: Commit**
      `git add src/utils/validators.ts src/storage/recipeTransfer.ts src/utils/ingredientCsvImport.ts src/utils/tsvPaste.ts tests/validators.test.ts`
      `git commit -m "feat: add strict recipe/csv validators, partial merge import, and grid tsv paste"`

---

### Task 2: Zero-Dependency Document Generators — CSV, Multi-Sheet `.xlsx`, PDF 1.4 (`full` & `batch_only`), & Download Helper (`EXP-02`)

**Files:**

- Create: `src/storage/exportCsvXlsx.ts`
- Create: `src/storage/exportPdf.ts`
- Create: `src/utils/download.ts`
- Test: `tests/export-generators.test.ts`

**Interfaces:**

- Consumes:
  - `Ingredient`, `Nutrient`, `Requirement`, `FormulationConfig`, `FormulationResult`, `AppLanguage` from `src/types/index.ts`
  - `formatCurrencyIdr`, `formatNumberLocale` from `src/utils/locale-number.ts`
- Produces:
  - In `src/storage/exportCsvXlsx.ts`:
    - `export interface FormulationExportPayload { readonly title: string; readonly notes?: string; readonly ingredients: readonly Ingredient[]; readonly nutrients: readonly Nutrient[]; readonly requirement: Requirement; readonly config: FormulationConfig; readonly result: FormulationResult; readonly language?: AppLanguage }`
    - `export type ExportFormatKind = "feed_json" | "csv" | "xlsx" | "pdf_full" | "pdf_batch_only"`
    - `export function getExportAvailability(format: ExportFormatKind, result: FormulationResult): { readonly allowed: boolean; readonly isNearFeasibleWarning: boolean; readonly reason?: string }`
    - `export function generateFormulationCsv(payload: FormulationExportPayload): string` (starts with UTF-8 BOM `\uFEFF`, throws descriptive Error if `status === "infeasible" | "error"`, inserts `PERINGATAN: STATUS NEAR-FEASIBLE` row if `status === "near_feasible"`)
    - `export function generateFormulationXlsx(payload: FormulationExportPayload): Uint8Array` (valid multi-sheet ZIP/OOXML with 3 sheets: `Komposisi & Batch`, `Profil Nutrien`, `Analisis Sensitivitas`)
  - In `src/storage/exportPdf.ts`:
    - `export type PdfExportVariant = "full" | "batch_only"`
    - `export function generateFormulationPdf(payload: FormulationExportPayload, variant: PdfExportVariant): Uint8Array` (starts with `%PDF-1.4`, throws if `variant === "batch_only" && status !== "optimal"` or `status === "infeasible" | "error"`, normalizes WinAnsi strings cleanly, paginates A4 tables)
  - In `src/utils/download.ts`:
    - `export function triggerBlobDownload(filename: string, data: Uint8Array | string, mimeType: string): void`
    - `export function triggerBrowserPrint(): void`

- [ ] **Step 1: Write failing tests in `tests/export-generators.test.ts`**
      Menguji:
  1. `getExportAvailability`: pada `optimal` semua format `allowed: true`; pada `near_feasible` -> `pdf_batch_only` `allowed: false`, sedangkan `csv`/`xlsx`/`pdf_full` `allowed: true` + `isNearFeasibleWarning: true`; pada `infeasible` -> hanya `feed_json` `allowed: true`.
  2. `generateFormulationCsv`: BOM `\uFEFF`, RFC 4180 escaping koma/tanda kutip, memuat berat batch As-Fed & profil nutrien & shadow price, serta baris peringatan pada `near_feasible`.
  3. `generateFormulationXlsx`: diawali byte ZIP magic `0x50, 0x4b, 0x03, 0x04`, memuat nama file OOXML `[Content_Types].xml`, `xl/workbook.xml`, `xl/worksheets/sheet1.xml`, `sheet2.xml`, `sheet3.xml` dengan nilai angka dan nama bahan di dalamnya.
  4. `generateFormulationPdf`:
     - `full`: diawali `%PDF-1.4`, diakhiri `%%EOF`, memuat biaya `Rp`, nama bahan, bobot `kg`, profil nutrien, dan `Shadow Price` (serta watermark kompromi saat `near_feasible`).
     - `batch_only` (pada `optimal`): diawali `%PDF-1.4`, memuat nama bahan aktif, % penimbangan As-Fed, bobot batch `kg`, kotak cek `[ ]`, dan **0 kemunculan** `"Rp"`, `"Shadow Price"`, `"Protein Kasar"`, `"Energi Metabolis"`, `"Terpenuhi"`, maupun `"Target"`; melempar Error bila dipanggil pada `near_feasible` atau `infeasible`.

- [ ] **Step 2: Run `npm run test -- tests/export-generators.test.ts`**
      Expected: FAIL karena modul export belum ada.

- [ ] **Step 3: Implement `src/storage/exportCsvXlsx.ts`, `src/storage/exportPdf.ts`, and `src/utils/download.ts`**
  - Gunakan encoder UTF-8 (`TextEncoder`) & table CRC-32 standar pada builder ZIP Store `.xlsx`.
  - Di `exportPdf.ts`, simpan byte PDF mentah dengan encoding WinAnsi single-byte agar panjang `%%EOF` dan tabel `xref` byte offset 100% presisi sesuai spesifikasi PDF 1.4.

- [ ] **Step 4: Run `npm run test -- tests/export-generators.test.ts` & `npm run typecheck`**
      Expected: PASS seluruh assertions.

- [ ] **Step 5: Commit**
      `git add src/storage/exportCsvXlsx.ts src/storage/exportPdf.ts src/utils/download.ts tests/export-generators.test.ts`
      `git commit -m "feat: implement pure-ts csv, ooxml xlsx, and pdf 1.4 generators with status guards"`

---

### Task 3: IndexedDB Persistence Layer (`idb`) & Non-Destructive Store Integration (`STG-01`)

**Files:**

- Modify: `package.json` (`npm install idb` and `npm install -D fake-indexeddb`)
- Create: `src/storage/db.ts`
- Create: `src/storage/index.ts`
- Modify: `src/hooks/use-prototype-store.ts`
- Test: `tests/storage-db.test.ts`

**Interfaces:**

- Consumes:
  - `Ingredient`, `Requirement`, `Recipe`, `FormulationConfig`, `UserPreferences` from `src/types/index.ts`
  - `MOCK_INGREDIENTS`, `MOCK_REQUIREMENTS`, `MOCK_SAVED_RECIPES`, `DEFAULT_CONFIG`, `DEFAULT_PREFERENCES` from `src/data/mock-state.ts`
  - Helpers from Task 1 (`mergeImportedIngredients`, `parseAndValidateFeedJson`, `IngredientPastePatch`)
- Produces:
  - In `src/storage/db.ts`:
    - `export interface PersistedFormulationState { readonly id: "current"; readonly activeRequirementId: string; readonly activeRequirementOverride?: Requirement; readonly config: FormulationConfig; readonly updatedAt: string }`
    - `export interface OpenFormulSnapshot { readonly ingredients: readonly Ingredient[]; readonly requirements: readonly Requirement[]; readonly recipes: readonly Recipe[]; readonly preferences: UserPreferences; readonly formulationState: PersistedFormulationState; readonly storageMode: "indexeddb" | "memory" }`
    - `export function hydrateOrSeedDatabase(dbName?: string): Promise<OpenFormulSnapshot>`
    - `export function persistIngredients(items: readonly Ingredient[], dbName?: string): Promise<void>`
    - `export function persistRequirements(items: readonly Requirement[], dbName?: string): Promise<void>`
    - `export function persistRecipes(items: readonly Recipe[], dbName?: string): Promise<void>`
    - `export function persistPreferences(prefs: UserPreferences, dbName?: string): Promise<void>`
    - `export function persistFormulationState(state: PersistedFormulationState, dbName?: string): Promise<void>`
    - `export function resetWorkbenchToDefaults(dbName?: string): Promise<OpenFormulSnapshot>` (mereset bahan/preset/config ke default **sambil menjaga `recipes` pengguna tetap ada**)
    - `export function clearAndReseedDatabase(dbName?: string): Promise<OpenFormulSnapshot>` (menghapus semua store lokal lalu seed ulang bawaan)
  - Updated `PrototypeStore` in `src/hooks/use-prototype-store.ts`:
    - Menambah: `isHydrated`, `storageMode`, `activeRequirementOverride`, `hasActiveRequirementOverride`, `batchUpdateIngredients(updates: readonly IngredientPastePatch[])`, `importIngredients(entries: readonly PartialIngredientImportEntry[])`, `importFeedJson(fileText: string): ValidationResult<{ readonly recipe: Recipe; readonly wasIdRenamed: boolean }>`, `deleteRecipe(recipeId: string)`, `clearAllLocalData()`, `resetAllMock()` (memanggil `resetWorkbenchToDefaults`).
    - Memperbarui `loadRecipe(recipeId)` agar **non-destruktif** (`1A`): katalog `ingredients` yang tidak terpakai resep tetap tersimpan dengan `isActive: false`, harga/batas dari resep diterapkan, dan `found.requirement` dimuat ke `activeRequirementOverride` tanpa menimpa preset master `requirements`.

- [ ] **Step 1: Install `idb` and `fake-indexeddb`**
      Run: `npm install idb && npm install -D fake-indexeddb`

- [ ] **Step 2: Write failing tests in `tests/storage-db.test.ts`**
      Menggunakan `import "fake-indexeddb/auto";` (atau DB name unik per test):
  1. `hydrateOrSeedDatabase` pada DB kosong mengisi seluruh 5 store dengan dataset awal dan `storageMode === "indexeddb"`.
  2. Persistensi lintas instansi: setelah memanggil `persistIngredients`, `persistFormulationState` (termasuk `activeRequirementOverride`), `persistRecipes`, dan `persistPreferences`, pemanggilan ulang `hydrateOrSeedDatabase` mengembalikan perubahan pengguna (bukan data mock awal).
  3. `resetWorkbenchToDefaults` mengembalikan bahan/preset/config awal tetapi **tetap menyimpan** resep custom di store `recipes`.
  4. `clearAndReseedDatabase` menghapus semua resep custom dan mengembalikan kondisi awal penuh.
  5. Fallback aman ketika `indexedDB` tidak tersedia (`globalThis.indexedDB === undefined`) menghasilkan `storageMode === "memory"` tanpa throw.

- [ ] **Step 3: Run `npm run test -- tests/storage-db.test.ts`**
      Expected: FAIL karena `src/storage/db.ts` belum ada.

- [ ] **Step 4: Implement `src/storage/db.ts`, `src/storage/index.ts`, and update `src/hooks/use-prototype-store.ts`**
  - Perhatikan aturan ESLint `react-hooks/set-state-in-effect`: lakukan hidrasi asinkron melalui callback `.then(...)` pada `useEffect` mount, dan pastikan `debounced persist` hanya aktif sesudah `isHydrated === true` agar state default awal tidak menimpa data IDB sebelum hidrasi selesai!
  - Pada `updateConstraint`, bila `activeRequirementOverride` sedang aktif, perbarui `activeRequirementOverride`; bila tidak, perbarui preset di `requirements`. Ketika `selectPreset(id)` dipilih, bersihkan `activeRequirementOverride`.

- [ ] **Step 5: Run `npm run test -- tests/storage-db.test.ts` & `npm run test -- tests/ui/` & `npm run typecheck`**
      Expected: PASS seluruh unit & existing UI tests.

- [ ] **Step 6: Commit**
      `git add package.json package-lock.json src/storage/ src/hooks/use-prototype-store.ts tests/storage-db.test.ts`
      `git commit -m "feat: add IndexedDB persistence layer with non-destructive recipe loading"`

---

### Task 4: Full Offline PWA Setup (`vite-plugin-pwa`, Icons, `6 MiB` Workbox Limit, & Status Indicator) (`STG-02`)

**Files:**

- Modify: `package.json` (`npm install -D vite-plugin-pwa`)
- Create: `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/apple-touch-icon.png` (ikon aplikasi Open Formul teal/sky valid)
- Modify: `tsconfig.json` (tambahkan `"vite-plugin-pwa/client"` ke `compilerOptions.types`)
- Modify: `vite.config.ts` (daftarkan `VitePWA` dengan `maximumFileSizeToCacheInBytes: 6 * 1024 * 1024`, manifest lengkap, `globPatterns` mencakup `.wasm` & `.woff2`)
- Modify: `index.html` (`meta name="theme-color"`, `apple-touch-icon`)
- Create: `src/hooks/use-pwa-status.ts`
- Modify: `src/components/layout/AppShell.tsx` & `src/App.tsx` (status badge koneksi/offline siap pada Workspace badge)

**Interfaces:**

- Produces in `src/hooks/use-pwa-status.ts`:
  - `export interface PwaStatus { readonly isOnline: boolean; readonly offlineReady: boolean; readonly needRefresh: boolean; readonly applyUpdate: () => Promise<void> }`
  - `export function usePwaStatus(): PwaStatus`

- [ ] **Step 1: Install `vite-plugin-pwa`**
      Run: `npm install -D vite-plugin-pwa`

- [ ] **Step 2: Generate crisp local PNG icons (`public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/apple-touch-icon.png`)**
      Jalankan one-off script Node/zlib untuk merender ikon PNG RGBA gradien petrol-sky + siluet tetesan gandum Open Formul secara deterministik ke `public/`, lalu verifikasi dimensinya (`192×192`, `512×512`, `180×180`) dan hapus script sementara.

- [ ] **Step 3: Configure `vite.config.ts`, `tsconfig.json`, and `index.html`**
  - Pastikan `VitePWA` memakai:
    - `registerType: "autoUpdate"`
    - `includeAssets: ["apple-touch-icon.png"]`
    - `manifest`: `name: "Open Formul"`, `short_name: "Open Formul"`, `description`, `theme_color: "#0E4756"`, `background_color: "#DCEEF5"`, `display: "standalone"`, `icons` (`192x192`, `512x512`, `512x512 maskable`).
    - `workbox`: `globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,woff2}"]`, `maximumFileSizeToCacheInBytes: 6 * 1024 * 1024`, `navigateFallback: "index.html"`.

- [ ] **Step 4: Implement `src/hooks/use-pwa-status.ts` and integrate subtle online/offline badge in `src/components/layout/AppShell.tsx` & `src/App.tsx`**
  - Jaga aman di test JSDOM/Node: bungkus import/registrasi `virtual:pwa-register` secara aman sehingga environment non-SW tidak pernah error (gunakan try/catch atau deklarasi module aman bila di luar browser PWA build, dan verifikasi `tsc --noEmit`).

- [ ] **Step 5: Run `npm run typecheck && npm run build` and verify precache manifest**
  - Cek langsung output `dist/manifest.webmanifest` dan isi `dist/sw.js` mengandung entri `highs-*.wasm` dan font `.woff2`!

- [ ] **Step 6: Commit**
      `git add package.json package-lock.json tsconfig.json vite.config.ts index.html public/ src/hooks/use-pwa-status.ts src/components/layout/AppShell.tsx src/App.tsx`
      `git commit -m "feat: configure installable PWA with 6 MiB Workbox precache for HiGHS WASM"`

---

### Task 5: Interactive UI Wiring — Export Dialog, Saved Recipes, CSV Import, Grid Paste TSV, & Settings

**Files:**

- Modify: `src/components/recipes/ExportDialog.tsx`
- Modify: `src/components/recipes/SavedRecipesPage.tsx`
- Modify: `src/components/database/IngredientLibraryPage.tsx`
- Modify: `src/components/formulation/NumericCellInput.tsx`
- Modify: `src/components/formulation/IngredientDesktopTable.tsx`
- Modify: `src/components/formulation/FormulationWorkbench.tsx`
- Modify: `src/components/settings/SettingsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css` (`@media print` layout rapi bila memilih cetak langsung)
- Test: `tests/ui/offline-export-ui.test.tsx`

**Interfaces:**

- `ExportDialogProps`: gunakan `generateFormulationCsv`, `generateFormulationXlsx`, `generateFormulationPdf`, `serializeRecipeFeedJson`, `getExportAvailability`, `triggerBlobDownload`, dan `triggerBrowserPrint`; tampilkan status badge/peringatan kompromi bila `near_feasible`, nonaktifkan tombol `PDF Print Batch Only` saat `status !== "optimal"`, dan tombol salin JSON.
- `SavedRecipesPageProps`: tambah `onImportFeedJson: (fileText: string) => ValidationResult<{ readonly recipe: Recipe; readonly wasIdRenamed: boolean }>`, `onDownloadRecipeJson: (recipe: Recipe) => void`, `onDeleteRecipe: (recipeId: string) => void`; dukung unggah `.feed.json` via `<input type="file" accept=".feed.json,.json">`.
- `IngredientLibraryPageProps`: aktifkan tombol _"Impor CSV / JSON"_, tambah `onImportIngredients: (entries: readonly PartialIngredientImportEntry[]) => { readonly addedCount: number; readonly updatedCount: number }` serta dialog/panel unggah `.csv`/`.tsv`/`.json` dengan field opsional _"Sumber Default"_ dan ringkasan hasil impor (_N ditambah, M diperbarui, peringatan_).
- `IngredientDesktopTableProps`: tambah `onBatchUpdateIngredients?: (updates: readonly IngredientPastePatch[]) => void`; sambungkan `onPaste` pada `NumericCellInput` (`price`, `dm`, `min`, `max`, dan nutrien tampil) sehingga tempelan multi-sel TSV langsung menerapkan patch dan menampilkan toast/banner ringkas.
- `SettingsPageProps`: tambah `storageMode`, `ingredientCount`, `recipeCount`, `offlineReady`, `onResetWorkbench`, `onClearAllLocalData`; tampilkan status penyimpanan IndexedDB (`open-formul-db`), status PWA offline, jumlah bahan/resep tersimpan, tombol _Reset Workbench ke Bawaan_, dan tombol _Hapus Semua Data Lokal_ (dengan konfirmasi 2 langkah).

- [ ] **Step 1: Write failing UI integration tests in `tests/ui/offline-export-ui.test.tsx`**
      Menguji:
  1. `ExportDialog` pada status `optimal`, `near_feasible` (`PDF Batch Only` disabled + peringatan kompromi terlihat), dan `infeasible` (spreadsheet/PDF disabled, `.feed.json` tetap aktif).
  2. `SavedRecipesPage` mengimpor `.feed.json` valid (resep muncul di daftar), menolak `.feed.json` invalid dengan pesan error jelas, serta memicu unduhan `.feed.json` per kartu resep.
  3. `IngredientLibraryPage` mengimpor CSV semi-colon (`;`) dengan _partial merge_ dan menampilkan ringkasan jumlah diperbarui/ditambah.
  4. `IngredientDesktopTable` menerima event `paste` TSV multi-baris pada sel `Harga/kg` dan memanggil batch update dengan `priceOverride` (bukan `pricePerKg`) + menjaga `"0"` vs kosong `null`.

- [ ] **Step 2: Run `npm run test -- tests/ui/offline-export-ui.test.tsx`**
      Expected: FAIL sebelum komponen diperbarui.

- [ ] **Step 3: Implement UI updates across `ExportDialog.tsx`, `SavedRecipesPage.tsx`, `IngredientLibraryPage.tsx`, `NumericCellInput.tsx`, `IngredientDesktopTable.tsx`, `FormulationWorkbench.tsx`, `SettingsPage.tsx`, `App.tsx`, dan `src/index.css`**
  - Pastikan seluruh tombol & kartu interaktif baru memenuhi aturan `AGENTS.md` §9 (transisi tekan/hover, minimal touch target mobile `44px`, dark mode contrast, fokus keyboard, no `"Loading..."`, `prefers-reduced-motion`).

- [ ] **Step 4: Run `npm run test -- tests/ui/` & `npm run typecheck` & `npm run lint`**
      Expected: PASS seluruh UI tests (`prototype-flow`, `solver-live-ui`, `offline-export-ui`), typecheck, dan lint.

- [ ] **Step 5: Commit**
      `git add src/components/ src/App.tsx src/index.css tests/ui/offline-export-ui.test.tsx`
      `git commit -m "feat: wire IndexedDB persistence, .feed.json/CSV/XLSX/PDF export, CSV import, and grid TSV paste to UI"`

---

### Task 6: Documentation Sync, Browser Self-Audit, & Full Verification Gate

**Files:**

- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `docs/architecture.md`
- Modify: `docs/data-schema.md`
- Modify: `prd.md` (perbarui tabel status Fase 3 sesuai progres aktual)

- [ ] **Step 1: Sync documentation per `docs-sync-maintainer`**
      Perbarui `README.md`, `ROADMAP.md` (centang ✅ untuk IndexedDB, PWA Service Worker + manifest, Ekspor/Impor `.feed.json` & CSV/XLSX/PDF sesuai lingkup Opsi A), `docs/architecture.md` (lapisan `src/storage/`, flow IndexedDB & PWA SW), dan `docs/data-schema.md` (dokumen `formulationState` + aturan validasi impor).

- [ ] **Step 2: Format & run full verification suite**
      Run:
      `npx prettier --check ...`
      `npm run typecheck`
      `npm run lint`
      `npm run test`
      `npm run build`
      Verifikasi `dist/sw.js` mengandung entri precache `highs-*.wasm`.

- [ ] **Step 3: Run `playwright-cli` live production preview audit (`vite preview`)**
  - Uji pada Desktop `1440×900` dan Mobile `375×812`:
    - Pastikan `0` console error/warning dan `0` tabrakan komponen melalui screenshot inspeksi.
    - Verifikasi persistensi IndexedDB nyata: ubah harga/bahan -> reload halaman -> nilai tetap bertahan; cek registrasi manifest/SW.
    - Hapus folder sementara `.playwright-tmp` & `.playwright-cli` dan hentikan server preview setelah selesai.

- [ ] **Step 4: Commit**
      `git add README.md ROADMAP.md docs/ prd.md`
      `git commit -m "docs: sync Fase 3 offline PWA, IndexedDB, and export/import documentation"`
