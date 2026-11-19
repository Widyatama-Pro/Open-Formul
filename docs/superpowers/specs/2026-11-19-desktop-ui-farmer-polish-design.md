# Spesifikasi Desain — Perbaikan UI Desktop Open Formulasi (Ramah Peternak)

**Tanggal:** 2026-11-19  
**Fokus Platform:** Desktop (`>= 1024px`, Android & PWA ditunda untuk iterasi berikutnya)  
**Tujuan:** Menyederhanakan dan memoles seluruh antarmuka desktop agar praktis bagi peternak, bebas jargon teknis pengembang, akurat secara nutrisi (SNI & 8 kelas pakan internasional), serta seragam secara visual dengan identitas merek **Open Formulasi**.

---

## 1. Identitas Merek, Logo & Header

- **Logo Aplikasi:** Menggunakan [assets/logo.jpg](../../../assets/logo.jpg) yang disalin ke `src/assets/logo.jpg` (di-bundle offline oleh Vite) dan `public/logo.jpg` (favicon & manifest).
- **Header Atas (`AppShell.tsx`):**
  - Latar hijau tua hutan `#0F3D3E` (Dark Mode: `#072223`) agar menyatu dengan sidebar dan latar logo.
  - Menampilkan logo + teks **`Open Formulasi`** (`Open` berwarna putih `#FFFFFF`, `Formulasi` berwarna hijau zamrud terang `#4ADE80`).
  - Menghapus teks tambahan `/ Formulasi`, `· Formulasi Pakan Presisi`, dan tombol `Workspace` di pojok kanan atas.
- **Sidebar Desktop (`DesktopSidebar.tsx`):**
  - Menggunakan logo baru di pojok kiri atas.
  - Menambahkan tombol perbesar/perkecil sidebar dengan ikon panah arah yang jelas (`ChevronsLeft` / `ChevronsRight`), mendukung mode rail kompak (`64px`) dan diperluas (`208px`).

---

## 2. Kontrol Formulasi & Integrasi Pengaturan

- **Toolbar (`WorkbenchToolbar.tsx`):**
  - Menghapus dropdown demo `Solver HiGHS (Live) / Demo: ...` (selalu memakai HiGHS live).
  - Mempertahankan `Standar Ternak` (dikelompokkan rapi dengan `<optgroup>`: Cepat, SNI Unggas, SNI Ruminansia, Kearl 1982, NRC Dairy 1988), basis `As-Fed / BK (DM)`, selektor `Mode` optimasi, sakelar `Mode Simpel / Lanjutan`, `Elastik` (dengan tooltip penjelas), `Ekspor`, `Simpan`, `Reset`, dan `Tutup Target` (ikon `ChevronsRight` / `ChevronsLeft`).
  - **Anti-Nol:** Aktif otomatis secara default (`enforceNonZero: true, minIfSelected: 1`), namun bahan mikro dengan `max < minIfSelected` (seperti premix/metionin) dijaga agar tidak terkunci ke batas maksimumnya. Kontrol sakelar & batas % dipindahkan ke **Pengaturan → Opsi Lanjutan Formulasi**.
  - **Presisi LP:** Dipindahkan dari toolbar utama ke **Pengaturan → Opsi Lanjutan Formulasi** (serta dapat dibuka dari pintasan di tab Modul Lanjutan).
- **Pengaturan (`SettingsPage.tsx`):**
  - Menyediakan kontrol: **Mode Simpel vs Mode Lanjutan (Advance)**, **Tampilkan NDF/ADF**, **Aturan Anti-Nol Otomatis** (sakelar + batas %), dan tombol **Modul Presisi LP**.

---

## 3. Standar Ternak SNI Bertahun Terbit (`src/data/sni-requirements.ts`)

Melengkapi preset bawaan dengan seri tabel SNI resmi disertai nomor & tahun terbit:

- **SNI 8173.1–3:2015** — Pakan Ayam Ras Pedaging (Broiler Pre-Starter, Starter, Finisher)
- **SNI 8290.1–5:2016** — Pakan Ayam Ras Petelur (Pre-Starter, Starter, Grower, Pre-Layer, Layer Produksi)
- **SNI 7783.1–3:2013** — Pakan Ayam Buras / Kampung (Starter, Grower, Layer)
- **SNI 3908–3910:2017** — Pakan Itik Petelur (Starter/Meri, Grower/Dara, Layer)
- **SNI 3148-1:2017** — Pakan Konsentrat Sapi Perah (KSP1 Pedet, KSP3 Dara, KSP4 Laktasi Normal, KSP5 Laktasi Tinggi, KSP6 Kering Bunting)
- **SNI 3148-2:2017** — Pakan Konsentrat Sapi Potong (Penggemukan, Induk, Pejantan)
- **SNI 8819:2019** — Pakan Konsentrat Domba Penggemukan

---

## 4. Tabel Bahan Pakan (Workbench)

- Menghapus tombol `Muat +50` dan teks `Menampilkan ... dari ...`.
- Memisahkan menjadi **dua tabel berbeda**:
  1. **Pakan yang Digunakan** — bahan aktif (`isActive !== false`) dengan edit harga, BK, Min/Max, Inklusi %, dan nutrien secara langsung.
  2. **Semua Bahan** — daftar katalog bahan dengan pencarian, filter 8 kelas pakan, dan kotak centang `Pakai` untuk memasukkan/mengeluarkan bahan ke tabel pakan digunakan.
- **Kolom Nama Bahan Dapat Digeser (Slide/Resize):** Handle drag vertikal di batas kanan header kolom nama (`96px`–`320px`) agar lebar bisa diminimalkan untuk memperluas area pandang kolom nutrisi.
- **Checkbox Tampil/Sembunyi Kolom:** Baris kotak centang ringkas di atas tabel untuk memilih kolom yang ingin ditampilkan (`Harga`, `BK`, `Min/Max`, `Inklusi`, dan tiap nutrien).
- **Singkatan Otomatis Mode Simpel:** Saat Mode Simpel aktif, label nutrien di tabel, panel target, grafik, dan harga bayangan otomatis disingkat (`PK`, `EM`, `TDN`, `LK`, `SK`, `Ca`, `P`, `NDF`, dll.) dengan tooltip nama lengkap.

---

## 5. Target Nutrien, Grafik Batch, Harga Bayangan & What-If

- **Panel Target Nutrien (`NutrientTargetsPanel.tsx`):**
  - Default menampilkan **nama nutrien + nilai aktual + status** secara ringkas.
  - Input **Min & Max tersembunyi secara default** dan baru melebar (_expand_) saat pengguna mengklik baris/tombol `Atur Batas` (disediakan pula tombol buka/tutup semua).
  - Ikon tutup/buka panel menggunakan `ChevronsRight` / `ChevronsLeft`.
- **Grafik Hasil (`FormulationCharts.tsx` & `BatchMixerCalculator.tsx`):**
  - Ukuran grafik radar diperkecil (`h-32 w-32`) dan bar chart lebih ringkas agar proporsional di panel bawah.
- **Harga Bayangan & What-If (`ResultsPanel.tsx`, `ShadowPriceTab.tsx`, `WhatIfManualLock.tsx`):**
  - Pada bahasa Indonesia, tab `Shadow Price` diterjemahkan menjadi **`Harga Bayangan`** disertai kotak penjelasan praktis cara membacanya.
  - Pada tab `What-If`, ditambahkan kotak penjelasan singkat fungsi kunci persentase bahan.

---

## 6. Database (8 Klasifikasi Standar), Profil Kebutuhan, Project Resep & Modul Lanjutan

- **Database (`IngredientLibraryPage.tsx`):**
  - Pengelompokan berdasarkan **8 klasifikasi bahan pakan standar (IFN / NRC / Hartadi 1980 Tabel 7)**: (1) Hijauan Kering & Jerami, (2) Pastura & Hijauan Segar, (3) Silase, (4) Sumber Energi, (5) Sumber Protein, (6) Sumber Mineral, (7) Sumber Vitamin, (8) Aditif / Imbuhan Pakan.
  - Menghilangkan opsi ekspor CSV/JSON — menyediakan **Ekspor PDF** rapi dengan tabel terstruktur per kelas.
- **Profil Kebutuhan Pakan (`RequirementLibraryPage.tsx`):**
  - Disederhanakan menjadi tabel ringkas & mudah dipindai (Nama & Fase, Standar/Tahun, Basis, PK, Energi/TDN, Ca/P, Aksi).
- **Project Resep (`SavedRecipesPage.tsx` & `ExportDialog.tsx`):**
  - Tampilan daftar resep disederhanakan; ekspor difokuskan khusus ke **PDF** (Laporan Lengkap & Lembar Timbang Gudang).
- **Modul Lanjutan (`AdvancedModulesPreview.tsx`):**
  - Menghilangkan jargon teknis (`Out of Scope`, `PWA`, `CLI`, `Build-Time`, kode `PR-01/ML-01/EN-01`).
  - Memisahkan **Fitur Siap Pakai** (kartu pintasan yang benar-benar bisa diklik menuju fiturnya di Workbench) dan **Segera Hadir** (pasif, non-interaktif, bahasa praktis peternak).
