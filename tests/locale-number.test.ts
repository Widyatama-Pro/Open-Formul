import { describe, expect, it } from "vitest";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  parseLocaleDecimal,
} from "../src/utils/locale-number";

describe("locale-number utilities", () => {
  it("parses Indonesian comma and dot decimal strings accurately", () => {
    expect(parseLocaleDecimal("21,5")).toBe(21.5);
    expect(parseLocaleDecimal("21.5")).toBe(21.5);
    expect(parseLocaleDecimal("0,05")).toBe(0.05);
    expect(parseLocaleDecimal("1.125")).toBe(1.125);
    expect(parseLocaleDecimal("  1250  ")).toBe(1250);
  });

  it("parses thousand separators safely when paired with comma or enabled for currency", () => {
    expect(parseLocaleDecimal("5.500,25")).toBe(5500.25);
    expect(parseLocaleDecimal("1.000.000")).toBe(1000000);
    expect(parseLocaleDecimal("5.500", { treatSingleThousandDot: true })).toBe(5500);
  });

  it("returns null for empty, NaN, or non-numeric strings", () => {
    expect(parseLocaleDecimal("")).toBeNull();
    expect(parseLocaleDecimal("   ")).toBeNull();
    expect(parseLocaleDecimal("-")).toBeNull();
    expect(parseLocaleDecimal("abc")).toBeNull();
    expect(parseLocaleDecimal("12,34,56")).toBeNull();
  });

  it("formats numbers and IDR currency using id-ID locale without crashing", () => {
    expect(formatNumberLocale(67.6123, 2)).toBe("67,61");
    expect(formatNumberLocale(3350, 0)).toBe("3.350");
    expect(formatCurrencyIdr(6374.12)).toMatch(/Rp\s?6\.374/);
  });
});
