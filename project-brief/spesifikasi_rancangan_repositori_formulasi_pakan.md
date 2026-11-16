# Spesifikasi & Rancangan Repositori Aplikasi Formulasi Pakan Ternak Otomatis

Rancangan ini merupakan spesifikasi lengkap untuk repositori aplikasi formulasi pakan ternak otomatis berbasis optimasi multi-kriteria (keseimbangan nutrisi, batasan bahan, dan efisiensi biaya), mencakup fitur inti, analisis potensi bentrok logika, fitur tambahan lapangan, rekayasa ulang (*reverse engineering*) fitur software komersial, serta peta jalan pengembangan *open-source*.

---

## 1. Spesifikasi Fitur & Batasan Tiap Fitur

### A. Mesin Formulasi Pakan Dasar (Core Formulation Engine)
* **Fungsi:** Menghitung proporsi campuran beberapa bahan pakan (total harus tepat 100%) untuk memenuhi target kebutuhan nutrisi ternak.
* **Batasan Istilah (Nutrien Dasar):** Dibatasi pada parameter makronutrien utama yang wajib ada di hampir semua standar pakan, seperti Energi (ME / TDN), Protein Kasar (PK), Lemak Kasar (LK), Serat Kasar (SK), Kalsium (Ca), dan Fosfor (P).

### B. Database & Pencarian Otomatis Data Nutrisi (Auto-Search & Crawler)
* **Fungsi:** Mengambil dan mencari data nutrisi secara otomatis dari basis data internal maupun sumber tabel populer (hasil *crawling* / agregasi dataset terbuka seperti NRC, SNI, CVB, INRA, Feedipedia, atau Tabel Komposisi Pakan Indonesia/Hartadi).
* **Batasan Fitur (Wajib Dipisah Menjadi 2 Modul Data):**
  1. **Database Kandungan Nutrien Bahan Pakan:** Menyimpan profil nutrisi tiap bahan baku (misal: kandungan PK, energi, dan asam amino pada Jagung Kuning, Bungkil Kedelai, Dedak Padi).
  2. **Database Standar Kebutuhan Ternak:** Menyimpan angka target kebutuhan gizi berdasarkan jenis ternak dan fase pemeliharaan.
* **Catatan:** Fitur *auto-search* harus membedakan pencarian dua entitas ini agar sistem tidak mencampuradukkan angka "kandungan bahan" dengan "kebutuhan ternak".

### C. Pemilihan Preset Standar Ternak (Nutrient Requirement Presets)
* **Fungsi:** Pengguna cukup memilih jenis komoditas dan fase ternak (misal: Ayam Broiler Starter, Ayam Layer, Sapi Potong Penggemukan, Sapi Perah), lalu sistem otomatis mengisi (*auto-fill*) seluruh target nutrien dasarnya.
* **Batasan Fitur:** Preset hanya berlaku sebagai nilai awal (*template*). Begitu dipilih, seluruh parameter dasar terisi otomatis, tetapi tetap terbuka untuk diubah oleh pengguna.

### D. Kustomisasi Target Nutrien (Custom Nutrient Constraints)
* **Fungsi:** Pengguna dapat menyesuaikan batas Minimum (Min) dan Maksimum (Max) pada setiap parameter nutrien setelah memilih preset (atau membuat profil baru dari nol).
* **Batasan Fitur:**
  * Setiap nutrien memiliki dua batas opsional: batas bawah (Min) dan batas atas (Max).
  * Sistem wajib memvalidasi bahwa nilai Min tidak boleh melebihi nilai Max pada nutrien yang sama.

### E. Menu Presisi Tinggi (Advance Nutrient Breakdown)
* **Fungsi:** Secara *default*, antarmuka hanya menampilkan nutrien dasar agar ringkas. Ketika tombol/menu *Advance* diaktifkan, sistem membuka parameter fraksi nutrien yang lebih spesifik:
  * **Fraksi Protein:** Rincian asam amino esensial/spesifik (Lisin, Metionin, Metionin+Sistin, Valin, Treonin, Triptofan, Arginin, dll.).
  * **Fraksi Karbohidrat & Serat:** Rincian fraksi serat dan karbohidrat terlarut (Serat Kasar, NDF, ADF, Pati/BETN, dll.).
* **Batasan Fitur:** Parameter *Advance* bersifat *opt-in* (hanya dihitung oleh mesin formulasi jika pengguna mengaktifkan mode *Advance* dan mencentang nutrien spesifik yang ingin dikontrol).

### F. Manajemen Biaya Bahan Pakan (Feed Cost Management)
* **Fungsi:** Menetapkan harga per satuan berat (misal Rp/kg) pada setiap bahan pakan yang dipilih.
* **Batasan Mode Harga:**
  * **Harga Pasaran (*Market Reference*):** Harga acuan *default* yang tersimpan di sistem sebagai estimasi awal.
  * **Harga Custom (*User Override*):** Harga yang dapat diinput atau diubah bebas oleh pengguna untuk menyesuaikan kondisi fluktuasi pasar, wilayah, atau tanggal pembelian tertentu. Harga Custom selalu menimpa (*override*) Harga Pasaran selama sesi formulasi berlangsung.

### G. Batasan Komposisi Bahan & Aturan Anti-Nol (Ingredient Inclusion Rules)
* **Fungsi:** Mengatur porsi penggunaan tiap bahan pakan dalam formula:
  * **Batas Minimal (Min %):** Bahan wajib digunakan minimal sebesar persentase tertentu (misal: Jagung minimal 20%, artinya boleh lebih dari 20% tetapi tidak boleh kurang dari 20%).
  * **Batas Maksimal (Max %):** Bahan dibatasi penggunaannya maksimal sebesar persentase tertentu (misal: Dedak maksimal 20%, artinya boleh kurang dari 20% tetapi tidak boleh lebih dari 20%).
  * **Pengaturan Bahan Bernilai Nol (*Zero-Inclusion Setting*):** Opsi untuk menentukan apakah bahan yang sudah dimasukkan ke daftar racikan boleh bernilai 0% (tidak dipakai sama sekali oleh mesin jika tidak cocok) atau tidak boleh nol (wajib terpakai dengan batas minimal tertentu, misalnya otomatis dikunci minimal 0,5% atau 1% sesuai pengaturan pengguna).

### H. Mesin Rekomendasi & 5 Mode Optimasi (Solver Outcomes & Optimization Modes)
Saat tombol hitung/formulasi dijalankan, sistem menghadapi dua kemungkinan hasil:
1. **Kemungkinan Pertama (Terpenuhi Penuh / Feasible):** Seluruh target nutrisi (Min–Max) dan batasan bahan (Min–Max) terpenuhi 100% secara matematis.
2. **Kemungkinan Kedua (Terpenuhi Sebagian / Near-Feasible):** Kombinasi bahan yang tersedia tidak mampu memenuhi seluruh target secara sempurna, sehingga sebagian nutrien terpenuhi dan sebagian lainnya hanya mendekati target.

Untuk mengatur prioritas perhitungan antara biaya dan akurasi nutrisi, sistem menyediakan **5 Mode Optimasi**:

| No | Nama Mode | Fokus Utama | Perilaku Terhadap Biaya | Perilaku Terhadap Target Nutrisi |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **Hemat** | Biaya terendah | Menekan harga semurah mungkin | Memenuhi batas minimal standar secara longgar/batas bawah (*least-cost*) |
| 2 | **Agak Hemat** | Biaya rendah + keamanan gizi | Sedikit lebih mahal dari Mode 1 | Lebih mendekati nilai aman di atas batas minimal |
| 3 | **Seimbang** | Kompromi harga & nutrisi | Seimbang antara efisiensi & kualitas | Menjaga kedekatan target nutrisi tanpa membuat biaya melonjak |
| 4 | **Presisi** | Akurasi nutrisi tinggi | Cenderung lebih mahal (agak boros) | Mengutamakan ketepatan target nutrisi; harga menjadi prioritas kedua |
| 5 | **Presisi Tinggi** | Performa maksimal | Mengabaikan faktor harga | Memaksimalkan akurasi seluruh parameter nutrisi (termasuk mode *Advance*) |

---

## 2. Catatan Penting: Potensi Bentrok Logika & Cara Mengatasinya

Dalam perancangan algoritma optimasi (seperti *Linear Programming* atau *Goal Programming*), terdapat beberapa titik bentrok logika yang harus ditetapkan aturannya sejak awal agar aplikasi tidak *error* atau membingungkan pengguna:

1. **Bentrok Konsep "Tidak Terpenuhi" vs. "Masih Memenuhi Standar" pada 5 Mode**
   * **Masalah:** Di awal disebutkan 5 mode dipakai saat sebagian nutrien tidak terpenuhi, tetapi definisi Mode 1 (Hemat) menyebut "masih memenuhi standar walaupun tidak terlalu memenuhi".
   * **Solusi Batasan:** Pisahkan dua konsep ini secara tegas:
     * **5 Mode Optimasi** adalah bobot prioritas tujuan (*Objective Weight*) yang selalu aktif di setiap perhitungan (baik saat nutrisi bisa terpenuhi 100% maupun saat hanya mendekati).
     * **Mode Toleransi / Relaksasi (*Fallback Solver*):** Hanya aktif otomatis jika kombinasi bahan secara matematis mustahil mencapai target (*infeasible*). Pada kondisi ini, sistem tetap memakai bobot 5 mode tersebut sambil mencari selisih penyimpangan (*deviation*) sekecil mungkin dan memberi tanda peringatan merah pada nutrien yang meleset.

2. **Bentrok Kata "Memaksimalkan Semua Perhitungan" pada Mode 5 (Presisi Tinggi)**
   * **Masalah:** Dalam nutrisi ternak, menaikkan seluruh angka nutrien setinggi-tingginya justru berbahaya (kelebihan protein, energi, atau mineral dapat merusak rasio gizi, memicu gangguan metabolisme, atau menurunkan palatabilitas).
   * **Solusi Batasan:** Pada Mode 5, yang dimaksimalkan bukan besaran angka nutriennya, melainkan **tingkat presisi/kedekatan terhadap titik tengah target ideal (*target midpoint*)** serta kelengkapan pemenuhan nutrien mikro/asam amino tanpa dibatasi oleh harga.

3. **Bentrok Aturan "Tidak Boleh Nol" vs. Mode Hemat & Keseimbangan Nutrisi**
   * **Masalah:** Jika pengguna memasukkan 12 bahan lalu mengaktifkan pengaturan "Tidak Boleh Nol" dengan batas minimal otomatis 3% per bahan, maka $12 \times 3\% = 36\%$ komposisi sudah terkunci paksa. Jika salah satu bahan tersebut sangat mahal atau nutrisinya buruk, Mode Hemat maupun pemenuhan standar bisa gagal.
   * **Solusi Batasan:** Tambahkan peringatan otomatis jika $(\text{Jumlah Bahan} \times \text{Min Otomatis})$ melebihi 50% total ransum, serta beri opsi pengaturan per-bahan (bukan hanya global) agar pengguna bisa mengunci bahan tertentu saja yang wajib terpakai.

4. **Bentrok Batasan Angka (Total Minimal Lebih dari 100% atau Min Lebih Besar dari Max)**
   * **Masalah:** Pengguna bisa saja mengatur batas minimal bahan yang jika dijumlahkan melebihi 100% (misal 6 bahan masing-masing minimal $20\% = 120\%$), atau memasukkan nilai Min lebih besar dari Max.
   * **Solusi Batasan:** Pasang validasi pra-kalkulasi (*pre-check*). Tombol hitung tidak boleh menjalankan solver sebelum total semua Min bahan berada di bawah atau sama dengan 100%, dan total semua Max bahan berada di atas atau sama dengan 100%.

5. **Bentrok Data Kosong saat Fitur Advance Aktif**
   * **Masalah:** Tidak semua tabel bahan pakan (terutama bahan lokal/hasil *crawl*) memiliki data asam amino lengkap (seperti Valin) atau fraksi NDF/ADF. Jika pengguna menyalakan Mode Presisi Tinggi tetapi nilai Valin pada salah satu bahan tercatat kosong/nol, hasil formulasi akan bias.
   * **Solusi Batasan:** Sistem harus membedakan antara nilai `0` (memang tidak mengandung nutrien tersebut) dan `Null / N/A` (data tidak tersedia), serta memberi peringatan jika ada bahan terpilih yang datanya belum lengkap untuk parameter *Advance* yang diaktifkan.

---

## 3. Saran Fitur Tambahan yang Belum Disebutkan

Agar repositori ini benar-benar siap pakai untuk kebutuhan formulasi pakan lapangan maupun akademik, tambahkan 5 fitur berikut:

1. **Konversi Basis Bahan Kering (Dry Matter / DM) vs. Segar (As-Fed):**
   Sangat krusial terutama jika menyertakan ternak sapi/ruminansia yang menggunakan hijauan berkadar air tinggi (70–80%), berbeda dengan pakan unggas yang umumnya dihitung berbasis *As-Fed*. Pengguna perlu opsi untuk menghitung dalam basis BK (*Dry Matter*) lalu mengonversinya otomatis ke berat segar saat penimbangan.
2. **Pengunci Rasio Antar-Nutrien (Nutrient Ratios):**
   Kadang nilai masing-masing nutrien masuk rentang aman, tetapi perbandingannya rusak. Fitur pengunci rasio—khususnya rasio **Energi : Protein (ME:CP)** dan **Kalsium : Fosfor (Ca:P)**—akan menjaga kualitas biologis pakan tetap optimal.
3. **Kalkulator Skala Adukan (Batch Mixer Scaling):**
   Hasil formulasi biasanya berbentuk persentase (%). Tambahkan input **Total Berat Produksi** (misal: 50 kg, 100 kg, atau 1.000 kg/1 ton) agar sistem langsung mengeluarkan lembar takaran berat riil tiap bahan dalam kilogram beserta total biaya per adukan dan biaya per kilogram pakan jadi.
4. **Analisis Nutrien Pembatas (Limiting Nutrient & Shadow Price):**
   Saat formulasi menghasilkan Kemungkinan Kedua (tidak semua terpenuhi) atau biaya terasa terlalu tinggi, tampilkan ringkasan singkat mengenai nutrien mana yang paling sulit dipenuhi dan bahan mana yang paling memengaruhi kenaikan harga sebagai bahan evaluasi pengguna.
5. **Simpan Template Formula & Ekspor Lembar Kerja (Export PDF/Excel/CSV):**
   Kemampuan menyimpan kombinasi bahan dan harga yang sudah diracik sebagai proyek/template, serta mengekspor hasil akhir ke format PDF atau Excel/CSV untuk kebutuhan pencampuran di gudang pakan.

---

## 4. Fitur Software Komersial yang Bisa Di-Reverse Engineering (Open-Source)

Software formulasi pakan komersial (seperti Brill Formulation, Bestmix, WinFeed, Format, maupun NDS/AMTS) bertumpu pada mesin optimasi matematis yang juga tersedia secara gratis di dunia *open-source* (seperti SciPy HiGHS, Google OR-Tools, atau PuLP). Fitur-fitur mahal berikut dapat direkayasa ulang menggunakan pustaka *open-source*:

### A. Analisis Shadow Price & Opportunity Cost (Fitur Khas Brill & Bestmix)
* **Cara Kerja di Software Berbayar:** Setelah formulasi selesai, software komersial menampilkan tabel ekonomi lanjutan:
  * **Rentang Harga Aman (*Price Range*):** Batas harga terendah dan tertinggi suatu bahan sebelum persentasenya dalam formula berubah.
  * **Harga Peluang (*Opportunity Cost*):** Untuk bahan yang tidak terpilih (0%), sistem memberi tahu di harga berapa bahan tersebut baru layak masuk ke dalam ransum (misal: *"Tepung Ikan saat ini Rp14.000/kg tidak terpakai; baru akan masuk formula jika harganya turun di bawah Rp11.200/kg"*).
  * **Biaya Pembatas (*Shadow Price*):** Menunjukkan berapa rupiah penghematan per kilogram pakan jika satu batas nutrisi dilonggarkan sebesar 1 unit.
* **Cara Re-engineering Open-Source:** Solver linear *open-source* seperti `scipy.optimize.linprog` (metode HiGHS) secara bawaan sudah menghitung nilai dual (*marginals / reduced costs*) ini di balik layar. Cukup ekstrak variabel dual tersebut dan tampilkan ke tabel antarmuka.

### B. Formulasi Stokastik / Margin of Safety (Variabilitas Bahan Baku)
* **Cara Kerja di Software Berbayar:** Di pabrik pakan nyata, kadar protein jagung tidak selalu tepat 8,5%—ada standar deviasi ($\sigma$) antar kiriman truk. Software mahal memiliki fitur *Stochastic Formulation* agar formula tetap aman meski kualitas bahan fluktuatif.
* **Cara Re-engineering Open-Source:** Tambahkan kolom opsional **Standar Deviasi ($\sigma$)** pada database bahan dan *slider* **Tingkat Kepercayaan (*Confidence Level*, misal 80% atau 90%)**. Mesin otomatis mengurangi nilai nutrisi bahan berdasarkan skor-Z ($\mu - z \cdot \sigma$) sebelum dihitung oleh solver.

### C. Basis Nutrisi Tercerna (Digestible Nutrients / SID & Available P)
* **Cara Kerja di Software Berbayar:** Industri unggas dan babi modern tidak lagi memformulasikan berdasarkan Protein Kasar atau Asam Amino Total, melainkan *Standardized Ileal Digestible* (SID) untuk asam amino dan *Available Phosphorus* (AvP) untuk fosfor.
* **Cara Re-engineering Open-Source:** Pada menu *Advance*, sediakan sakelar (*toggle*) antara **Total Basis** dan **Digestible Basis (SID / AvP)** sehingga nilai kebutuhan standar dan nilai bahan otomatis bergeser ke fraksi yang benar-benar diserap tubuh ternak.

### D. Matriks Enzim (Enzyme Matrix Uplift)
* **Cara Kerja di Software Berbayar:** Penambahan enzim (seperti *Phytase*, *Xylanase*, atau *Protease*) tidak dihitung dari kandungan nutrisi enzimnya sendiri, melainkan dari kemampuannya "melepaskan" energi, fosfor, dan asam amino terikat dari bahan nabati di dalam campuran.
* **Cara Re-engineering Open-Source:** Buat tipe bahan khusus bernama `Additive / Enzyme` yang memiliki properti **Nutrient Uplift** (menambahkan bonus nilai ketersediaan Ca, AvP, ME, dan asam amino ke total ransum jika bahan substratnya tersedia).

### E. Batasan Faktor Antinutrisi & Kualitas Fisik Pelet (ANF & Pellet Quality)
* **Cara Kerja di Software Berbayar:** Selain nutrisi, formulasi komersial membatasi racun alami/antinutrisi (seperti Tanin, Gossypol, Trypsin Inhibitor, Aflatoksin) serta batas maksimal penambahan minyak/lemak cair (*Max Liquid Fat*) agar adonan tidak selip di mesin cetak pelet (*pellet die*).
* **Cara Re-engineering Open-Source:** Perlakukan antinutrisi dan kadar lemak cair sebagai parameter kendala batas atas (*Max Only*) di kategori terpisah pada menu *Advance*.

### F. Simulasi Tukar Bahan Cepat ("What-If" Manual Lock)
* **Cara Kerja di Software Berbayar:** Formulator sering ingin mengunci sebagian komposisi lalu menukar 5% jagung dengan polar gandum secara manual untuk melihat pergeseran nutrisi dan harga secara *real-time* tanpa menjalankan ulang optimasi otomatis.
* **Cara Re-engineering Open-Source:** Sediakan mode **Manual Simulator / Lock** di samping mode *Auto-Optimize*, lengkap dengan indikator bar hijau/merah yang langsung bergerak saat pengguna menggeser persentase bahan.

### G. Multi-Blend Optimization (Alokasi Stok Gudang Terbatas)
* **Cara Kerja di Software Berbayar:** Jika pabrik hanya punya stok 2 ton bungkil kedelai dan harus memproduksi pakan Starter, Grower, dan Finisher sekaligus, software mahal mampu membagi stok terbatas tersebut ke ketiga formula agar total keuntungan/penghematan seluruh pabrik optimal.
* **Cara Re-engineering Open-Source:** Tambahkan fitur opsional **Batch Stock Limit (kg)** pada mode produksi skala pabrik untuk menyelesaikan beberapa formula sekaligus dalam satu matriks persamaan linear.

---

## 5. Fitur Ekosistem agar Repositori GitHub Unggul & Ramai Kontributor

1. **Arsitektur Terpisah (Decoupled Core Engine + API + Web UI):**
   Pisahkan mesin matematika/solver (misal paket Python murni) dari antarmuka web. Mahasiswa, dosen, atau peneliti bisa mengimpor mesinnya langsung di Jupyter Notebook untuk riset massal, sementara peternak/formulator memakai antarmuka web yang visual.
2. **Dataset Bahan Lokal Berbasis JSON/YAML (Community Feed Packs):**
   Simpan database bahan pakan dalam file terstruktur yang mudah dibaca manusia (misal `data/ingredients/indonesia_local.json`, `data/standards/nrc_poultry.json`). Kontributor dari berbagai daerah/negara bisa mengirim *Pull Request* untuk menambahkan data nutrisi bahan lokal (seperti bungkil inti sawit, onggok, maggot BSF, azolla, atau limbah agroindustri) lengkap dengan sitasi jurnalnya.
3. **Detektor Konflik Cerdas (Infeasibility Debugger / IIS):**
   Masalah terbesar pengguna aplikasi formulasi adalah munculnya pesan error kaku *"Formula Tidak Ditemukan"* tanpa tahu penyebabnya. Implementasikan pencari konflik (*Irreducible Inconsistent Subsystem*) agar aplikasi memberi diagnosis jelas, misalnya: *"Target Protein Min 23% bentrok dengan Batas Maksimal Bungkil Kedelai 15%."*
4. **Resep Portabel & Reproduktif (`.feed.json`):**
   Sediakan tombol ekspor dan impor proyek dalam satu file ringan (`.json`) yang menyimpan daftar bahan, harga *custom*, batasan Min–Max, dan mode optimasi. Pengguna bisa membagikan file resep tersebut di forum/GitHub Issue untuk direproduksi ulang dengan hasil 100% identik.
5. **Visualisasi Interaktif (Radar Chart & Cost-to-Nutrient Ratio):**
   Tampilkan grafik jaring laba-laba (*Radar Chart*) yang membandingkan **Target Ideal vs. Hasil Aktual** tiap nutrien, serta grafik batang perbandingan antara **Porsi Berat (%)** dan **Porsi Biaya (%)** tiap bahan agar pengguna langsung melihat bahan mana yang paling menguras anggaran.

---

## 6. Peta Jalan Pengembangan (Roadmap Rilis GitHub)

| Fase Rilis | Fokus Utama | Fitur Kunci yang Wajib Ada |
| :--- | :--- | :--- |
| **v1.0 (MVP Core)** | Mesin formulasi akurat & siap pakai | Nutrien dasar, preset standar ternak, kustomisasi Min–Max bahan & nutrisi, harga pasaran vs custom, anti-nol, 5 mode optimasi, kalkulator adukan (kg), ekspor CSV/PDF. |
| **v1.5 (Pro & Analytics)** | *Re-engineering* fitur software komersial | Menu *Advance* (asam amino & fraksi serat), konversi Dry Matter vs As-Fed, Shadow Price & Opportunity Cost, detektor konflik otomatis, grafik visualisasi. |
| **v2.0 (Enterprise & Community)** | Skala pabrik & ekosistem riset | Stochastic Safety Margin, matriks enzim, Multi-blend alokasi stok gudang, *auto-crawler* database nutrisi terbuka, REST API publik. |