# Matematika Formulasi (Linear Programming)

## Notasi

| Simbol                 | Arti                                      |
| ---------------------- | ----------------------------------------- |
| $i = 1..n$             | indeks bahan pakan                        |
| $k = 1..m$             | indeks nutrien                            |
| $x_i$                  | fraksi bahan $i$ dalam ransum (0–1)       |
| $c_i$                  | harga bahan $i$ per kg (pada basis model) |
| $a_{ki}$               | kandungan nutrien $k$ pada bahan $i$      |
| $b_k^{min}, b_k^{max}$ | batas nutrien $k$                         |
| $L_i, U_i$             | batas inklusi bahan $i$                   |

## Model Least-Cost

$$
\min_{x} \; Z = \sum_{i=1}^{n} c_i x_i
$$

dengan kendala:

$$
\sum_{i=1}^{n} x_i = 1
$$

$$
b_k^{min} \le \sum_{i=1}^{n} a_{ki} x_i \le b_k^{max} \quad \forall k
$$

$$
L_i \le x_i \le U_i, \quad 0 \le L_i \le U_i \le 1 \quad \forall i
$$

Kandungan nutrien campuran bersifat linear karena nutrien dinyatakan per satuan massa (% atau kcal/kg).

## Kendala Rasio

Rasio $r^{min} \le \frac{\sum a_{pi}x_i}{\sum a_{qi}x_i} \le r^{max}$ dilinearkan (penyebut positif):

$$
\sum_i (a_{pi} - r^{min} a_{qi}) x_i \ge 0, \qquad \sum_i (a_{pi} - r^{max} a_{qi}) x_i \le 0
$$

## Konversi Basis

$$
a^{DM} = a^{AF} \cdot \frac{100}{BK}, \qquad c^{DM} = c^{AF} \cdot \frac{100}{BK}
$$

Proporsi As-Fed dari solusi berbasis BK:

$$
x_i^{AF} = \frac{x_i / BK_i}{\sum_j x_j / BK_j}
$$

## Infeasibility

Model tidak layak bila tidak ada $x$ yang memenuhi semua kendala. Syarat perlu (pra-pemeriksaan):

- $\max_i a_{ki} \ge b_k^{min}$ dan $\min_i a_{ki} \le b_k^{max}$ untuk setiap $k$ (dengan bahan aktif)
- $\sum_i L_i \le 1 \le \sum_i U_i$

## Contoh 2 Bahan (verifikasi manual)

Jagung (PK 8,5%, Rp5.500) dan SBM (PK 44%, Rp8.200), target PK = 20%:

$$
8.5x_1 + 44x_2 = 20,\; x_1 + x_2 = 1 \Rightarrow x_2 = \frac{11.5}{35.5} \approx 0.3239,\; x_1 \approx 0.6761
$$

Biaya ≈ 5.500·0,6761 + 8.200·0,3239 ≈ **Rp6.374/kg**. Kasus ini dipakai sebagai unit test acuan.

## Analisis Sensitivitas (Fase 3)

- _Shadow price_ (nilai dual) kendala nutrien: perubahan biaya per kenaikan satu satuan target.
- _Reduced cost_ bahan tak terpakai: penurunan harga yang dibutuhkan agar bahan masuk ransum.
