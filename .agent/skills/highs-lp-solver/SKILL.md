---
name: highs-lp-solver
description: Panduan teknis menyusun model Linear Programming least-cost (fungsi tujuan minimize cost, kendala nutrien & inklusi) dan menjalankannya dengan HiGHS WebAssembly (npm `highs`) di Web Worker browser tanpa lag. Gunakan saat mengubah src/solver.
---

# HiGHS LP Solver di Browser

## 1. Model Matematis
Variabel: `x_i` = fraksi bahan i (0..1).
```
minimize   Σ c_i x_i
subject to Σ x_i = 1
           N_k_min ≤ Σ n_ik x_i ≤ N_k_max     (tiap nutrien k)
           L_i ≤ x_i ≤ U_i                    (batas inklusi)
```
`c_i` = harga per kg pada basis model (lihat skill domain). Detail: `docs/formulation-math.md`.

## 2. Arsitektur Modul (`src/solver/`)
```
src/solver/
├── buildModel.ts       # Ingredient[] + Requirement → LpModel (murni)
├── toLpString.ts       # LpModel → string format CPLEX LP
├── precheck.ts         # deteksi infeasible cepat
├── highs.worker.ts     # Web Worker: memuat HiGHS sekali, menjalankan solve
├── solverClient.ts     # API Promise untuk UI (postMessage)
└── parseResult.ts      # output HiGHS → FormulationResult + verifikasi
```

## 3. Format LP (CPLEX) yang Dihasilkan
Gunakan **nama variabel aman** (`x0`, `x1`, …) dan petakan kembali ke `ingredient.id`; jangan pakai nama bahan langsung.
```
Minimize
 obj: 5500 x0 + 8200 x1 + 3000 x2
Subject To
 total: x0 + x1 + x2 = 1
 cp_min: 8.5 x0 + 44 x1 + 12 x2 >= 21
 cf_max: 2.2 x0 + 6 x1 + 13 x2 <= 5
Bounds
 0 <= x0 <= 1
 0 <= x1 <= 1
 0 <= x2 <= 0.2
End
```
- Format angka dengan `Number.prototype.toString()` (bukan `toFixed`) agar presisi terjaga; buang koefisien 0.
- Kendala rentang: tulis dua baris (`_min`, `_max`) atau satu baris `lo <= expr <= hi` bila didukung.

## 4. Pemuatan HiGHS di Web Worker
```ts
// highs.worker.ts
import highsLoader from "highs";
import wasmUrl from "highs/runtime?url"; // Vite: bundle .wasm agar tersedia offline

let highsPromise: ReturnType<typeof highsLoader> | null = null;
const getHighs = () =>
  (highsPromise ??= highsLoader({ locateFile: () => wasmUrl }));

self.onmessage = async (e: MessageEvent<{ id: number; lp: string }>) => {
  try {
    const highs = await getHighs();
    const res = highs.solve(e.data.lp, { presolve: "on", time_limit: 5 });
    self.postMessage({ id: e.data.id, ok: true, res });
  } catch (err) {
    self.postMessage({ id: e.data.id, ok: false, error: String(err) });
  }
};
```
> Periksa path ekspor WASM pada versi `highs` yang terpasang (`node_modules/highs/build/`) dan sesuaikan import.

## 5. Kinerja (tanpa lag)
- Muat WASM **sekali** (singleton) dan *prewarm* saat aplikasi start.
- Solve di Worker, **debounce** 250–400 ms pada input UI.
- Batalkan hasil usang dengan `requestId` (abaikan respons dengan id lama).
- Jika HiGHS crash (state WASM rusak), reset `highsPromise = null` dan muat ulang.
- Ukuran tipikal (≤ 100 bahan × 50 nutrien) selesai < 50 ms.

## 6. Interpretasi Hasil
- `res.Status === "Optimal"` → baca `res.Columns[name].Primal`, `res.ObjectiveValue`.
- `Infeasible` → jalankan `precheck` untuk diagnosis, kembalikan `status: "infeasible"`.
- `Unbounded` seharusnya mustahil (x dibatasi); perlakukan sebagai bug.
- Ambil `Dual` dari `res.Rows` untuk *shadow price* (Fase 3).
- Bersihkan noise: nilai `|x| < 1e-9` → 0.

## 7. Testing (Vitest)
- Jalankan HiGHS langsung di Node (tanpa Worker) untuk test `buildModel → solve → parseResult`.
- Kasus wajib: optimal sederhana (verifikasi manual 2 bahan), infeasible nutrien, infeasible inklusi, inklusi tetap (premix), rasio Ca:P.
