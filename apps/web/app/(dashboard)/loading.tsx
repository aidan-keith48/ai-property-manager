import { CardListSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-segment fallback. Note this fires only while a route's JS chunk is
 * still loading on navigation — nothing here suspends on data, because every
 * page is a client component fetching in a useEffect and renders its own
 * skeleton once mounted. Prefetching hides this most of the time.
 */
export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="mb-8 h-9 w-64" />
      <CardListSkeleton count={4} className="space-y-3" />
    </div>
  );
}
