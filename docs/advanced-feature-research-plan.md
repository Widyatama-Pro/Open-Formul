# Rencana Riset & Bedah Teknis Fitur Lanjutan — OpenFormul

Dokumen ini menjadi panduan cetak biru (**Research & Dissection Plan**) pasca-deploy untuk membedah, memverifikasi secara matematis terhadap literatur _peer-reviewed_, lalu mengimplementasikan **15 modul formulasi presisi, operasional pabrik, dan ekosistem enterprise** secara bertahap pada engine **OpenFormul** (`src/solver/`, `src/utils/`, `src/storage/`, dan UI _Advance_).

> **Status Implementasi Saat Ini:** Modul **Fase 4A (`PR-01` s/d `PR-05`)** telah aktif di engine HiGHS WASM (`src/solver/`) dan antarmuka Workbench ([AdvancedModulesPreview.tsx](../src/components/formulation/AdvancedModulesPreview.tsx)); `ML-01`–`ML-03` berstatus opsional _single-mix_, `EN-01` dipisah ke CLI/_build-time_, dan `ML-04`, `ML-05`, `EN-02`–`EN-05` berstatus **🚫 Out of Scope PWA** sesuai audit lingkup offline-first.

---

## Urutan Eksekusi Strategis

1. **Tahap 1 — Deploy & Instalasi Lintas Platform (Prioritas Aktif):**
   - Publikasi PWA _offline-first_ ke GitHub Pages (`/OpenFormul/`) + bundel portabel GitHub Releases agar langsung dapat dipasang di **Desktop (Windows/macOS/Linux)** dan **Mobile (Android/iOS)** lengkap dengan halaman **Modul Lanjutan (`Coming Soon`)**.
2. **Tahap 2 — Riset & Bedah Cara Kerja Fitur (Modul Lanjut PWA & CLI):**
   - Untuk tiap modul yang dilanjutkan (`PR-01` s/d `PR-05`, serta opsi `ML-01`–`ML-03` dan CLI `EN-01`), menyusun skenario uji numerik terhadap kasus jurnal acuan sebelum menulis kode solver, memverifikasi kecocokan solver HiGHS WASM (`LP` / `SLP` / `MILP`), serta menentukan kontrak tipe di `src/types/index.ts`.
3. **Tahap 3 — Implementasi Bertahap & Validasi:**
   - Mengimplementasikan domain murni (bebas React), unit test _feasible + infeasible + edge case_, pembaruan UI responsif, dan sinkronisasi dokumentasi.

---

## A. Peta Celah & Klasifikasi Modul (Ringkasan Gap Analysis)

| Kode        | Fitur / Teknik                                                                                                                | Kategori                      | Status Awal PRD                              | Target Kompleksitas Solver               | Lingkup Offline-First PWA                                             |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------- | :---------------------------- | :------------------------------------------- | :--------------------------------------- | :-------------------------------------------------------------------- |
| **`PR-01`** | Minimal IIS (_Chinneck Deletion Filter_) + Relaksasi Bertingkat (_Priority Tiers_) + Chebyshev Mode 5                         | Diagnostik & Goal Programming | Ada–Dangkal (`F-06`, `F-12`, `F-13`)         | LP Multi-Pass + $\epsilon$-Lexicographic | ✅ **Lanjut (PWA Offline LP)**                                        |
| **`PR-02`** | _RHS Validity Ranging_ ($[b_i^{\text{down}}, b_i^{\text{up}}]$), Deteksi _Dual Degeneracy_, & _Critical-Region Stepping_      | Sensitivitas Ekonomi          | Ada–Dangkal (`F-14`, `F-15`)                 | Simplex Basis Inversion + Parametric LP  | ✅ **Lanjut (PWA Offline LP)**                                        |
| **`PR-03`** | _Charnes–Cooper Fractional LP_ ($\min \text{Cost/ME}$ atau $\text{Cost/Lys}$) & Kendala Aktif `dEB/DCAD` + Guard `0/0`        | Rasio Ekonomi–Biologis        | Ada–Dangkal (`F-09`, `F-22`) + Baru (`F-36`) | Pure LP (Substitusi Charnes–Cooper)      | ✅ **Lanjut (PWA Offline LP)**                                        |
| **`PR-04`** | CCP Stokastik Kovarians ($\mathbf{\Sigma}$), Varians Kebutuhan ($\sigma_{b_i}^2$), Cantelli Skew Guard, & Algoritma SLP HiGHS | Stokastik & Risiko            | Ada–Dangkal (`F-23`)                         | SLP (Munford Iteratif LP + Damping)      | ✅ **Lanjut (PWA Offline SLP)**                                       |
| **`PR-05`** | Matriks Multi-Enzim Sub-Aditif (Fitase/Xilanase/Protease), Retensi Termal, SOS2, & Evaluator Rumen/CNCPS                      | Enzim & Biologi Ruminansia    | Ada–Dangkal (`F-24`, `F-25`)                 | LP + MILP (SOS2) + Evaluator Aljabar     | ✅ **Lanjut (PWA Offline LP & Evaluator)**                            |
| **`ML-01`** | Anti-Nol _Semi-Continuous_, Resolusi Timbangan Mikro, & _Integer Step Values_                                                 | Operasional Timbangan Pabrik  | Ada–Dangkal (`F-05`, `F-27`, `F-29`)         | MILP (`Binaries` & `Generals`)           | 🕒 **Opsional Single-Mix MILP**                                       |
| **`ML-02`** | Koreksi _Moisture Shrink_ (Berbasis 1 kg Produk Jadi), PQF/PDI Linear, & _Post-Pellet Coater Fat_                             | Fisika Peleting & Susut Air   | Ada–Dangkal (`F-26`, `F-28`)                 | LP / MILP                                | 🕒 **Opsional Single-Mix LP**                                         |
| **`ML-03`** | Matriks Kontraindikasi Aditif (_Ionophore–Tiamulin_), Rotasi Koksidiostat, & Beban Mikotoksin Kumulatif                       | Keamanan Obat & Toksikologi   | Baru (`F-37`)                                | MILP Biner + LP Toksikologi              | 🕒 **Opsional Single-Mix MILP**                                       |
| **`ML-04`** | LCA _Cradle-to-Mill-Gate_ (GFLI/ECOALIM), Neraca Retensi N/P Monogastrik, & Kurva Pareto $\epsilon$-Constraint                | Eco-Nutrition & Emisi         | Ada–Dangkal (`F-31`) + Baru (`F-40`)         | Multi-Objective $\epsilon$-Constraint LP | 🚫 **Out of Scope PWA** _(evaluator ringan $\text{eCH}\_4$/N-P saja)_ |
| **`ML-05`** | Optimasi Profit Karkas / Susu (_IOFC_, Gompertz GRG, & Algoritma Genetika Ruminansia)                                         | Model Pertumbuhan & Profit    | Ada–Dangkal (`F-25`, `F-26`)                 | NLP (GRG / Genetic Algorithm)            | 🚫 **Out of Scope PWA** _(butuh solver NLP/GA di luar HiGHS)_         |
| **`EN-01`** | Paket Mesin Terpisah (`@openformul/core` CLI/NPM) & _Auto-Crawler_ Database Terbuka                                           | Ekosistem Riset & Kontributor | Ada–Terjadwal (`F-19`, `F-35`)               | Core Engine Bundling                     | 🔧 **Dipisah ke CLI / Build-Time Tooling** _(bukan runtime PWA)_      |
| **`EN-02`** | _Multi-Blend_ Multi-Pabrik, Konservasi Stok $I_{j,p,t}$, Tight Big-M Silo, & _Multi-Lot Blending_                             | Rantai Pasok & Silo Pabrik    | Ada–Dangkal (`F-27`) + Baru (`F-38`)         | Block-Angular MILP                       | 🚫 **Out of Scope PWA** _(butuh server multi-user & MILP pabrik)_     |
| **`EN-03`** | _Cross-Formula Procurement Valuation Matrix_ (Evaluasi Harga Pemasok Lintas Formula)                                          | Pengadaan Strategis           | Baru (`F-38`)                                | Multi-LP / Block LP                      | 🚫 **Out of Scope PWA** _(butuh data kontrak/inventaris terpusat)_    |
| **`EN-04`** | _Closed-Loop_ QC FT-NIR ($\hat{\sigma}_{\text{EWMA}}$) ke Stokastik + _DAG Equation Topological Sort_                         | QC / LIMS Terintegrasi        | Ada–Dangkal (`F-21`, `F-29`) + Baru (`F-41`) | EWMA + DAG Evaluator                     | 🚫 **Out of Scope PWA** _(butuh hardware FT-NIR & LIMS pabrik)_       |
| **`EN-05`** | Penjadwalan Batch Anti-Carryover (GLSP/ATSP Flush) & Generator Label Patuh **SNI RI / EU / AAFCO**                            | Kepatuhan Regulasi & Jadwal   | Ada–Dangkal (`F-30`) + Baru (`F-39`)         | MILP / Heuristik ATSP                    | 🚫 **Out of Scope PWA** _(jadwal mixer & regulasi hukum dinamis)_     |

---

## B. Rencana Bedah Cara Kerja & Spesifikasi Matematis (Per Fase)

### Fase 4A — Precision Core & Dual Diagnostics (`PR-01` s/d `PR-05`)

#### `PR-01` Minimal IIS (_Chinneck Deletion Filter_) & Relaksasi Bertingkat (`F-06+`, `F-12+`, `F-13+`)

- **Pertanyaan Riset & Bedah:** Mengapa elastic penalty seragam dapat melonggarkan batas racun atau gagal menunjuk pasangan kendala konflik secara minimal?
- **Model Matematis:**
  1. **Priority Tiers:** Tier-0 _Hard_ (kesetimbangan $\sum x_j = 1$, VFD, batas toksik/ANF keras — tanpa variabel elastik), Tier-1 _Kritis_ ($M_1 = 10^8$: asam amino, Ca/P, Na/Cl, rasio terlindungi), Tier-2 _Standar_ ($M_2 = 10^6$: ME/TDN, PK, SK), Tier-3 _Lunak_ ($M_3 = 10^4$: batas inklusi $L_j, U_j$ & grup bahan).
  2. **Deletion Filter (Chinneck, 1997):** Uji $\mathcal{R} \setminus \{r\}$ secara berurutan pada kandidat kendala; buang $r$ bila subsistem tetap _infeasible_, pertahankan bila menjadi _feasible_, hingga tersisa himpunan konflik minimal $\mathcal{R}_{\text{IIS}}$.
  3. **Mode 5 Chebyshev + $\epsilon$-Lexicographic:** $\min D + 10^{-5} \sum_j c_j x_j$ dengan $w_k \frac{d_k^+ + d_k^-}{s_k} \le D$ agar _shadow price_ dan _opportunity cost_ tetap bernilai bermakna di Mode 5.
- **Benchmark Uji:** Sistem 3 kendala kontradiktif buatan & kasus PK Min 23% vs SBM Max 15% + Jagung Min 55% harus mengembalikan IIS berukuran tepat 2–3 baris dan menjaga batas Tier-0 tetap 0 pelanggaran.

#### `PR-02` _RHS Validity Ranging_, _Dual Degeneracy Guard_, & _Critical-Region Stepping_ (`F-14+`, `F-15+`)

- **Model Matematis:** Ekstrak `rowValueUp/Down` dan `colBoundUp/Down` dari `highs.withModel(...)` (`highsTypes.ts`) untuk rentang validitas $[b_i^{\text{down}}, b_i^{\text{up}}]$; tandai basis degenerat jika $x_B = 0$ atau $|\bar{c}_j| \le 10^{-7}$ non-basis (hitung _directional shadow price_ $y_i^+, y_i^-$ via uji $\pm\delta$). _Parametric stepping_ menggeser $c_j(\theta)$ tepat melampaui _breakpoint_ `colCostDown` secara berantai guna menghasilkan kurva tangga _Buy/No-Buy_ yang eksak.

#### `PR-03` _Charnes–Cooper Fractional LP_ & Kendala Aktif `dEB/DCAD` (`F-09+`, `F-22+`, `F-36`)

- **Guard Rasio:** Tambah syarat $\sum_j a_{qj} x_j \ge \epsilon_{\text{den}}$ ($\epsilon_{\text{den}} = 10^{-4}$) saat penyebut tidak memiliki batas minimum eksplisit agar solusi $0/0$ tertutup.
- **Baris LP `dEB/DCAD`:** $\text{DCAD}_{\min} \le \sum_j \left(\frac{\text{Na}_j}{23{,}0} + \frac{\text{K}_j}{39{,}1} - \frac{\text{Cl}_j}{35{,}5} - \frac{2\text{S}_j}{32{,}1}\right) x_j \le \text{DCAD}_{\max}$.
- **Optimasi Rasio Biaya/Nutrisi:** Transformasi $t = (\sum_j e_j x_j)^{-1} > 0$, $\mathbf{z} = t\mathbf{x}$ sehingga $\min \frac{\sum c_j x_j}{\sum e_j x_j}$ tereduksi ke LP standar: $\min \sum c_j z_j$ s.t. $\sum e_j z_j = 1,\; \mathbf{A}\mathbf{z} - \mathbf{b}t \ge \mathbf{0},\; \sum z_j - t = 0,\; L_j t \le z_j \le U_j t$.

#### `PR-04` Stokastik Kovarians, $\sigma_{b_i}^2$, _Cantelli Bound_, & Algoritma SLP (`F-23+`)

- **Model Matematis:**
  $$V_i(\mathbf{x}) = \mathbf{x}^\top \Sigma^{(i)} \mathbf{x} + \sigma_{b_i}^2 + 10^{-12}$$
  Linearisasi Taylor orde-1 di sekitar $\mathbf{x}^{(t)}$ untuk HiGHS WASM SLP (Munford, 1996):
  $$\sum_{j=1}^{n} \left(\mu_{ij} - \kappa_i \frac{(\Sigma^{(i)} \mathbf{x}^{(t)})_j}{\sqrt{V_i(\mathbf{x}^{(t)})}}\right) x_j \ge b_i^{\min} + \kappa_i \frac{\sigma_{b_i}^2 + 10^{-12}}{\sqrt{V_i(\mathbf{x}^{(t)})}}$$
  dengan $\kappa_i = \Phi^{-1}(p_i)$ (Gaussian) atau $\kappa_i = \sqrt{\frac{p_i}{1 - p_i}}$ (_Cantelli_) dan _damped update_ $\mathbf{x}^{(t+1)} = (1-\alpha_t)\mathbf{x}^{(t)} + \alpha_t \hat{\mathbf{x}}^{(t)}$ sampai $\|\Delta \mathbf{x}\|_\infty < 10^{-5}$.
- **Benchmark Uji:** Reproduksi kasus D'Alfonso, Roush & Ventura (1992) (_Poultry Science_, 71:255–262) dan Tozer (2000) (_J. Dairy Sci._, 83:443–451).

#### `PR-05` Multi-Enzim Sub-Aditif, Retensi Termal, SOS2, & Hybrid CNCPS SLP (`F-24+`, `F-25+`)

- **Model Matematis:** Plafon substrat spesifik per enzim (Fitase $\to \text{PhytateP}$, Xilanase $\to \text{Arabinoxylan/NSP}$, Protease $\to (1-\text{dc}_{\text{ileal}})\text{CP}$) ditambah plafon gabungan anti-hitung-ganda $\sum_e r_{i,e} \le \psi_i \cdot \text{UndigestedPool}_i(\mathbf{x})$ ($\psi_i < 1$) dan retensi termal peleting $\theta_{e,\text{pellet}}$ (vs $1{,}0$ pada PPLA). Untuk CNCPS v6.5 / NASEM 2021, iterasi _fixed-point_ 3–6 pass memperbarui $k_p(\mathbf{x}^{(t)})$, $\text{DMI}(\mathbf{x}^{(t)})$, serta $\text{peuNDF}_{240}$ sebelum evaluasi penuh.

---

### Fase 5 — Mill-Floor Engineering, Eco-Nutrition & IOFC (`ML-01` s/d `ML-05`)

- **`ML-01` (MILP di `toLpString.ts`):** Tambah bagian `Binaries` & `Generals` pada generator LP; terapkan kendala _semi-continuous_ $L_j^{\text{prod}} y_j \le x_j \le U_j y_j$ ($y_j \in \{0,1\}$) dan kelipatan kantong/timbangan $x_j B_{\text{batch}} = \Delta_j z_j$ ($z_j \in \mathbb{Z}_{\ge 0}$).
- **`ML-02` (Fisika Peleting & Koreksi Neraca Air `F-28+`):** Basis 1,00 kg pakan jadi pasca-penguapan:
  $$(1-\delta_{\text{dust}})\sum_{j=1}^n x_j + x_{\text{steam}} + x_{\text{oil,coater}} - x_{\text{evap}} = 1{,}00, \qquad (1-\delta_{\text{dust}})\sum_{j=1}^n \frac{\text{DM}_j}{100} x_j + x_{\text{oil,coater}} \ge 1 - \frac{M_{\text{end}}^{\max}}{100}$$
  disertai batas lemak mixer $\le 1\text{–}3\%$ dan indeks kualitas pelet $\sum_j \beta_{\text{PDI},j} x_j \ge \text{PQF}_{\min}$.
- **`ML-03` (Aditif & Mikotoksin `F-37`):** Larangan ko-eksistensi $y_{\text{Tiamulin}} + y_{\text{Ionophore}} \le 1$ dan indeks beban toksikologi gabungan $\sum_j (\frac{\text{AFB1}_j}{\text{Lim}_1} + \alpha_2\frac{\text{DON}_j}{\text{Lim}_2} + \alpha_3\frac{\text{ZEA}_j}{\text{Lim}*3}) x_j \le 1{,}0 + \eta*{\text{binder}} x_{\text{binder}}$.
- **`ML-04` (Eco-Nutrition LCA & N/P `F-31+ / F-40`):** Optimasi Pareto $\epsilon$-constraint $\min \sum c_j x_j$ dengan $\sum \text{GWP}_j^{\text{LCA+LUC}} x_j \le \varepsilon_k$ dan neraca massa $N_{\text{excreted}}, P_{\text{excreted}}$ mengacu pada Mackenzie et al. (2016), Garcia-Launay et al. (2018), dan Moraes et al. (2015).
- **`ML-05` (IOFC & Gompertz `F-25 / F-26`):** Memaksimalkan laba bersih per ekor ($\max \text{Revenue} - \text{FeedCost}(\text{ME}, T)$) dengan penguncian domain biologis kurva kuadratik (Cerrate & Waldroup, 2009) dan algoritma genetika untuk lanskap non-linear CNCPS.

---

### Fase 6 — Enterprise Feed Mill Suite & Ekosistem Terbuka (`EN-01` s/d `EN-05`)

- **`EN-01`:** Paket NPM/CLI `@openformul/core` + alat kurasi dataset terbuka.
- **`EN-02` & `EN-03`:** _Block-Angular Multi-Blend MILP_ lintas pabrik & periode ($I_{j,p,t} = (1-\gamma)I_{j,p,t-1} + \text{Masuk} - \sum_f T_{f,p,t} x_{j,f,p,t}$), _tight Big-M_ $x_{j,f,p,t} \le \frac{U_{j,f}}{100} y_{j,p}$, _Multi-Lot Blending_, dan matriks valuasi pengadaan lintas formula.
- **`EN-04`:** _Sample Basket_ FT-NIR memperbarui $\hat{\mu}_t, \hat{\sigma}_t^2$ secara EWMA dan mengevaluasi persamaan energi dalam urutan DAG _topological sort_.
- **`EN-05`:** Penjadwalan urutan batch anti-carryover berbasis ATSP/GLSP (Toso, Morabito & Clark, 2009; Clark et al., 2010) serta generator label regulasi **SNI / Permentan RI**, **AAFCO**, dan **EU Reg 767/2009**.

---

## C. Pustaka Ilmiah Terverifikasi

1. Abdollahi, M. R., Ravindran, V., & Svihus, B. (2013). _Animal Feed Science and Technology_, 179(1–4), 1–23.
2. Briggs, J. L., Maier, D. E., Watkins, B. A., & Behnke, K. C. (1999). _Poultry Science_, 78(10), 1464–1471.
3. Castrodeza, C., Lara, P., & Peña, T. (2005). _Agricultural Systems_, 86(1), 76–96.
4. Charnes, A., & Cooper, W. W. (1959). _Management Science_, 6(1), 73–79.
5. Charnes, A., & Cooper, W. W. (1962). _Naval Research Logistics Quarterly_.
6. Chen, J. T. (1973). _American Journal of Agricultural Economics_, 55(2), 175–183.
7. Chinneck, J. W. (1997). _INFORMS Journal on Computing_, 9(2), 164–174; Chinneck, J. W. (2008), _Springer_.
8. Clark, A. R., Morabito, R., & Toso, E. A. V. (2010). _Journal of Scheduling_, 14, 309–323.
9. Cowieson, A. J., & Adeola, O. (2005). _Poultry Science_, 84(12), 1860–1867.
10. D'Alfonso, T. H., Roush, W. B., & Ventura, J. A. (1992). _Poultry Science_, 71(2), 255–262.
11. Garcia-Launay, F., et al. (2018). _British Journal of Nutrition_, 120(11), 1298–1309.
12. Mackenzie, S. G., Leinonen, I., Ferguson, N., & Kyriazakis, I. (2016). _The British Journal of Nutrition_, 115(10), 1860–1874.
13. Mertens, D. R. (1997). _Journal of Dairy Science_, 80, 1463–1481.
14. Moraes, L. E., et al. (2015). _Journal of Dairy Science_, 98(8), 5557–5571.
15. Munford, A. G. (1989a). _European Journal of Operational Research_, 41(3), 270–276.
16. Munford, A. G. (1989b). _Journal of the Operational Research Society_, 40(10), 933–935.
17. Munford, A. G. (1996). _Mathematics and Computers in Simulation_, 42(2–3), 255–261.
18. NASEM (2021). _Nutrient Requirements of Dairy Cattle: Eighth Revised Edition_.
19. Olukosi, O. A., Cowieson, A. J., & Adeola, O. (2007). _Poultry Science_, 86(1), 77–86.
20. Peña, T., Lara, P., & Castrodeza, C. (2009). _Journal of the Operational Research Society_, 60(12), 1738–1748.
21. Pesti, G. M., & Seila, A. F. (1999). _Journal of Applied Poultry Research_, 8(1), 110–121.
22. Rahman, S. A., & Bender, F. E. (1971). _American Journal of Agricultural Economics_, 53(4), 612–618.
23. Rehman, T., & Romero, C. (1984). _Agricultural Systems_, 15(1), 23–49.
24. Rehman, T., & Romero, C. (1987). _Agricultural Systems_, 23(2), 117–132.
25. Tamiz, M., Jones, D. F., & Romero, C. (1998). _European Journal of Operational Research_, 111(3), 569–581.
26. Toso, E. A. V., Morabito, R., & Clark, A. R. (2009). _Computers & Industrial Engineering_, 57(3), 813–821.
27. Tozer, P. R. (2000). _Journal of Dairy Science_, 83(3), 443–451.
28. Van Amburgh, M. E., et al. (2015). _Journal of Dairy Science_, 98(9), 6361–6380.
29. Zhang, F., & Roush, W. B. (2002). _Poultry Science_, 81(1), 182–192.
30. Žgajnar, J., Juvančič, L., & Kavčič, S. (2009). _Agricultural Economics (Zemědělská ekonomika)_, 55(10), 492–500.
