"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, isUnauthorized, setTenantToken, TENANT_TOKEN_STORAGE_KEY } from "@/lib/api";
import type { Submission } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { ListItem, StaggerList } from "@/components/motion";
import { CardListSkeleton } from "@/components/skeletons";
import { SubmissionStatusBadge } from "@/components/status-badge";
import { Eyebrow } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

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
      .catch((err) => {
        if (isUnauthorized(err)) {
          setTenantToken(null);
          toast.error("Your session expired — request a new link.");
          router.replace("/portal");
          return;
        }
        setSubmissions([]);
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div>
      <Eyebrow className="mb-2">History</Eyebrow>
      <h1 className="font-heading text-display text-foreground">My reports</h1>
      <p className="mt-2 mb-7 text-sm text-muted-foreground">
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
              <ListRow
                href={`/portal/submissions/${submission.id}`}
                eyebrow={formatDate(submission.created_at)}
                title={`Report #${submission.id}`}
                trailing={<SubmissionStatusBadge status={submission.status} />}
                footer={
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {submission.description}
                  </p>
                }
              />
            </ListItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
