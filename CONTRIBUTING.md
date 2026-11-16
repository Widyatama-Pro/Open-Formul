# Panduan Kontribusi OpenFormul

Terima kasih telah tertarik berkontribusi! Proyek ini membutuhkan dua jenis keahlian: **rekayasa perangkat lunak** dan **ilmu nutrisi ternak**.

## Alur Kerja Umum

1. Cari atau buat _issue_ terlebih dahulu (gunakan template yang tersedia).
2. _Fork_ repositori, lalu buat branch: `feat/…`, `fix/…`, `docs/…`, `data/…`.
3. Lakukan perubahan + test + update dokumentasi terkait.
4. Commit dengan format [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(solver): add inclusion constraints`, `data(ingredients): add palm kernel meal`.
5. Buka _Pull Request_ dan isi checklist template PR.

## Untuk Programmer

- TypeScript `strict`; dilarang `any` tanpa justifikasi komentar.
- Logika domain & solver harus **murni** (tanpa React) dan berada di `src/solver` / `src/utils`.
- Setiap perubahan solver wajib disertai unit test (Vitest) dengan contoh yang dapat diverifikasi manual.
- Jangan menambahkan dependensi yang memerlukan server/internet saat runtime (prinsip _offline-first_).
- Jalankan `npm run lint && npm run test && npm run build` sebelum PR.
- Komponen UI: Tailwind CSS, responsif (mobile-first), aksesibel (label, kontras, navigasi keyboard).

## Untuk Ahli Nutrisi Ternak

Kontribusi data bahan pakan dan profil kebutuhan nutrien sangat berharga. Aturannya:

- **Wajib mencantumkan sumber** (NRC, Feedipedia, tabel komposisi nasional, jurnal, atau hasil lab).
- Nyatakan **basis** nilai (`as_fed` atau `dry_matter`) dan kadar **Bahan Kering (BK)**.
- Gunakan satuan standar: `%` untuk PK, SK, LK, Ca, P, asam amino; `kcal/kg` untuk EM/ME.

### Format Data Bahan Pakan

Tambahkan entri ke `src/data/ingredients.sample.json` mengikuti [docs/data-schema.md](docs/data-schema.md):

```json
{
  "id": "corn-ground",
  "name": "Jagung Giling",
  "nameEn": "Ground Corn",
  "category": "energy",
  "pricePerKg": 5500,
  "dryMatter": 86,
  "basis": "as_fed",
  "nutrients": { "cp": 8.5, "me_poultry": 3350, "cf": 2.2, "ca": 0.02, "p": 0.28 },
  "source": "NRC (1994) Nutrient Requirements of Poultry"
}
```

Jika tidak nyaman mengedit JSON, ajukan data melalui issue template **Feed Ingredient Data**.

## Pelaporan Bug Kalkulasi

Sertakan data input lengkap (ekspor JSON bila ada), hasil yang diharapkan, dan hasil aktual.

## Kode Etik

Semua kontributor wajib mematuhi [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
