import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { SurfaceCard } from "@/components/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * A headline figure. Lifted out of the dashboard page, where it was defined
 * locally and never exported.
 *
 * The numeral is the point of the card, so it carries the display face at
 * text-metric. `tabular-nums` is not optional: without it the glyphs are
 * proportional and a row of tiles visibly shifts every time a count changes.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  loading,
  delta,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  href?: string;
  loading?: boolean;
  delta?: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <SurfaceCard href={href}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-eyebrow uppercase text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              tone === "accent" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-9 w-16" />
      ) : (
        <p className="mt-3 font-heading text-metric tabular-nums text-foreground">{value}</p>
      )}

      {delta && !loading ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{delta}</p>
      ) : null}
    </SurfaceCard>
  );
}
