"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { apiFetch, ApiError, TENANT_TOKEN_STORAGE_KEY } from "@/lib/api";
import type { Submission, SubmissionMessage } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { DetailSkeleton } from "@/components/skeletons";
import { SubmissionStatusBadge } from "@/components/status-badge";
import { AuthedImage } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PortalSubmissionDetailPage(
  props: PageProps<"/portal/submissions/[submissionId]">
) {
  const { submissionId } = use(props.params);
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [messages, setMessages] = useState<SubmissionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(TENANT_TOKEN_STORAGE_KEY)) {
      router.replace("/portal");
      return;
    }
    async function load() {
      try {
        const [submissionData, messagesData] = await Promise.all([
          apiFetch<Submission>(`/submissions/${submissionId}`, {
            tokenKey: TENANT_TOKEN_STORAGE_KEY,
          }),
          apiFetch<SubmissionMessage[]>(`/submissions/${submissionId}/messages`, {
            tokenKey: TENANT_TOKEN_STORAGE_KEY,
          }),
        ]);
        setSubmission(submissionData);
        setMessages(messagesData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          throw err;
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [submissionId, router]);

  if (notFound) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Report not found"
        description="This report doesn't exist or isn't yours."
        action={
          <Button asChild variant="outline">
            <Link href="/portal/submissions">
              <ArrowLeft className="size-4" />
              Back to my reports
            </Link>
          </Button>
        }
      />
    );
  }

  if (loading || !submission) {
    return <DetailSkeleton />;
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3 text-muted-foreground">
        <Link href="/portal/submissions">
          <ArrowLeft className="size-4" />
          Back to my reports
        </Link>
      </Button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Report #{submission.id}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(submission.created_at).toLocaleString()}
          </p>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      <Card className="mb-6 p-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">What you reported</h2>
        <p className="text-sm text-muted-foreground">{submission.description}</p>
        {submission.photo_paths.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {submission.photo_paths.map((_, index) => (
              <AuthedImage
                key={index}
                path={`/submissions/${submission.id}/photos/${index}`}
                tokenKey={TENANT_TOKEN_STORAGE_KEY}
                alt={`Photo ${index + 1}`}
                className="size-24 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </Card>

      <h2 className="mb-4 text-lg font-semibold text-foreground">Updates</h2>
      <div className="flex flex-col gap-3">
        {messages.map((message) => {
          // Outbound = from the landlord to you.
          const fromLandlord = message.direction === "outbound";
          return (
            <div
              key={message.id}
              className={cn("flex", fromLandlord ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-soft",
                  fromLandlord
                    ? "bg-card text-card-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <p>{message.content}</p>
                <p
                  className={cn(
                    "mt-1.5 text-xs",
                    fromLandlord ? "text-muted-foreground" : "text-primary-foreground/70"
                  )}
                >
                  {new Date(message.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
