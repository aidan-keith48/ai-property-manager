"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Render-time error boundary for the dashboard.
 *
 * Note this does not catch the `throw err` in the detail pages' load
 * functions: those run inside an async effect callback, which React error
 * boundaries never see. This exists so a genuine render error shows something
 * designed instead of Next's raw overlay.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong"
      description="This page failed to render. Trying again often clears it; if it keeps happening, the error details are in the browser console."
      action={
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      }
    />
  );
}
