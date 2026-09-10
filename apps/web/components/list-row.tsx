import type { ReactNode } from "react";

import { SurfaceCard } from "@/components/surface";
import { cn } from "@/lib/utils";

/**
 * One row in a list of properties, tenants, leases or submissions.
 *
 * RULE: each identifier renders exactly once per row.
 *
 * Do not put the property name in both `eyebrow` and `title`, or the unit
 * label in both the leading visual and the heading. Playwright locates rows by
 * visible text (`page.click("text=…")`) under strict mode, so a value that
 * appears twice in one row fails the whole spec with a strict-mode violation
 * rather than a useful error. The redesign's most likely silent breakage is a
 * well-meaning duplicate here.
 */
export function ListRow({
  href,
  leading,
  eyebrow,
  title,
  subtitle,
  trailing,
  footer,
  className,
}: {
  href?: string;
  leading?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard href={href} className={className}>
      <div className="flex items-start gap-4">
        {leading ? <div className="shrink-0">{leading}</div> : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-eyebrow uppercase text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h3
            className={cn(
              "truncate font-heading text-base font-semibold text-foreground",
              eyebrow && "mt-1",
            )}
          >
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {trailing ? (
          <div className="flex shrink-0 flex-col items-end gap-2">{trailing}</div>
        ) : null}
      </div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </SurfaceCard>
  );
}
