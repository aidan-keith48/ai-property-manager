"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, X } from "lucide-react";

import { toast } from "sonner";

import { apiFetch, ApiError, isUnauthorized, setTenantToken, TENANT_TOKEN_STORAGE_KEY } from "@/lib/api";
import type { Submission } from "@/lib/types";
import { ErrorText } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MIN_DESCRIPTION = 10;

export default function PortalSubmitPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Submission | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!window.localStorage.getItem(TENANT_TOKEN_STORAGE_KEY)) {
      router.replace("/portal");
    }
  }, [router]);

  // Object URLs are revoked when the previews change or the page unmounts.
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const validationMessage =
    description.trim().length === 0
      ? "Please describe the problem."
      : description.trim().length < MIN_DESCRIPTION
        ? `Add a little more detail (at least ${MIN_DESCRIPTION} characters).`
        : "";

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPreviews(files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })));
  }

  function clearPhotos() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreviews([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (validationMessage) return;

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
      if (isUnauthorized(err)) {
        setTenantToken(null);
        toast.error("Your session expired — request a new link.");
        router.replace("/portal");
        return;
      }
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
      <Card className="p-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-status-resolved text-status-resolved-foreground">
          <CheckCircle2 className="size-5" />
        </div>
        <h1 className="mt-4 font-heading text-display-sm text-foreground">
          Thanks — we&apos;ve got it
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your report (#{confirmed.id}) has been sent to your landlord. You&apos;ll get a reply
          here once they respond.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/portal/submissions">View my reports</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setConfirmed(null);
              setDescription("");
              setTouched(false);
              clearPhotos();
            }}
          >
            Report another issue
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="font-heading text-display-sm text-foreground">Report an issue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell your landlord what&apos;s wrong. Photos help a lot.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <div>
          <Label htmlFor="description" className="mb-2">
            What&apos;s the problem?
          </Label>
          <Textarea
            id="description"
            rows={5}
            placeholder="The kitchen tap has been leaking since Monday..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && validationMessage ? true : undefined}
          />
          {touched && validationMessage ? (
            <p className="mt-1.5 text-sm text-destructive">{validationMessage}</p>
          ) : null}
        </div>

        <div>
          <Label className="mb-2">Photos (optional)</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesChange}
            className="max-w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
          />

          {previews.length > 0 && (
            <>
              <div className="mt-3 flex flex-wrap gap-3">
                {previews.map((preview) => (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL, next/image can't handle it
                  <img
                    key={preview.url}
                    src={preview.url}
                    alt={preview.name}
                    className="size-20 rounded-lg object-cover"
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-muted-foreground"
                onClick={clearPhotos}
              >
                <X className="size-4" />
                Clear photos
              </Button>
            </>
          )}

          {previews.length === 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImagePlus className="size-3.5" />
              Add a photo so your landlord can see the problem.
            </p>
          )}
        </div>

        <ErrorText>{error}</ErrorText>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit report"}
        </Button>
      </form>
    </Card>
  );
}
