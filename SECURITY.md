# Kebijakan Keamanan

## Versi yang Didukung

| Versi                | Didukung |
| -------------------- | -------- |
| `main` (pre-release) | ✅       |
| < 1.0 tag lama       | ❌       |

## Melaporkan Kerentanan

**Jangan** melaporkan kerentanan melalui issue publik.

Gunakan fitur [GitHub Private Vulnerability Reporting](../../security/advisories/new) atau email **[EMAIL KEAMANAN]** dengan menyertakan:

- Deskripsi dan dampak kerentanan
- Langkah reproduksi / proof-of-concept
- Versi/commit yang terdampak
- Saran perbaikan (opsional)

## Proses

- Konfirmasi penerimaan dalam **72 jam**.
- Penilaian awal dalam **7 hari**.
- Perbaikan dan advisory dipublikasikan setelah patch tersedia; pelapor akan dikreditkan bila berkenan.

## Ruang Lingkup Khusus

Karena Open Formul berjalan sepenuhnya di sisi klien, area yang relevan meliputi: XSS melalui data impor (JSON/CSV), _supply-chain_ dependensi npm, integritas file WASM, dan cache Service Worker.
