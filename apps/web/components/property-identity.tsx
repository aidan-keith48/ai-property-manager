import type { CSSProperties, ReactNode } from "react";

import { identityPattern, identityStyle, monogram } from "@/lib/identity";
import { cn } from "@/lib/utils";

/**
 * Stands in for a property photo.
 *
 * Renders a deterministic gradient with a low-opacity geometric motif and,
 * optionally, the property's monogram. Never an <img>: the inbox E2E spec
 * asserts on `locator("img").first()` to check a tenant's uploaded submission
 * photo, so a decorative image rendered earlier in the DOM would silently
 * retarget that assertion. Inline SVG and CSS gradients only.
 *
 * Use monograms for properties and tenants, but an icon tile for units — a
 * unit's label is short enough ("5E") that a monogram would render it
 * verbatim, colliding with the text locators the specs use to click through
 * to a unit.
 *
 * If real photos are added later, pass `photoUrl` and the gradient is skipped.
 */

const SIZES = {
  sm: { box: "size-10 rounded-lg", text: "text-xs" },
  md: { box: "size-12 rounded-lg", text: "text-sm" },
  lg: { box: "size-14 rounded-xl", text: "text-base" },
  hero: { box: "aspect-[16/10] w-full rounded-t-xl", text: "text-display-sm" },
} as const;

function Motif({ pattern }: { pattern: 0 | 1 | 2 | 3 }) {
  return (
    <svg
      className="absolute inset-0 size-full text-white/20"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {pattern === 0 ? (
        <>
          <circle cx="82" cy="20" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
          <circle cx="82" cy="20" r="48" fill="none" stroke="currentColor" strokeWidth="4" />
        </>
      ) : null}
      {pattern === 1 ? (
        <>
          <rect x="58" y="42" width="14" height="58" fill="currentColor" />
          <rect x="76" y="24" width="14" height="76" fill="currentColor" />
        </>
      ) : null}
      {pattern === 2 ? (
        <path d="M100 0 L100 100 L30 100 Z" fill="currentColor" />
      ) : null}
      {pattern === 3 ? (
        <>
          <rect
            x="60"
            y="18"
            width="46"
            height="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
          />
          <rect
            x="72"
            y="30"
            width="46"
            height="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
          />
        </>
      ) : null}
    </svg>
  );
}

export function PropertyIdentity({
  seed,
  label,
  size = "md",
  variant = "monogram",
  photoUrl,
  className,
  children,
}: {
  seed: string | number;
  label: string;
  size?: keyof typeof SIZES;
  variant?: "monogram" | "plain";
  photoUrl?: string;
  className?: string;
  children?: ReactNode;
}) {
  const dims = SIZES[size];

  if (photoUrl) {
    return (
      <div
        className={cn("relative overflow-hidden bg-muted bg-cover bg-center", dims.box, className)}
        style={{ backgroundImage: `url(${photoUrl})` }}
        aria-hidden
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("identity-surface relative overflow-hidden", dims.box, className)}
      style={identityStyle(seed) as CSSProperties}
      aria-hidden
    >
      <Motif pattern={identityPattern(seed)} />
      {variant === "monogram" ? (
        // Size and colour deliberately sit on different elements. `cn` groups
        // every text-* utility it doesn't recognise as a text colour, so
        // passing `text-display-sm` and `text-white/90` through one call kept
        // only the last and the monogram rendered in the inherited ink.
        <span className={cn("absolute inset-0 flex items-center justify-center", dims.text)}>
          <span className="font-heading font-bold text-white/95">{monogram(label)}</span>
        </span>
      ) : null}
      {children}
    </div>
  );
}
