/**
 * Utilitas parsing dan pemformatan angka lokal Indonesia (koma & titik)
 * serta mata uang IDR. Pembulatan hanya dilakukan di fungsi format tampilan.
 */

export interface ParseLocaleOptions {
  /** Perlakukan pola satu titik ribuan seperti "5.500" sebagai 5500 (cocok untuk harga/kg batch). */
  readonly treatSingleThousandDot?: boolean;
}

export function parseLocaleDecimal(raw: string, options: ParseLocaleOptions = {}): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === ",") {
    return null;
  }

  let normalized = trimmed.replace(/\s+/g, "");
  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;

  if (commaCount > 1) {
    return null;
  }

  if (commaCount === 1 && dotCount >= 1) {
    // Format campuran Indonesia: "5.500,25" -> ribuan titik, desimal koma
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (commaCount === 1) {
    normalized = normalized.replace(",", ".");
  } else if (dotCount > 1) {
    const isGroupedThousands = /^\d{1,3}(\.\d{3})+$/.test(normalized);
    if (!isGroupedThousands) {
      return null;
    }
    normalized = normalized.replace(/\./g, "");
  } else if (dotCount === 1 && options.treatSingleThousandDot === true) {
    const isThousandPattern = /^[1-9]\d{0,2}\.\d{3}$/.test(normalized);
    if (isThousandPattern) {
      normalized = normalized.replace(".", "");
    }
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumberLocale(
  value: number,
  fractionDigits = 2,
  locale: "id-ID" | "en-US" = "id-ID",
): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCurrencyIdr(value: number, locale: "id-ID" | "en-US" = "id-ID"): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
