"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api";
import { PropertyIdentity } from "@/components/property-identity";
import { ErrorText } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  if (sent) {
    return (
      <Card className="p-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <MailCheck className="size-5" />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
          Check your inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          If that email is registered, we&apos;ve sent you a sign-in link. It expires shortly,
          so use it soon.
        </p>

        {devToken && (
          <div className="mt-6 rounded-lg border border-dashed border-status-open-foreground/40 bg-status-open/40 p-4">
            <Badge className="bg-status-open text-status-open-foreground">Dev only</Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              No email provider is configured yet, so here&apos;s the link directly:
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/portal/verify?token=${encodeURIComponent(devToken)}`}>
                Continue to submission form
              </Link>
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div>
      {/* Hero treatment: this is the tenant's first impression of the product
          and the one portal screen that isn't a working surface. */}
      <PropertyIdentity
        seed="portal-hero"
        label="Report"
        variant="plain"
        size="hero"
        className="mb-6 !rounded-xl"
      >
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <p className="text-eyebrow uppercase text-white/70">Tenant portal</p>
          <p className="mt-2 font-heading text-display-sm text-white">
            Something broken?
            <br />
            Tell us in a minute.
          </p>
        </div>
      </PropertyIdentity>

      <Card className="p-6">
        <h1 className="font-heading text-display-sm text-foreground">Report an issue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link — no password needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <Label htmlFor="tenant-email" className="mb-2">
              Email
            </Label>
            <Input
              id="tenant-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Sending..." : "Send me a link"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
