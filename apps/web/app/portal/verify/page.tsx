"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, ApiError, setTenantToken } from "@/lib/api";
import { Card, ErrorText } from "@/components/ui";

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
    <Card className="mx-auto max-w-sm text-sm text-slate-700">
      {error ? (
        <>
          <ErrorText>{error}</ErrorText>
          <a href="/portal" className="mt-2 inline-block underline">
            Request a new link
          </a>
        </>
      ) : (
        <p>Verifying your link...</p>
      )}
    </Card>
  );
}
