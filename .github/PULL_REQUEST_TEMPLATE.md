## Ringkasan

<!-- Apa yang diubah dan mengapa? -->

Closes #

## Jenis Perubahan

- [ ] ✨ Fitur baru
- [ ] 🐞 Perbaikan bug
- [ ] 🧮 Solver / matematika formulasi
- [ ] 🌽 Data bahan pakan / profil nutrien
- [ ] 🎨 UI / UX
- [ ] 📝 Dokumentasi
- [ ] ♻️ Refactor / chore

## Checklist Sebelum Merge

### Umum

- [ ] Judul PR mengikuti Conventional Commits
- [ ] `npm run lint`, `npm run test`, dan `npm run build` lulus
- [ ] Tidak ada `any` / `@ts-ignore` tanpa justifikasi
- [ ] Tidak menambah ketergantungan runtime ke jaringan (offline-first tetap terjaga)

### Akurasi Formulasi (jika relevan)

- [ ] Unit test mencakup kasus feasible **dan** infeasible
- [ ] Basis As-Fed / BK konsisten dan satuan benar
- [ ] Hasil diverifikasi terhadap hitungan manual / referensi

### Data (jika relevan)

- [ ] Sumber data dicantumkan
- [ ] Sesuai skema di `docs/data-schema.md`

### UI (jika relevan)

- [ ] Responsif di mobile & desktop
- [ ] Aksesibel (label, kontras, keyboard)
- [ ] Screenshot/GIF dilampirkan

### Dokumentasi

- [ ] `README.md` / `ROADMAP.md` / `docs/` diperbarui sesuai perubahan
