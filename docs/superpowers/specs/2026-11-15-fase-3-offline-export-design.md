# Desain Sistem Fase 3 (Batch Opsi A) — PWA Offline Penuh, IndexedDB, & Ekspor/Impor Nyata

**Tanggal:** 2026-11-15  
**Status:** Finalisasi Desain — Menunggu Persetujuan Implementasi (`Opsi A`, `Pendekatan 1`, `1A/2A/3A`)  
**Dokumen Acuan:** [prd.md](../../prd.md) (`STG-01`, `STG-02`, `EXP-01`, `EXP-02`, `F-32`, `F-33`, `F-34`), [ROADMAP.md](../../ROADMAP.md), [docs/data-schema.md](../data-schema.md), [AGENTS.md](../../AGENTS.md)

---

## 1. Tujuan & Lingkup

Menghubungkan seluruh lapisan penyimpanan persisten, kapabilitas offline PWA sejati, dan pertukaran data eksternal klien-sisi untuk **Open Formul** tanpa menambah dependensi runtime berat:

1. **Penyimpanan Lokal Permanen di IndexedDB (`STG-01`):**
   - Menyimpan database bahan (`ingredients`), standar kebutuhan ternak (`requirements`), arsip resep tersimpan (`recipes`), preferensi pengguna (`preferences`), serta snapshot sesi aktif workbench (`activeRequirementId`, `config`) agar seluruh perubahan pengguna persisten melewati reload maupun offline.
2. **PWA Offline Penuh & Installable (`STG-02`):**
   - Konfigurasi `vite-plugin-pwa` (Workbox `generateSW`), Web App Manifest lengkap dengan ikon lokal (`192×192`, `512×512`, _apple-touch-icon_), meta PWA di `index.html`, serta **penaikan batas cache precache ke `6 MiB`** agar `highs-*.wasm` (~`3,53 MB`) dan seluruh `@fontsource-variable/*` ikut di-_precache_.
   - Indikator status jaringan/PWA di UI (`Offline Ready` / `Offline Mode` / `Pembaruan Tersedia`).
3. **Resep Portabel `.feed.json` & Validasi Batas Sistem (`EXP-01`):**
   - Ekspor `.feed.json` 1-klik sesuai tipe kanonik `Recipe` (`schemaVersion: 1`) + salin JSON ke papan klip.
   - Impor `.feed.json` pada halaman `SavedRecipesPage` dengan validasi skema ketat tanpa `any`: menolak `schemaVersion` asing, `dryMatter <= 0` atau `> 100`, harga negatif, struktur nutrien rusak, sambil mempertahankan pembedaan `0` vs `null`.
4. **Ekspor Spreadsheet (CSV & `.xlsx`) + Impor CSV/JSON + Paste TSV (`EXP-02`):**
   - Generator **CSV UTF-8 (dengan BOM)** dan **OOXML `.xlsx` multi-sheet murni** (pure TypeScript ZIP Store + CRC32, 3 lembar: `Komposisi & Batch`, `Profil Nutrien`, `Analisis Sensitivitas`) tanpa SheetJS.
   - Mengaktifkan tombol **"Impor CSV / JSON"** pada `IngredientLibraryPage` dengan parser lokal desimal Indonesia dan pembedaan tegas sel kosong (`null` = N/A) vs angka `0`.
   - Dukungan **Paste TSV multi-sel** (blok salinan dari Excel/Google Sheets) langsung pada sel tabel `IngredientDesktopTable` di Desktop.
5. **Ekspor PDF Murni Sisi Klien — _Formula Lengkap_ & _Print Batch Only_ (`EXP-02`):**
   - Generator **PDF 1.4 biner murni TypeScript** (`%PDF-1.4`) tanpa library eksternal berat, mendukung paginasi multi-halaman dan normalisasi karakter WinAnsi aman:
     - **Lembar Formula Lengkap (`full`):** metadata resep, biaya/kg & biaya batch, komposisi bahan (% model, % As-Fed, berat batch kg, harga, kontribusi biaya), profil nutrien (Min, Max, Aktual, Status, _Shadow Price_), serta sumber pustaka.
     - **Print Batch Only (`batch_only` untuk operator mixer/gudang):** hanya menampilkan identifikasi resep, ukuran adukan (kg), daftar bahan aktif, bobot timbang As-Fed (kg), proporsi penimbangan (%), dan kolom ceklis `[ ]` operator—**secara ketat menyembunyikan seluruh angka biaya (`Rp`), target/aktual nutrien, _shadow price_, dan _opportunity cost_**.

---

## 2. Non-Goals & Anti-Goals

- **Non-Goals (dikerjakan di batch terpisah):**
  - Builder nutrien kustom dinamis pengguna & ekspansi pustaka spesies ternak besar-besaran (sisa `ROADMAP.md` Fase 3).
  - Virtualisasi `@tanstack/react-virtual` & kamus i18n menyeluruh untuk seluruh teks statis tambahan (selain label komponen baru yang sudah mendukung `id`/`en`).
  - Backend cloud sync, akun pengguna, atau formulasi stokastik/enzim/MILP (Fase 4A–4B).
- **Anti-Goals:**
  - Dilarang menyimpan dataset bahan, resep, atau preferensi utama menggunakan `localStorage`.
  - Dilarang menambah library pihak ketiga berat (`xlsx`, `jspdf`, dll.) sesuai `AGENTS.md` §7.
  - Varian PDF `batch_only` dilarang keras membocorkan nilai harga bahan, biaya ransum, maupun profil nutrisi target/aktual.
  - Impor `.feed.json`, CSV, maupun Paste TSV dilarang mengubah sel kosong (`""`) menjadi angka `0` secara diam-diam.

---

## 3. Arsitektur & Pilihan Pendekatan

**Pendekatan Terpilih:** _Pendekatan 1 — Zero-Bloat Core (`idb` + `vite-plugin-pwa` + Pure TS Generators)_.

1. **Lapisan Storage (`src/storage/db.ts`):**
   - Memakai `idb` (~1,2 kB) untuk skema IndexedDB `open-formul-db` (versi `1`) dengan 5 _object store_:
     - `ingredients` (`keyPath: "id"`)
     - `requirements` (`keyPath: "id"`)
     - `recipes` (`keyPath: "id"`)
     - `formulationState` (key tunggal `"current"`: `{ activeRequirementId, activeRequirementOverride?, config, updatedAt }`)
     - `preferences` (key tunggal `"user"`: `UserPreferences`)
   - **Seeding Pertama Kali:** Saat database masih kosong (mis. kunjungan awal), sistem mengisi data bawaan (`MOCK_INGREDIENTS`, `MOCK_REQUIREMENTS`, `MOCK_SAVED_RECIPES`, `DEFAULT_CONFIG`, `DEFAULT_PREFERENCES`) dalam satu transaksi atomik. Perubahan berikutnya menimpa record di IndexedDB secara _debounced_ (200 ms) agar pengetikan angka di tabel tidak memicu I/O berlebihan.
   - **Reset Aman:** Tombol _Reset Data Bawaan_ di Toolbar hanya memulihkan katalog bahan standar, preset kebutuhan bawaan, dan `config` awal workbench **tanpa menghapus resep tersimpan pengguna** di store `recipes`. Penghapusan menyeluruh tersedia terpisah bila pengguna membutuhkannya di Pengaturan (`Hapus Semua Data Lokal`).
   - **Fallback Aman Non-IDB:** Bila `indexedDB` tidak tersedia (mis. sebagian mode privat browser atau lingkungan test tanpa shim), storage gagal secara aman (_graceful fallback_ ke state memori dengan peringatan non-blocking, tidak melempar _unhandled rejection_).

2. **Lapisan PWA (`vite.config.ts`, `index.html`, `public/`, `src/hooks/use-pwa-status.ts`):**
   - `vite-plugin-pwa` dikonfigurasi dengan `registerType: "autoUpdate"` dan Workbox `generateSW`:
     - `globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,woff2}"]`
     - `maximumFileSizeToCacheInBytes: 6 * 1024 * 1024` (wajib >= 6 MiB agar aset `highs-*.wasm` ~3,53 MB masuk ke _precache_).
     - `navigateFallback: "index.html"` agar SPA tetap terbuka penuh saat offline.
   - Hook ringan memantau `navigator.onLine` (`online`/`offline` event) serta `virtual:pwa-register` (status _offline-ready_ / pembaruan SW) untuk ditampilkan halus di `AppShell` tanpa mengganggu tata letak desktop maupun mobile.

3. **Lapisan Validator, Transfer Data, & Merge Non-Destruktif (`src/utils/validators.ts`, `src/storage/recipeTransfer.ts`, `src/utils/ingredientCsvImport.ts`, `src/utils/tsvPaste.ts`):**
   - Semua parsing & validasi eksternal bersifat **murni TypeScript** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), bebas `any`, menggunakan `unknown` + _type guards_ eksplisit di batas sistem.
   - Validator mengecek integritas `dryMatter ∈ (0, 100]`, harga `>= 0`, `inclusion.min <= inclusion.max`, serta membedakan `null` vs `0`. Pada `.feed.json`, `config` opsional (fallback ke `DEFAULT_CONFIG`) agar resep portabel minimal tetap dapat dibuka.
   - **Isolasi & Merge Non-Destruktif `.feed.json` / `loadRecipe` (Keputusan `1A`):**
     - Memuat resep tidak menghapus bahan lain di katalog `ingredients`: bahan yang ada pada resep di-merge ke katalog (`isActive`, harga, batas inklusi diperbarui sesuai snapshot resep), bahan baru dari resep ditambahkan ke katalog, sedangkan bahan katalog lain di luar resep disetel `isActive: false`.
     - Profil `requirement` dari resep dimuat sebagai target aktif sesi workbench (`activeRequirementOverride` di `formulationState` atau entri sesi terpisah) **tanpa menimpa preset induk** di store `requirements` (mis. `"broiler-starter"` tetap utuh).
     - Bila impor `.feed.json` membawa `recipe.id` yang sudah ada di store `recipes`, sistem membuat ID baru yang unik (`${id}-import-${timestamp}`) agar arsip lama tidak tertimpa diam-diam.
     - Pada `SavedRecipesPage`, setiap kartu resep menyediakan tombol **"Unduh .feed.json"** langsung (independen terhadap status `result === null` atau `result` pada workbench aktif).
   - **Aturan Impor Bahan `.csv`/`.json` — _Partial Merge_ & Skema Fleksibel (Keputusan `2A` & Builder Call):**
     - Pencocokan entri yang sudah ada dilakukan berdasarkan `id`, atau fallback nama dinormalisasi (_trim + lowercase_) bila CSV tidak memiliki kolom `id`.
     - Untuk entri cocok, `importIngredients` melakukan **partial merge**: hanya menimpa field dan key nutrien yang terisi eksplisit di file impor—kolom kosong/absen **tidak** menimpa atau menghapus asam amino, mineral, `stdDev`, `phytateP`, maupun `priceOverride` lama.
     - Parser CSV/TSV otomatis mendeteksi pemisah `,` atau `;` (Excel Indonesia) dari baris header, mengenali nama key kanonik maupun alias umum ID/EN (`Nama`/`Nama Bahan`, `Harga`/`Harga/kg`, `BK`/`BK %`, `Kategori`, `Basis`, `Sumber`, `PK`/`Protein Kasar`, `ME`/`me_poultry`, dst.), memakai `parseLocaleDecimal(..., { treatSingleThousandDot: true })` **khusus kolom harga** (dan `false` pada persen BK/nutrien), serta menyediakan kolom input opsional _"Sumber Default"_ pada dialog impor bila file uji lab tidak menyertakan kolom `source` (menolak baris bila tetap tanpa sumber sesuai `AGENTS.md` §7).
   - **Paste TSV di Tabel Bahan (Builder Call):**
     - `tsvPaste.ts` mendeteksi tempelan multiline atau bertab (`\t` / `\n`) dari clipboard di `IngredientDesktopTable`, memetakan sel mulai dari `(rowIdx, colKey)` secara berurutan ke kolom sebelah kanan/bawah (`priceOverride`, `dryMatter`, `min`, `max`, dan nutrien yang tampil).
     - Menempel kolom `Harga/kg` menulis ke `priceOverride` agar tetap konsisten dengan edit sel manual dan menjaga harga acuan `pricePerKg`; sel kosong pada kolom harga menghapus `priceOverride` (`resetPriceOverride` semantics tanpa menyisipkan `{ priceOverride: undefined }`), sedangkan sel kosong pada kolom nutrien menyetel `null` (N/A) dan angka `"0"` tetap `0`. Tempelan 1 nilai tunggal dibiarkan ke handler normal `<input>`.

4. **Lapisan Generator Dokumen & Gerbang Keamanan Status (Keputusan `3A`):**
   - **Aturan Status Solver saat Ekspor:**
     - **`.feed.json`:** Selalu tersedia di semua status (`optimal`, `near_feasible`, `infeasible`, `error`) untuk portabilitas arsip & _troubleshooting_.
     - **`PDF Print Batch Only` (`batch_only`):** **Wajib `result.status === "optimal"`**. Dinonaktifkan disertai keterangan jelas bila status `near_feasible`, `infeasible`, atau `error` agar operator mixer tidak menerima lembar timbang tanpa peringatan penyimpangan nutrisi (`AGENTS.md` §5).
     - **`CSV`, `.xlsx`, & `PDF Formula Lengkap` (`full`):** Aktif saat `optimal` dan `near_feasible` (wajib menampilkan banner/penanda `"PERINGATAN: STATUS NEAR-FEASIBLE (RELAKSASI ELASTIK - KOMPROMI NUTRISI)"` pada dokumen bila `near_feasible`), dan dinonaktifkan saat `infeasible` atau `error`.
   - **CSV:** UTF-8 BOM + escaping RFC 4180, separator koma standar (angka presisi penuh tanpa pembulatan palsu agar siap diolah ulang di spreadsheet).
   - **OOXML `.xlsx` Murni:** Modul internal penyusun arsip ZIP (_Store method_ + _CRC-32 IEEE 802.3_ + _Local File Header_ + _Central Directory_) yang membungkus XML SpreadsheetML OOXML (`[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml`, dan `xl/worksheets/sheet1..3.xml` dengan `inlineStr` + angka presisi `n`). Tidak butuh library pihak ketiga.
   - **PDF 1.4 Murni:** Penulis dokumen PDF biner berbasis halaman A4 (`595 × 842 pt`), font standar PDF (`Helvetica`, `Helvetica-Bold`, `Courier`), pemisah halaman otomatis jika baris tabel melebihi tinggi halaman, serta fungsi sanitasi WinAnsi aman (mengubah simbol non-WinAnsi seperti `≥`, `≤`, `→`, `•`, `—` menjadi `>=`, `<=`, `->`, `-`). Varian `batch_only` secara ketat menyembunyikan seluruh harga, biaya, dan data nutrien.

---

## 4. Kontrak Modul & Perubahan UI

- **Modul Baru:**
  - `src/storage/db.ts` — IndexedDB persistence adapter (`idb`) + seed/load/save/reset.
  - `src/storage/recipeTransfer.ts` — serialize & import/validate `.feed.json`.
  - `src/storage/exportCsvXlsx.ts` — `generateFormulationCsv()`, `generateFormulationXlsx()` (Uint8Array).
  - `src/storage/exportPdf.ts` — `generateFormulationPdf(payload, variant: "full" | "batch_only")` (Uint8Array).
  - `src/utils/validators.ts` — pure type-safe schema validators (`validateRecipePayload`, `validateIngredientList`).
  - `src/utils/ingredientCsvImport.ts` — parser & validator impor bahan pakan format CSV/TSV/JSON.
  - `src/utils/tsvPaste.ts` — parser & mapper blok tempelan spreadsheet (termasuk semantik `priceOverride` / `clearPriceOverride` agar tetap mematuhi `exactOptionalPropertyTypes`).
  - `src/utils/download.ts` — helper klien-sisi trigger Blob download (`triggerBlobDownload`) + print fallback.
  - `src/hooks/use-pwa-status.ts` — tracker status online/offline + status registrasi Service Worker PWA.
- **Pembaruan Modul Eksisting:**
  - `vite.config.ts`, `tsconfig.json`, `index.html`, `public/` — manifest PWA, ikon lokal, TypeScript client types (`vite-plugin-pwa/client`), Workbox `6 MiB` limit.
  - `src/hooks/use-prototype-store.ts` — hidrasi & persistensi otomatis ke IndexedDB (`open-formul-db`), `loadRecipe` & `importRecipe` non-destruktif terhadap katalog, `deleteRecipe`, batch patch bahan (`batchUpdateIngredients`) untuk Paste TSV, serta `importIngredients` (_partial merge_).
  - `src/components/recipes/ExportDialog.tsx` — unduhan nyata `.feed.json`, `.csv`, `.xlsx`, `.pdf` (_Formula Lengkap_), `.pdf` (_Print Batch Only_ khusus status `optimal`), salin JSON, dan tombol _Cetak Langsung_.
  - `src/components/recipes/SavedRecipesPage.tsx` — unggah/impor `.feed.json`, tombol unduh `.feed.json` per kartu resep, validasi error jelas, serta aksi hapus resep tersimpan.
  - `src/components/database/IngredientLibraryPage.tsx` — aktifkan tombol impor bahan (`.csv` / `.json`) dengan input _Sumber Default_ opsional + umpan balik hasil _partial merge_.
  - `src/components/formulation/IngredientDesktopTable.tsx` — handler `onPaste` untuk tempel blok TSV dari spreadsheet + banner notifikasi ringkas.
  - `src/components/layout/AppShell.tsx` & `src/components/settings/SettingsPage.tsx` — indikator status koneksi/PWA (`Offline Siap` / `Mode Offline`) serta info & kontrol reset penyimpanan lokal IndexedDB.

---

## 5. Rencana Verifikasi Wajib

- Unit & Integrasi Tests (`Vitest` + `fake-indexeddb` untuk simulasi penuh IndexedDB di Node/JSDOM):
  1. `tests/validators.test.ts` — validasi batas `.feed.json`, penolakan `dryMatter <= 0`, `schemaVersion !== 1`, harga negatif, pembedaan `0` vs `null` di impor JSON & CSV (`,` dan `;`), _partial merge_ bahan tanpa menghapus nutrien lama, serta parsing blok Paste TSV angka lokal Indonesia (`priceOverride`, `5.500,25`, sel kosong -> `null`, `"0"` -> `0`).
  2. `tests/storage-db.test.ts` — seeding awal IndexedDB, simpan & muat ulang bahan/resep/preferensi/config/override target persisten lintas instansi DB, `loadRecipe` non-destruktif terhadap katalog & preset induk, serta _Reset Workbench_ yang menjaga resep pengguna tetap aman.
  3. `tests/export-generators.test.ts` — verifikasi CSV BOM & struktur kolom, validasi magic header ZIP `PK\x03\x04` + dekode XML `.xlsx` 3 lembar, verifikasi `%PDF-1.4` `full` vs `batch_only` (`batch_only` bebas `"Rp"`, `"Shadow Price"`, dan profil nutrien), serta gerbang keamanan status (`batch_only` wajib `optimal`; `near_feasible` menyertakan banner kompromi pada `CSV`/`XLSX`/`PDF full`; `infeasible`/`error` menonaktifkan ekspor hasil).
  4. `tests/ui/` — integrasi UI `ExportDialog` (termasuk status `optimal` vs `near_feasible` vs `infeasible`), `SavedRecipesPage` impor & unduh `.feed.json`, `IngredientLibraryPage` impor CSV _partial merge_, dan `Paste TSV` pada `IngredientDesktopTable`.
- Build & PWA Verification:
  - `npm run build` memverifikasi `dist/sw.js`, `dist/manifest.webmanifest`, dan entri precache `highs-*.wasm` tercantum di manifest precache Workbox.
  - Audit browser (`playwright-cli`) pada `vite preview` (Desktop `1440×900` & Mobile `375×812`) memastikan zero console errors, persistensi IndexedDB aktif melewati reload halaman, dan tampilan bebas tabrakan layout.
