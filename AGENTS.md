# AGENTS.md — Aturan Global untuk AI Agent

Berlaku untuk **semua** AI agent (dan manusia) yang bekerja di repositori Open Formul. Baca file ini sebelum mengubah apa pun.

## 1. Konteks

Open Formul adalah PWA _offline-first_ untuk _least-cost ration formulation_. Stack: React, Vite, TypeScript, Tailwind CSS, HiGHS WASM (`highs`), IndexedDB, Service Worker.

## 2. Skill Modular (muat sesuai tugas)

| Tugas                                              | Skill                                                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Logika nutrisi, basis BK, satuan, infeasibility    | `.agent/skills/feed-formulation-domain/SKILL.md`                                                                     |
| Model LP & integrasi HiGHS                         | `.agent/skills/highs-lp-solver/SKILL.md`                                                                             |
| Tabel bahan, input target, tampilan hasil          | `.agent/skills/ui-formulation-grid/SKILL.md`                                                                         |
| Arah visual & estetika frontend anti-generik       | `.agent/skills/frontend-design/SKILL.md`                                                                             |
| Dial variasi layout, animasi, kepadatan & gate     | `.agent/skills/taste-skill/SKILL.md`                                                                                 |
| Audit aksesibilitas & Web Interface Guidelines     | `.agent/skills/web-design-guidelines/SKILL.md`                                                                       |
| Inteligensi sistem desain, palet, tipografi, stack | `.agent/skills/ui-ux-pro-max/SKILL.md`                                                                               |
| Spesialis Agency Agents (283 skill `agency-*`)     | `.agent/skills/agency-*/SKILL.md` (mis. `agency-frontend-developer`, `agency-ui-designer`, `agency-reality-checker`) |
| Sinkronisasi dokumentasi (selalu di akhir tugas)   | `.agent/skills/docs-sync-maintainer/SKILL.md`                                                                        |

## 3. Konvensi TypeScript (ketat)

- `tsconfig`: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Dilarang `any`, `as unknown as`, dan `@ts-ignore` tanpa komentar justifikasi.
- Tipe domain hanya didefinisikan di `src/types/`; jangan duplikasi.
- Gunakan `readonly` untuk data input; fungsi domain/solver bersifat **murni** dan bebas React.
- Penamaan: `PascalCase` komponen & tipe, `camelCase` fungsi/variabel, `kebab-case` nama file non-komponen.
- Validasi data eksternal (impor JSON/CSV) di batas sistem sebelum masuk ke domain.

## 4. Prinsip Offline-First

- Tidak ada panggilan jaringan wajib saat runtime. Semua aset (termasuk `highs.wasm`) di-bundle dan di-cache Service Worker.
- Data pengguna disimpan di IndexedDB; jangan gunakan `localStorage` untuk data besar.
- Solver dijalankan di **Web Worker** agar UI tidak membeku.

## 5. Akurasi Matematis Formulasi

- Proporsi bahan dinyatakan sebagai fraksi `x_i ∈ [0,1]` dengan `Σ x_i = 1` (UI menampilkan %).
- Jangan pernah mencampur basis As-Fed dan BK dalam satu model; normalisasi dulu (lihat skill domain).
- Status solver selain `Optimal` **tidak boleh** ditampilkan sebagai hasil valid.
- Verifikasi pasca-solve: hitung ulang nutrien dari `x_i` dan cek semua batas dengan toleransi `1e-6`.
- Bulatkan **hanya** pada lapisan tampilan, bukan di perhitungan.
- Setiap perubahan solver wajib disertai unit test feasible & infeasible.

## 6. Kewajiban Dokumentasi

Setiap fitur/modul yang selesai **wajib** memperbarui dokumentasi terkait (`README.md`, `ROADMAP.md`, `docs/`) dalam commit/PR yang sama. Ikuti `docs-sync-maintainer`.

## 7. Larangan

- Jangan menghapus/mengubah `.git`, `.gitignore`, `LICENSE` tanpa instruksi eksplisit.
- Jangan menambah data nutrien tanpa sumber.
- Jangan menambah dependensi berat tanpa alasan di deskripsi PR.

## 8. Definition of Done

Lint ✅ · Test ✅ · Build ✅ · Dokumentasi diperbarui ✅ · Checklist PR terisi ✅

## 9. Aturan Wajib UI/UX & Ekosistem Desain Frontend

Berlaku otomatis di setiap pembuatan atau modifikasi frontend (`src/components/**`, `src/App.tsx`, `src/index.css`, `index.html`) — melengkapi `.gemini/GEMINI.md`:

- **Aktivasi Otomatis Skills:** Sebelum menulis kode UI, baca `DESIGN.md` di root proyek dan muat `.agent/skills/frontend-design/SKILL.md`, `.agent/skills/taste-skill/SKILL.md`, `.agent/skills/web-design-guidelines/SKILL.md`, `.agent/skills/ui-ux-pro-max/SKILL.md` (jalankan CLI `scripts/search.py` via `uv run --python 3.12 .agent/skills/ui-ux-pro-max/scripts/search.py ...` bila `python3` tidak ada di PATH), serta `.agent/skills/ui-formulation-grid/SKILL.md` dan skill `agency-*` yang relevan (mis. `agency-frontend-developer`, `agency-ui-designer`, `agency-reality-checker`).
- **Anti-Generic Rule:** Dilarang menggunakan gradien ungu default atau layout 3 kartu kembar tanpa alasan. Wajib baca `DESIGN.md` dan ikuti dial Taste Skill (`VARIASI_LAYOUT: 8/10`, `ANIMASI: 6/10`, `KEPADATAN: 4/10`).
- **Mandatory Microinteractions:** Setiap elemen interaktif WAJIB memiliki `button animation` (efek tekan/scale + subtle glow), `card hover` (elevasi halus saat kursor menyentuh), dan dilarang menggunakan teks `"Loading..."` biasa—wajib gunakan `skeleton shimmer` (dengan tetap menghormati `prefers-reduced-motion`).
- **Self-Audit Loop:** Setelah selesai menulis kode UI, wajib audit kode terhadap aturan `web-design-guidelines` dan jalankan `playwright-cli` untuk mengambil screenshot serta memverifikasi tidak ada komponen yang bertabrakan (pada viewport desktop dan mobile), lalu hapus direktori hasil screenshot sementara bila tidak dimaksudkan masuk ke git.
