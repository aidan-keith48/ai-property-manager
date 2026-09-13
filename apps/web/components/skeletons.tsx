import { SurfaceCard } from "@/components/surface";
import { Skeleton } from "@/components/ui/skeleton";

/** Card-shaped placeholders that mirror the real list card's layout, so lists
 * don't flash a blank screen or a bare spinner while fetching. Built on the
 * same SurfaceCard as the real rows so the two can't drift apart. */
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
        <SurfaceCard key={i}>
          <div className="flex items-start gap-4">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="mt-2 h-4 w-2/5" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-56" />
      <SurfaceCard>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-3 h-3 w-2/3" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </SurfaceCard>
    </div>
  );
}
