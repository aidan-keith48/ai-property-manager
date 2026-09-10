import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The canonical raised card.
 *
 * Depth here is shadow, never a border — see the --shadow-soft/--shadow-lift
 * comment in globals.css. This replaces the
 * `rounded-xl bg-card p-5 shadow-soft transition-shadow hover:shadow-lift`
 * string that was hand-copied into eight files.
 *
 * `components/ui/card.tsx` is deliberately left alone and stays the form and
 * panel container. Its base is already the same rounded-xl/bg-card/shadow-soft
 * language, so the two cannot drift apart visually, and keeping them separate
 * means a future `shadcn add` can regenerate card.tsx without clobbering this.
 *
 * Vary this with the `padding` prop, not a className override: `cn` resolves
 * conflicts from Tailwind's own scales, but it does not know about the custom
 * step names this app adds (text-metric, shadow-soft), so an override that
 * looks like it wins may not.
 */

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
} as const;

export function SurfaceCard({
  href,
  interactive,
  padding = "md",
  className,
  children,
  ...rest
}: {
  href?: string;
  interactive?: boolean;
  padding?: keyof typeof PADDING;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"div">, "children">) {
  const isInteractive = interactive ?? Boolean(href);

  const classes = cn(
    "rounded-xl bg-card shadow-soft",
    PADDING[padding],
    isInteractive && "transition-shadow hover:shadow-lift",
    href && "block h-full",
    className,
  );

  // A single <a> wrapping the whole card, never a div with a nested link:
  // the E2E suite locates rows with page.locator("a", { hasText: … }) and
  // asserts on the full row's text content.
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
