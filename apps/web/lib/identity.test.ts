import { describe, expect, it } from "vitest";

import { hashSeed, identityPattern, identityStyle, monogram } from "./identity";

const BRAND_HUE = 259;
const HUE_SPREAD = 110;

describe("hashSeed", () => {
  it("is deterministic", () => {
    expect(hashSeed("Mountain Bay")).toBe(hashSeed("Mountain Bay"));
  });

  it("distinguishes different seeds", () => {
    expect(hashSeed(1)).not.toBe(hashSeed(2));
  });

  it("treats numeric and string seeds identically", () => {
    expect(hashSeed(42)).toBe(hashSeed("42"));
  });
});

describe("monogram", () => {
  it("takes initials from the first two words", () => {
    expect(monogram("Mountain Bay")).toBe("MB");
  });

  it("takes two letters from a single word", () => {
    expect(monogram("Riverside")).toBe("RI");
  });

  it("ignores extra words and whitespace", () => {
    expect(monogram("  Lease   Test Building ")).toBe("LT");
  });

  it("degrades on empty input", () => {
    expect(monogram("   ")).toBe("?");
  });
});

describe("identityStyle", () => {
  it("is deterministic for the same seed", () => {
    expect(identityStyle(7)).toEqual(identityStyle(7));
  });

  it("keeps hues within the spread around the brand hue", () => {
    // Generated hues must stay near the brand hue so they can never be
    // mistaken for a --status-* colour.
    for (let seed = 0; seed < 200; seed++) {
      const h1 = Number(identityStyle(seed)["--identity-h1"]);
      expect(h1).toBeGreaterThanOrEqual(BRAND_HUE - HUE_SPREAD / 2);
      expect(h1).toBeLessThanOrEqual(BRAND_HUE + HUE_SPREAD / 2);
    }
  });

  it("offsets the second stop from the first", () => {
    const style = identityStyle("Seaside");
    expect(Number(style["--identity-h2"]) - Number(style["--identity-h1"])).toBe(18);
  });

  it("emits a usable angle", () => {
    expect(identityStyle(3)["--identity-angle"]).toMatch(/^\d+deg$/);
  });
});

describe("identityPattern", () => {
  it("stays within the four available motifs", () => {
    for (let seed = 0; seed < 200; seed++) {
      expect([0, 1, 2, 3]).toContain(identityPattern(seed));
    }
  });

  it("is deterministic", () => {
    expect(identityPattern("Mountain Bay")).toBe(identityPattern("Mountain Bay"));
  });
});
