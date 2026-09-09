"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import type { Tenant } from "@/lib/types";
import { Button, Card, ErrorText, Input, PageHeader } from "@/components/ui";

export default function TenantDetailPage(props: PageProps<"/tenants/[tenantId]">) {
  const { tenantId } = use(props.params);
  const router = useRouter();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadTenant() {
    setLoading(true);
    try {
      const data = await apiFetch<Tenant>(`/tenants/${tenantId}`);
      setTenant(data);
      setName(data.name);
      setEmail(data.email);
      setPhone(data.phone ?? "");
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
    loadTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch<Tenant>(`/tenants/${tenantId}`, {
        method: "PATCH",
        json: { name, email, phone: phone || null },
      });
      await loadTenant();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update tenant");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this tenant?")) return;
    await apiFetch(`/tenants/${tenantId}`, { method: "DELETE" });
    router.replace("/tenants");
  }

  if (notFound) {
    return (
      <div>
        <p className="text-sm text-slate-600">This tenant doesn&apos;t exist.</p>
        <Link href="/tenants" className="text-sm font-medium text-slate-900 underline">
          Back to tenants
        </Link>
      </div>
    );
  }

  if (loading || !tenant) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <PageHeader title={tenant.name}>
        <Link href="/tenants" className="text-sm font-medium text-slate-600 underline">
          Back to tenants
        </Link>
      </PageHeader>

      <Card className="mb-6 max-w-md">
        <form onSubmit={handleUpdate} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              Save
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete}>
              Delete Tenant
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-sm text-slate-600">
        {tenant.unit_id ? (
          <>
            Currently assigned to{" "}
            <Link href={`/units/${tenant.unit_id}`} className="font-medium underline">
              unit #{tenant.unit_id}
            </Link>
          </>
        ) : (
          "No active lease — assign this tenant to a unit from that unit's page."
        )}
      </p>
    </div>
  );
}
