"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";

import { apiFetch, TENANT_TOKEN_STORAGE_KEY } from "@/lib/api";
import type { Submission } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ListItem, StaggerList } from "@/components/motion";
import { CardListSkeleton } from "@/components/skeletons";
import { SubmissionStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export default function PortalSubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.localStorage.getItem(TENANT_TOKEN_STORAGE_KEY)) {
      router.replace("/portal");
      return;
    }
    apiFetch<Submission[]>("/submissions", { tokenKey: TENANT_TOKEN_STORAGE_KEY })
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">My reports</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Everything you&apos;ve reported, newest first.
      </p>

      {loading ? (
        <CardListSkeleton count={3} className="space-y-3" />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No reports yet"
          description="When you report an issue, it'll show up here so you can track it."
          action={
            <Button asChild>
              <Link href="/portal/submit">
                <Plus className="size-4" />
                Report an issue
              </Link>
            </Button>
          }
        />
      ) : (
        <StaggerList className="space-y-3">
          {submissions.map((submission) => (
            <ListItem key={submission.id}>
              <Link
                href={`/portal/submissions/${submission.id}`}
                className="block rounded-xl bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    {new Date(submission.created_at).toLocaleDateString()}
                  </p>
                  <SubmissionStatusBadge status={submission.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-foreground">
                  {submission.description}
                </p>
              </Link>
            </ListItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
