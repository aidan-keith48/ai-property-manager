"use client";

import { use, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import { apiFetch, ApiError } from "@/lib/api";
import type { Lease, LeaseDocument, Tenant, Unit } from "@/lib/types";
import { ActivityLog } from "@/components/activity-log";
import { Button, Card, ErrorText, Input, PageHeader } from "@/components/ui";

export default function UnitDetailPage(props: PageProps<"/units/[unitId]">) {
  const { unitId } = use(props.params);
  const unitIdNum = Number(unitId);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [activeLease, setActiveLease] = useState<Lease | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [unitData, leases, tenantsData] = await Promise.all([
        apiFetch<Unit>(`/units/${unitId}`),
        apiFetch<Lease[]>("/leases"),
        apiFetch<Tenant[]>("/tenants"),
      ]);
      setUnit(unitData);
      setTenants(tenantsData);

      const lease = leases.find((l) => l.unit_id === unitIdNum && l.status === "active") ?? null;
      setActiveLease(lease);

      if (lease) {
        setDocuments(await apiFetch<LeaseDocument[]>(`/leases/${lease.id}/documents`));
      } else {
        setDocuments([]);
      }
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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const availableTenants = tenants.filter((t) => t.unit_id === null);

  async function handleCreateLease(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch<Lease>("/leases", {
        method: "POST",
        json: {
          unit_id: unitIdNum,
          tenant_id: Number(selectedTenantId),
          start_date: startDate,
          rent_amount: Number(rentAmount),
        },
      });
      setSelectedTenantId("");
      setStartDate("");
      setRentAmount("");
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create lease");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEndLease() {
    if (!activeLease) return;
    if (!confirm("End this lease? The tenant will be unassigned from this unit.")) return;
    await apiFetch(`/leases/${activeLease.id}/end`, { method: "POST", json: {} });
    await loadData();
  }

  async function handleUploadDocument() {
    if (!activeLease || !fileInputRef.current?.files?.[0]) return;
    const formData = new FormData();
    formData.append("file", fileInputRef.current.files[0]);
    setSubmitting(true);
    try {
      await apiFetch(`/leases/${activeLease.id}/documents`, { method: "POST", formData });
      fileInputRef.current.value = "";
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload document");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteDocument(documentId: number) {
    if (!activeLease) return;
    if (!confirm("Delete this document?")) return;
    await apiFetch(`/leases/${activeLease.id}/documents/${documentId}`, { method: "DELETE" });
    await loadData();
  }

  if (notFound) {
    return (
      <div>
        <p className="text-sm text-slate-600">
          This unit doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/properties" className="text-sm font-medium text-slate-900 underline">
          Back to properties
        </Link>
      </div>
    );
  }

  if (loading || !unit) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <PageHeader title={`Unit ${unit.unit_label}`}>
        <Link
          href={`/properties/${unit.property_id}`}
          className="text-sm font-medium text-slate-600 underline"
        >
          Back to property
        </Link>
      </PageHeader>

      {activeLease ? (
        <Card className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Current Lease</h2>
          <p className="text-sm text-slate-700">
            Tenant:{" "}
            <Link href={`/tenants/${activeLease.tenant_id}`} className="underline">
              {tenantById.get(activeLease.tenant_id)?.name ?? `#${activeLease.tenant_id}`}
            </Link>
          </p>
          <p className="text-sm text-slate-700">Rent: R{activeLease.rent_amount}</p>
          <p className="text-sm text-slate-700">Start: {activeLease.start_date}</p>
          <Button variant="danger" className="mt-3" onClick={handleEndLease}>
            End Lease
          </Button>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Lease Documents</h3>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents uploaded.</p>
            ) : (
              <ul className="mb-3 flex flex-col gap-1">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between text-sm">
                    <span>
                      Document #{doc.id} ({doc.file_type})
                    </span>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-600 underline"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" className="text-sm" />
              <Button type="button" onClick={handleUploadDocument} disabled={submitting}>
                Upload
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Assign a Tenant</h2>
          {availableTenants.length === 0 ? (
            <p className="text-sm text-slate-500">
              No tenants without an active lease. Add one from the{" "}
              <Link href="/tenants" className="underline">
                Tenants
              </Link>{" "}
              page first.
            </p>
          ) : (
            <form onSubmit={handleCreateLease} className="flex flex-wrap items-end gap-3">
              <div className="min-w-40">
                <label className="mb-1 block text-xs font-medium text-slate-600">Tenant</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  required
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                >
                  <option value="" disabled>
                    Select tenant
                  </option>
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Start date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Rent (R)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting}>
                Create Lease
              </Button>
            </form>
          )}
          <ErrorText>{error}</ErrorText>
        </Card>
      )}

      <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-900">Activity</h2>
      <ActivityLog fetchPath={`/units/${unitId}/activity`} />
    </div>
  );
}
