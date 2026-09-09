"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Inbox as InboxIcon, Send } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api";
import type { InboxSubmissionDetail, SubmissionMessage } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { DetailSkeleton } from "@/components/skeletons";
import { SubmissionStatusBadge } from "@/components/status-badge";
import { AuthedImage, ErrorText, PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function InboxThreadPage(props: PageProps<"/inbox/[submissionId]">) {
  const { submissionId } = use(props.params);

  const [detail, setDetail] = useState<InboxSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadDetail() {
    setLoading(true);
    try {
      setDetail(await apiFetch<InboxSubmissionDetail>(`/inbox/${submissionId}`));
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount, no data-fetching library in Phase 1
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch<SubmissionMessage>(`/inbox/${submissionId}/messages`, {
        method: "POST",
        json: { content: reply },
      });
      setReply("");
      await loadDetail();
      toast.success("Reply sent");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to send reply";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <EmptyState
        icon={InboxIcon}
        title="Submission not found"
        description="This submission doesn't exist or you don't have access to it."
        action={
          <Button asChild variant="outline">
            <Link href="/inbox">
              <ArrowLeft className="size-4" />
              Back to inbox
            </Link>
          </Button>
        }
      />
    );
  }

  if (loading || !detail) {
    return <DetailSkeleton />;
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3 text-muted-foreground">
        <Link href="/inbox">
          <ArrowLeft className="size-4" />
          Back to inbox
        </Link>
      </Button>

      <PageHeader
        title={detail.tenant_name}
        description={`${detail.property_name} · Unit ${detail.unit_label}`}
      >
        <SubmissionStatusBadge status={detail.submission.status} />
      </PageHeader>

      <Card className="mb-8 p-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Reported issue</h2>
        <p className="text-sm text-muted-foreground">{detail.submission.description}</p>
        {detail.submission.photo_paths.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {detail.submission.photo_paths.map((_, index) => (
              <AuthedImage
                key={index}
                path={`/submissions/${detail.submission.id}/photos/${index}`}
                alt={`Submission photo ${index + 1}`}
                className="size-28 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </Card>

      <h2 className="mb-4 text-lg font-semibold text-foreground">Conversation</h2>
      <div className="mb-6 flex flex-col gap-3">
        {detail.messages.map((message) => {
          // Outbound = from the landlord/system to the tenant.
          const outbound = message.direction === "outbound";
          return (
            <div
              key={message.id}
              className={cn("flex", outbound ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-soft",
                  outbound
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground"
                )}
              >
                <p>{message.content}</p>
                <p
                  className={cn(
                    "mt-1.5 text-xs",
                    outbound ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {new Date(message.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="p-6">
        <form onSubmit={handleReply} className="flex flex-col gap-3">
          <Textarea
            rows={3}
            placeholder="Reply to this tenant..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            required
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting} className="self-start">
            <Send className="size-4" />
            {submitting ? "Sending..." : "Send reply"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
