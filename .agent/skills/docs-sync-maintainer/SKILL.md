---
name: docs-sync-maintainer
description: Instruksi wajib bagi AI agent untuk menyinkronkan README.md, ROADMAP.md, dan folder docs/ setiap kali modul atau fitur Open Formul selesai dibuat atau diubah. Jalankan di akhir setiap tugas yang mengubah kode, skema data, atau perilaku.
---

# Docs Sync Maintainer

## Kapan Dijalankan

Di akhir **setiap** tugas yang menambah/mengubah: fitur, modul `src/`, skema data, perintah npm, dependensi, atau perilaku solver.

## Matriks Pemetaan Perubahan → Dokumen

| Perubahan                                 | Perbarui                                           |
| ----------------------------------------- | -------------------------------------------------- |
| Fitur baru / selesai                      | `ROADMAP.md` (⬜→🟨→✅), tabel fitur `README.md`   |
| Tipe di `src/types/` atau format JSON     | `docs/data-schema.md`                              |
| Model LP / kendala / solver               | `docs/formulation-math.md`, `docs/architecture.md` |
| Alur data / modul baru / worker / storage | `docs/architecture.md` (diagram mermaid)           |
| Skrip npm / prasyarat / dependensi        | Bagian "Instalasi Lokal" `README.md`               |
| Struktur folder                           | Bagian "Struktur Repositori" `README.md`           |
| Aturan kontribusi / format data           | `CONTRIBUTING.md`, template issue                  |
| Konvensi agent                            | `AGENTS.md` atau skill terkait di `.agent/skills/` |

## Prosedur

1. Daftar file yang diubah (`git diff --name-only`).
2. Petakan ke dokumen menggunakan matriks di atas.
3. Perbarui dokumen dengan konten **faktual** sesuai kode (nama fungsi, field, perintah harus persis sama).
4. Pastikan contoh JSON di dokumen valid terhadap tipe di `src/types/`.
5. Periksa link relatif antar dokumen masih valid.
6. Laporkan di ringkasan tugas/PR: "Docs updated: …" atau "Docs: tidak ada perubahan yang diperlukan karena …".

## Gaya Penulisan

- Bahasa Indonesia untuk dokumen utama; istilah teknis Inggris dicetak miring bila perlu (_solver_, _infeasible_).
- Gunakan diagram mermaid (`flowchart`, `sequenceDiagram`) dan tabel; hindari paragraf panjang.
- Jangan menghapus konten historis ROADMAP; tandai status.
- Jangan mendokumentasikan fitur yang belum ada sebagai sudah tersedia.
