import { CardListSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      <CardListSkeleton count={3} className="space-y-3" />
    </div>
  );
}
