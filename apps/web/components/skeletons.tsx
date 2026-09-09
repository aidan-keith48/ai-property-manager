import { Skeleton } from "@/components/ui/skeleton";

/** Card-shaped placeholders that mirror the real list card's layout, so lists
 * don't flash a blank screen or a bare spinner while fetching. */
export function CardListSkeleton({
  count = 4,
  className = "grid gap-4 sm:grid-cols-2",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-56" />
      <div className="rounded-xl bg-card p-5 shadow-soft">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-3 h-3 w-2/3" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    </div>
  );
}
