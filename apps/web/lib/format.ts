/**
 * Shared display formatters.
 *
 * Two things to know before using these:
 *
 * 1. Locale is pinned to en-ZA rather than the browser's. Rand is the only
 *    currency this product deals in, and an unpinned locale would render the
 *    same lease differently for two landlords looking at the same screen.
 *
 * 2. `formatRelative` is the one formatter whose output depends on the clock,
 *    so it differs between the server render and the browser render. Wrap its
 *    output in `<time dateTime={iso} suppressHydrationWarning>`. The rest are
 *    deterministic given a pinned locale and need no guard.
 */

// Module-level singletons — constructing Intl formatters per call is slow.
const zarWhole = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

const zarDecimal = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const EM_DASH = "—";

/** en-ZA separates groups with a narrow no-break space and may use a
 *  non-breaking space before the symbol. Normalise both to a plain space so
 *  Playwright text selectors and copy-paste stay predictable. */
function normaliseSpaces(value: string): string {
  return value.replace(/[\u00A0\u202F\u2007]/g, " ");
}

/** rent_amount is Numeric(10,2) on the API, which Pydantic may serialise as a
 *  string rather than a number. Coerce rather than trusting the TS type. */
function toNumber(amount: number | string): number | null {
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? n : null;
}

export function formatZAR(amount: number | string, opts?: { decimals?: boolean }): string {
  const n = toNumber(amount);
  if (n === null) return EM_DASH;
  return normaliseSpaces((opts?.decimals ? zarDecimal : zarWhole).format(n));
}

/** Splits the symbol off the digits so a hero numeral can render "R" small
 *  and the amount at display size. */
export function formatZARParts(amount: number | string): { symbol: string; amount: string } {
  const n = toNumber(amount);
  if (n === null) return { symbol: "R", amount: EM_DASH };
  const parts = zarWhole.formatToParts(n);
  return {
    symbol: parts.find((p) => p.type === "currency")?.value ?? "R",
    amount: normaliseSpaces(
      parts
        .filter((p) => p.type !== "currency")
        .map((p) => p.value)
        .join(""),
    ).trim(),
  };
}

export function formatMonthlyRent(amount: number | string): string {
  const n = toNumber(amount);
  if (n === null) return EM_DASH;
  return `${formatZAR(n)} / month`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EM_DASH;
  return normaliseSpaces(dateFmt.format(d));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EM_DASH;
  return normaliseSpaces(dateTimeFmt.format(d));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** `now` is injectable so tests aren't clock-dependent. Falls back to an
 *  absolute date past 30 days, where "42d ago" stops being useful. */
export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return EM_DASH;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return EM_DASH;

  const diff = now.getTime() - then.getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return formatDate(iso);
}
