"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { apiFetch, ApiError, setTenantToken } from "@/lib/api";
import { ErrorText } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PortalVerifyPage(props: PageProps<"/portal/verify">) {
  const { token } = use(props.searchParams);
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function verify() {
      if (typeof token !== "string") {
        setError("Missing or invalid link.");
        return;
      }
      try {
        const { access_token } = await apiFetch<{ access_token: string }>(
          "/auth/tenant/magic-link/verify",
          { method: "POST", json: { token }, auth: false },
        );
        setTenantToken(access_token);
        router.replace("/portal/submit");
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "This link is invalid or has expired. Request a new one.",
        );
      }
    }
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Card className="p-6">
      {error ? (
        <>
          <h1 className="text-lg font-semibold text-foreground">Link didn&apos;t work</h1>
          <div className="mt-2">
            <ErrorText>{error}</ErrorText>
          </div>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/portal">Request a new link</Link>
          </Button>
        </>
      ) : (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying your link...</p>
        </div>
      )}
    </Card>
  );
}
