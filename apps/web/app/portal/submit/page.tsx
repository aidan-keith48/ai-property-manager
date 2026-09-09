"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, ApiError, TENANT_TOKEN_STORAGE_KEY } from "@/lib/api";
import type { Submission } from "@/lib/types";
import { Button, Card, ErrorText } from "@/components/ui";

export default function PortalSubmitPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Submission | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!window.localStorage.getItem(TENANT_TOKEN_STORAGE_KEY)) {
      router.replace("/portal");
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("description", description);
      for (const file of fileInputRef.current?.files ?? []) {
        formData.append("photos", file);
      }
      const submission = await apiFetch<Submission>("/submissions", {
        method: "POST",
        formData,
        tokenKey: TENANT_TOKEN_STORAGE_KEY,
      });
      setConfirmed(submission);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to submit your issue. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <Card className="mx-auto max-w-sm text-sm text-slate-700">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Thanks — we&apos;ve got it</h1>
        <p>Your submission (#{confirmed.id}) has been received.</p>
        <p className="mt-2">
          We&apos;ve received your submission and will get back to you soon.
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => {
            setConfirmed(null);
            setDescription("");
          }}
        >
          Report another issue
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-sm">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Report an issue</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            What&apos;s the problem?
          </label>
          <textarea
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Photos (optional)
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="text-sm" />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </Card>
  );
}
