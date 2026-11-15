# GEMINI.md — Aturan Wajib Workspace Open Formul

Aturan ini berlaku otomatis untuk setiap pembuatan, perubahan, dan audit UI/frontend di repositori Open Formul (melengkapi [AGENTS.md](../AGENTS.md)).

## 1. Ekosistem UI/UX & Agency Skills Aktif

Sebelum menulis atau mengubah kode frontend (`src/components/**`, `src/App.tsx`, `src/index.css`, `index.html`), agent **wajib**:

1. Membaca `DESIGN.md` di root project sebagai acuan sistem desain.
2. Memuat skill modular terkait di `.agent/skills/`:
   - `.agent/skills/frontend-design/SKILL.md`
   - `.agent/skills/taste-skill/SKILL.md`
   - `.agent/skills/web-design-guidelines/SKILL.md`
   - `.agent/skills/ui-ux-pro-max/SKILL.md` (gunakan `uv run --python 3.12 .agent/skills/ui-ux-pro-max/scripts/search.py ...` bila `python3` tidak tersedia di PATH Windows)
   - `.agent/skills/ui-formulation-grid/SKILL.md` (khusus domain grid formulasi pakan)
   - Skill `agency-*` yang relevan dari `msitarzewski/agency-agents` di `.agent/skills/agency-*/SKILL.md` (mis. `agency-frontend-developer`, `agency-ui-designer`, `agency-ux-architect`, `agency-reality-checker`).

## 2. Aturan Wajib Desain & Interaksi UI

- **Anti-Generic Rule:** Dilarang menggunakan gradien ungu default atau layout 3 kartu kembar tanpa alasan. Wajib baca `DESIGN.md` dan ikuti dial Taste Skill (`VARIASI_LAYOUT: 8/10`, `ANIMASI: 6/10`, `KEPADATAN: 4/10`).
- **Mandatory Microinteractions:** Setiap elemen interaktif WAJIB memiliki `button animation` (efek tekan/scale + subtle glow), `card hover` (elevasi halus saat kursor menyentuh), dan dilarang menggunakan teks `"Loading..."` biasa—wajib gunakan `skeleton shimmer` (serta hormati `prefers-reduced-motion`).
- **Self-Audit Loop:** Setelah selesai menulis kode UI, wajib audit kode terhadap aturan `web-design-guidelines` dan jalankan `playwright-cli` untuk mengambil screenshot serta memverifikasi tidak ada komponen yang bertabrakan (pada viewport desktop dan mobile), lalu bersihkan artefak screenshot sementara jika tidak perlu disimpan ke repo.

## 3. Konsistensi Teknis Proyek

- Patuhi seluruh aturan TypeScript ketat, prinsip _offline-first_, akurasi matematis formulasi, dan kewajiban sinkronisasi dokumentasi (`docs-sync-maintainer`) yang tertulis di `AGENTS.md`.
