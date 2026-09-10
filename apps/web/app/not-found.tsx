import Link from "next/link";
import { Compass } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md">
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="That link doesn't lead anywhere. It may have been moved, or the address may be mistyped."
          action={
            <Button asChild>
              <Link href="/">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
