import { describe, expect, it } from "vitest";

import {
  EM_DASH,
  formatDate,
  formatDateTime,
  formatMonthlyRent,
  formatRelative,
  formatZAR,
  formatZARParts,
} from "./format";

describe("formatZAR", () => {
  it("formats a whole rand amount with no decimals", () => {
    expect(formatZAR(6500)).toBe("R 6 500");
  });

  it("accepts a string, since Pydantic may serialise Decimal that way", () => {
    expect(formatZAR("6500.00")).toBe("R 6 500");
  });

  it("keeps two decimals when asked", () => {
    expect(formatZAR(6500.5, { decimals: true })).toBe("R 6 500,50");
  });

  it("returns an em dash for unparseable input", () => {
    expect(formatZAR("not a number")).toBe(EM_DASH);
  });

  it("emits no non-breaking spaces", () => {
    expect(formatZAR(1234567)).not.toMatch(/[\u00A0\u202F\u2007]/);
  });
});

describe("formatZARParts", () => {
  it("splits the symbol off the digits", () => {
    expect(formatZARParts(6500)).toEqual({ symbol: "R", amount: "6 500" });
  });

  it("degrades to an em dash amount on bad input", () => {
    expect(formatZARParts(Number.NaN)).toEqual({ symbol: "R", amount: EM_DASH });
  });
});

describe("formatMonthlyRent", () => {
  it("appends the period", () => {
    expect(formatMonthlyRent(6500)).toBe("R 6 500 / month");
  });
});

describe("formatDate", () => {
  it("formats an ISO date", () => {
    expect(formatDate("2026-01-12T10:00:00Z")).toBe("12 Jan 2026");
  });

  it("handles null and empty input", () => {
    expect(formatDate(null)).toBe(EM_DASH);
    expect(formatDate("")).toBe(EM_DASH);
  });

  it("handles an invalid date string", () => {
    expect(formatDate("nonsense")).toBe(EM_DASH);
  });
});

describe("formatDateTime", () => {
  it("includes a 24-hour time", () => {
    expect(formatDateTime("2026-01-12T10:00:00Z")).toMatch(/12 Jan 2026, \d{2}:\d{2}/);
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-01-12T12:00:00Z");

  it("reports sub-minute gaps as just now", () => {
    expect(formatRelative("2026-01-12T11:59:30Z", now)).toBe("just now");
  });

  it("reports minutes", () => {
    expect(formatRelative("2026-01-12T11:30:00Z", now)).toBe("30m ago");
  });

  it("reports hours", () => {
    expect(formatRelative("2026-01-12T09:00:00Z", now)).toBe("3h ago");
  });

  it("reports days", () => {
    expect(formatRelative("2026-01-07T12:00:00Z", now)).toBe("5d ago");
  });

  it("falls back to an absolute date past 30 days", () => {
    expect(formatRelative("2025-10-01T12:00:00Z", now)).toBe("01 Oct 2025");
  });

  it("handles null", () => {
    expect(formatRelative(null, now)).toBe(EM_DASH);
  });
});
