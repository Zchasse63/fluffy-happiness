import { describe, it, expect } from "vitest";

import { formatCurrency, formatPercent } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats positive cents as whole-dollar USD", () => {
    expect(formatCurrency(100)).toBe("$1");
    expect(formatCurrency(150_000)).toBe("$1,500");
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats negative amounts with a leading minus", () => {
    expect(formatCurrency(-2500)).toBe("-$25");
  });

  it("rounds half-dollar amounts to nearest dollar", () => {
    expect(formatCurrency(199_99)).toBe("$200");
    expect(formatCurrency(150)).toBe("$2");
  });
});

describe("formatPercent", () => {
  it("formats with one decimal by default", () => {
    expect(formatPercent(12)).toBe("12.0%");
    expect(formatPercent(94.357)).toBe("94.4%");
  });

  it("respects custom precision", () => {
    expect(formatPercent(12.345, 2)).toBe("12.35%");
    expect(formatPercent(50, 0)).toBe("50%");
  });
});
