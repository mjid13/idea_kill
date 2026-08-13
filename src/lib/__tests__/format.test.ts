import { describe, expect, it } from "vitest";
import { formatCompactNumber, formatCurrency, formatMonths, formatMultiple, formatPercentage } from "../format";

describe("format helpers", () => {
  it("formatCurrency renders grouped amounts with the currency symbol", () => {
    expect(formatCurrency(24500, "OMR")).toBe("OMR 24,500");
    expect(formatCurrency(1234, "USD")).toBe("$1,234");
  });

  it("formatCurrency compact renders large values with a suffix", () => {
    expect(formatCurrency(1_200_000, "USD", { compact: true })).toBe("$1.2M");
  });

  it("formatCompactNumber never returns NaN/Infinity/undefined text", () => {
    expect(formatCompactNumber(NaN)).toBe("—");
    expect(formatCompactNumber(Infinity)).toBe("—");
    expect(formatCompactNumber(undefined)).toBe("—");
    expect(formatCompactNumber(null)).toBe("—");
  });

  it("formatPercentage and formatMultiple guard bad numbers", () => {
    expect(formatPercentage(NaN)).toBe("—");
    expect(formatMultiple(Infinity)).toBe("—");
    expect(formatPercentage(4.5)).toBe("4.5%");
    expect(formatMultiple(3.8)).toBe("3.8x");
  });

  it("formatMonths pluralizes correctly", () => {
    expect(formatMonths(1)).toBe("1 month");
    expect(formatMonths(18)).toBe("18 months");
    expect(formatMonths(1, 1, "ar")).toBe("١ شهر");
    expect(formatMonths(3, 1, "ar")).toBe("٣ أشهر");
    expect(formatMonths(18, 1, "ar")).toBe("١٨ شهرًا");
    expect(formatMonths(null)).toBe("—");
  });
});
