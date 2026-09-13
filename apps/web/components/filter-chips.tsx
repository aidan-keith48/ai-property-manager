"use client";

import { cn } from "@/lib/utils";

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
  count?: number;
};

/**
 * Horizontal pill filter, replacing a <Select> where the option set is small
 * and fixed.
 *
 * Plain buttons in a radiogroup rather than a Radix primitive: it needs no new
 * dependency, and critically it exposes no `role="combobox"`. The inbox E2E
 * spec addresses its remaining filters positionally
 * (`getByRole("combobox").nth(1)`), so introducing another combobox — or
 * removing one from the middle of the row — would silently retarget it.
 *
 * Only use this for bounded option sets. Property and tenant lists are
 * unbounded and stay as selects; twenty chips wrap into a wall.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5",
              "text-sm font-medium shadow-soft transition-colors",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "tabular-nums text-xs",
                  selected ? "text-primary-foreground/70" : "text-muted-foreground/70",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
