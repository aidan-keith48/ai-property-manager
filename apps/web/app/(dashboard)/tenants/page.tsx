"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { apiFetch, ApiError } from "@/lib/api";
import type { Tenant } from "@/lib/types";
import { Button, Card, ErrorText, Input, PageHeader } from "@/components/ui";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadTenants() {
    setLoading(true);
    try {
      setTenants(await apiFetch<Tenant[]>("/tenants"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount, no data-fetching library in Phase 1
    loadTenants();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch<Tenant>("/tenants", {
        method: "POST",
        json: { name, email, phone: phone || null },
      });
      setName("");
      setEmail("");
      setPhone("");
      await loadTenants();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tenant");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Tenants" />

      <Card className="mb-6">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-32">
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 min-w-32">
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting}>
            Add Tenant
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : tenants.length === 0 ? (
        <p className="text-sm text-slate-500">No tenants yet. Add one above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tenants.map((tenant) => (
            <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
              <Card className="transition hover:border-slate-400">
                <h2 className="font-medium text-slate-900">{tenant.name}</h2>
                <p className="text-sm text-slate-600">{tenant.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {tenant.unit_id ? `Assigned to unit #${tenant.unit_id}` : "No active lease"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
