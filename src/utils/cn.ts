/** Penggabung kelas CSS kondisional tanpa dependensi eksternal. */
export function cn(...classes: readonly (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
