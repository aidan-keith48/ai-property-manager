import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Neutral icon+label pill: bed/bath counts, an address, a document type.
 *
 * Deliberately not built on <Badge>. Badge is reserved for status, so keeping
 * chips visually distinct is what lets "semantic colour means status" survive
 * in an app that wants chips on nearly every card. Chips are always neutral.
 */
export function MetaChip({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-4xl bg-muted px-2.5 py-1",
        "text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function MetaChipRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
