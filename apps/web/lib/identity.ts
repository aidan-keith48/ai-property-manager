/**
 * Deterministic visual identity for a property.
 *
 * The data model has no photo column, so cards would otherwise be two lines of
 * text. Rather than add a whole upload feature to serve a redesign, each
 * property derives a stable gradient and monogram from its id.
 *
 * Only hue is computed here. Lightness and chroma live in globals.css
 * (--identity-*) so the entire visual family retunes from the token layer
 * rather than from this file, and generated hues orbit the brand hue closely
 * enough that they can never be mistaken for a --status-* colour.
 *
 * Same seed always produces the same result — a property must not change
 * appearance between renders or between users.
 */

// Mirrors --identity-hue-spread in globals.css. Hue is the one value the
// gradient can't read from CSS, because it varies per property.
const BRAND_HUE = 259;
const HUE_SPREAD = 110;

/** FNV-1a. Small, fast, and well-distributed for short strings — we only need
 *  stable spread across a handful of buckets, not cryptographic quality. */
export function hashSeed(seed: string | number): number {
  const input = String(seed);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Up to two initials from the first two words, e.g. "Mountain Bay" -> "MB". */
export function monogram(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export type IdentityStyle = {
  "--identity-h1": string;
  "--identity-h2": string;
  "--identity-angle": string;
};

export function identityStyle(seed: string | number): IdentityStyle {
  const hash = hashSeed(seed);
  const offset = (hash % HUE_SPREAD) - HUE_SPREAD / 2;
  const h1 = BRAND_HUE + offset;
  return {
    "--identity-h1": String(h1),
    "--identity-h2": String(h1 + 18),
    // Four fixed angles rather than a free rotation: keeps the set coherent.
    "--identity-angle": `${115 + ((hash >>> 8) % 4) * 20}deg`,
  };
}

/** Which decorative motif to draw. Deterministic, 0-3. */
export function identityPattern(seed: string | number): 0 | 1 | 2 | 3 {
  return ((hashSeed(seed) >>> 16) % 4) as 0 | 1 | 2 | 3;
}
