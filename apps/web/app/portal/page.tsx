"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { apiFetch, ApiError } from "@/lib/api";
import { Button, Card, ErrorText, Input } from "@/components/ui";

export default function PortalRequestLinkPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { debug_token } = await apiFetch<{ message: string; debug_token: string | null }>(
        "/auth/tenant/magic-link/request",
        { method: "POST", json: { email }, auth: false },
      );
      setSent(true);
      setDevToken(debug_token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to request a link");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-sm">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Report an issue</h1>
      {sent ? (
        <div className="text-sm text-slate-700">
          <p>
            If that email is registered, we&apos;ve sent a sign-in link — check your inbox.
          </p>
          {devToken && (
            <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-medium text-amber-800">
                Dev mode — no email provider is configured yet, so here&apos;s the link directly:
              </p>
              <Link
                href={`/portal/verify?token=${encodeURIComponent(devToken)}`}
                className="break-all text-sm font-medium text-amber-900 underline"
              >
                Continue to submission form
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            Enter your email and we&apos;ll send you a link to report a maintenance issue —
            no password needed.
          </p>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send me a link"}
          </Button>
        </form>
      )}
    </Card>
  );
}
