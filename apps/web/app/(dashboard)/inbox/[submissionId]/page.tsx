"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { apiFetch, ApiError } from "@/lib/api";
import type { InboxSubmissionDetail, SubmissionMessage } from "@/lib/types";
import { AuthedImage, Button, Card, ErrorText, PageHeader } from "@/components/ui";

export default function InboxThreadPage(props: PageProps<"/inbox/[submissionId]">) {
  const { submissionId } = use(props.params);

  const [detail, setDetail] = useState<InboxSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadDetail() {
    setLoading(true);
    setDetail(await apiFetch<InboxSubmissionDetail>(`/inbox/${submissionId}`));
    setLoading(false);
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !detail) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <PageHeader title={`${detail.tenant_name} — ${detail.property_name} / ${detail.unit_label}`}>
        <Link href="/inbox" className="text-sm font-medium text-slate-600 underline">
          Back to inbox
        </Link>
      </PageHeader>

      <Card className="mb-6">
        <p className="text-sm text-slate-700">{detail.submission.description}</p>
        {detail.submission.photo_paths.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.submission.photo_paths.map((_, index) => (
              <AuthedImage
                key={index}
                path={`/submissions/${detail.submission.id}/photos/${index}`}
                alt={`Submission photo ${index + 1}`}
                className="h-24 w-24 rounded object-cover"
              />
            ))}
          </div>
        )}
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-slate-900">Conversation</h2>
      <div className="mb-4 flex flex-col gap-2">
        {detail.messages.map((message) => (
          <div key={message.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
            <p className="text-slate-700">{message.content}</p>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(message.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <form onSubmit={handleReply} className="flex flex-col gap-2">
          <textarea
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            rows={3}
            placeholder="Reply to this tenant..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            required
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? "Sending..." : "Send Reply"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
