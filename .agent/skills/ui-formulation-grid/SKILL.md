---
name: ui-formulation-grid
description: Panduan desain UI Open Formul — tabel matriks bahan pakan, input target nutrien min/max, indikator status terpenuhi/tidak, dan visualisasi hasil ransum yang bersih, responsif, dan aksesibel dengan React + Tailwind. Gunakan saat membuat/mengubah src/components atau src/hooks.
---

# UI Formulation Grid

## 1. Tata Letak

- **Desktop (≥ lg):** 3 panel — Bahan (kiri, lebar) · Target Nutrien (kanan atas) · Hasil (kanan bawah / tab).
- **Mobile:** tab/stepper: `Bahan → Target → Hasil`; tombol hitung lengket di bawah.
- Gunakan palet netral + aksen hijau (`emerald`) untuk status terpenuhi, `amber` peringatan, `rose` gagal. Dukung dark mode (`dark:`).

## 2. Grid Matriks Bahan

- Baris = bahan, kolom = `Aktif ☑ | Nama | Harga/kg | BK% | Min% | Max% | nutrien…`.
- Kolom nama & checkbox **sticky** saat scroll horizontal; header sticky saat scroll vertikal.
- Sel numerik: `<input type="text" inputMode="decimal">`, rata kanan, angka tabular (`tabular-nums`). Terima koma dan titik desimal (lokal ID), simpan sebagai `number`.
- Validasi inline: border `rose` + tooltip bila nilai negatif/bukan angka/min > max.
- Navigasi keyboard: Enter/↓ ke baris berikutnya, Tab ke kolom berikutnya; dukung paste blok dari spreadsheet (TSV).
- > 50 baris: virtualisasi (mis. `@tanstack/react-virtual`).

## 3. Input Target Nutrien

- Per nutrien: `Nama (satuan) | Min | Max | Tercapai | Status`.
- Selektor profil ternak (preset) yang mengisi otomatis, tetap dapat diedit.
- Badge basis aktif: `As-Fed` / `BK` dengan toggle.

## 4. Indikator Status

| Status                                                                | Tampilan                         |
| --------------------------------------------------------------------- | -------------------------------- |
| Terpenuhi                                                             | ✅ badge emerald "Terpenuhi"     |
| Di bawah min                                                          | ⬇️ badge rose "Kurang" + selisih |
| Di atas max                                                           | ⬆️ badge rose "Lebih" + selisih  |
| Tidak dibatasi                                                        | — abu-abu                        |
| Jangan mengandalkan warna saja: sertakan ikon + teks (aksesibilitas). |

## 5. Tampilan Hasil

- Kartu ringkas: **Biaya/kg**, **biaya per batch** (input ukuran batch, mis. 100 kg/1 ton), status solver.
- Tabel komposisi: bahan, %, kg per batch, kontribusi biaya; urut menurun.
- Visual: _stacked bar_ horizontal komposisi + bar nutrien vs rentang target (penanda min/max).
- _Infeasible:_ panel `rose` berisi penjelasan dari `precheck` dan saran tindakan; jangan menampilkan angka komposisi.
- Tampilkan indikator "Menghitung…" ringan (bukan blocking) saat worker berjalan.

## 6. State & Hooks

- `useIngredients`, `useRequirements` (persist ke IndexedDB), `useFormulation` (debounce + worker + requestId).
- Komponen presentasional murni; logika di hooks/solver.
- Format angka via `Intl.NumberFormat('id-ID')`; mata uang `IDR`. Pembulatan hanya di tampilan (2 desimal %, 0 desimal kcal).

## 7. Aksesibilitas & Kualitas

- Semua input berlabel (`aria-label` untuk sel grid), fokus terlihat, kontras WCAG AA.
- Area sentuh ≥ 44px di mobile.
- Uji komponen dengan Testing Library untuk validasi input & status.
