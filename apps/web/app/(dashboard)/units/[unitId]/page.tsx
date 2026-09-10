"use client";

import { use, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Bath, BedDouble, DoorOpen, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api";
import { formatDate, formatZARParts } from "@/lib/format";
import type { Lease, LeaseDocument, Tenant, Unit } from "@/lib/types";
import { formatMaxUploadSize, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { ActivityLog } from "@/components/activity-log";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { MetaChip, MetaChipRow } from "@/components/meta-chip";
import { DetailSkeleton } from "@/components/skeletons";
import { LeaseStatusBadge } from "@/components/status-badge";
import { ErrorText, PageHeader, SectionHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [uploading, setUploading] = useState(false);

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
    if (!selectedTenantId) {
      const message = "Select a tenant before creating the lease";
      setError(message);
      toast.error(message);
      return;
    }
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
      toast.success("Lease created");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create lease";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEndLease() {
    if (!activeLease) return;
    try {
      await apiFetch(`/leases/${activeLease.id}/end`, { method: "POST", json: {} });
      await loadData();
      toast.success("Lease ended");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to end lease");
    }
  }

  async function handleUploadDocument() {
    const file = fileInputRef.current?.files?.[0];
    if (!activeLease || !file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      const message = `File exceeds the ${formatMaxUploadSize()} limit`;
      setError(message);
      toast.error(message);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      await apiFetch(`/leases/${activeLease.id}/documents`, { method: "POST", formData });
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadData();
      toast.success("Document uploaded");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to upload document";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(documentId: number) {
    if (!activeLease) return;
    try {
      await apiFetch(`/leases/${activeLease.id}/documents/${documentId}`, { method: "DELETE" });
      await loadData();
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete document");
    }
  }

  if (notFound) {
    return (
      <EmptyState
        icon={DoorOpen}
        title="Unit not found"
        description="This unit doesn't exist or you don't have access to it."
        action={
          <Button asChild variant="outline">
            <Link href="/properties">
              <ArrowLeft className="size-4" />
              Back to properties
            </Link>
          </Button>
        }
      />
    );
  }

  if (loading || !unit) {
    return <DetailSkeleton />;
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3 text-muted-foreground">
        <Link href={`/properties/${unit.property_id}`}>
          <ArrowLeft className="size-4" />
          Back to property
        </Link>
      </Button>

      <PageHeader
        eyebrow="Unit"
        size="display"
        title={`Unit ${unit.unit_label}`}
        description={
          <MetaChipRow>
            <MetaChip icon={BedDouble}>{unit.bedrooms ?? "?"} bed</MetaChip>
            <MetaChip icon={Bath}>{unit.bathrooms ?? "?"} bath</MetaChip>
          </MetaChipRow>
        }
      />

      {activeLease ? (
        <Card className="mb-8 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Current lease
            </h2>
            <LeaseStatusBadge status={activeLease.status} />
          </div>

          <p className="mt-5 font-heading text-metric tabular-nums text-foreground">
            <span className="mr-1.5 align-baseline text-lg font-semibold text-muted-foreground">
              {formatZARParts(activeLease.rent_amount).symbol}
            </span>
            {formatZARParts(activeLease.rent_amount).amount}
            <span className="ml-1.5 align-baseline text-sm font-medium text-muted-foreground">
              / month
            </span>
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="eyebrow text-muted-foreground">Tenant</dt>
              <dd className="mt-1.5 text-sm font-medium">
                <Link
                  href={`/tenants/${activeLease.tenant_id}`}
                  className="text-primary hover:underline"
                >
                  {tenantById.get(activeLease.tenant_id)?.name ?? `#${activeLease.tenant_id}`}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-muted-foreground">Start date</dt>
              <dd className="mt-1.5 text-sm font-medium text-foreground">
                {formatDate(activeLease.start_date)}
              </dd>
            </div>
          </dl>

          <ConfirmDialog
            title="End this lease?"
            description="The tenant will be unassigned from this unit. Lease history is kept."
            confirmLabel="End lease"
            onConfirm={handleEndLease}
            trigger={
              <Button variant="destructive-soft" size="sm" className="mt-5 self-start">
                End lease
              </Button>
            }
          />

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">Lease documents</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              PDFs and ID copies. Only you and the tenant on this lease can open them.
            </p>

            {documents.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">Document #{doc.id}</span>
                      <MetaChip className="shrink-0 bg-card">{doc.file_type}</MetaChip>
                    </span>
                    <ConfirmDialog
                      title="Delete this document?"
                      description="This permanently removes the file. This can't be undone."
                      confirmLabel="Delete"
                      onConfirm={() => handleDeleteDocument(doc.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete document ${doc.id}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="max-w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadDocument}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-8 p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight text-foreground">
            Assign a tenant
          </h2>
          {availableTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenants without an active lease. Add one from the{" "}
              <Link href="/tenants" className="text-primary hover:underline">
                Tenants
              </Link>{" "}
              page first.
            </p>
          ) : (
            <form onSubmit={handleCreateLease} className="flex flex-wrap items-end gap-4">
              <div className="min-w-44">
                <Label htmlFor="lease-tenant" className="mb-2">
                  Tenant
                </Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger id="lease-tenant" className="w-full">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTenants.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lease-start" className="mb-2">
                  Start date
                </Label>
                <Input
                  id="lease-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="w-32">
                <Label htmlFor="lease-rent" className="mb-2">
                  Rent (R)
                </Label>
                <Input
                  id="lease-rent"
                  type="number"
                  min={0}
                  step="0.01"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create lease"}
              </Button>
            </form>
          )}
          <ErrorText>{error}</ErrorText>
        </Card>
      )}

      {/* Deliberately not tabbed. tabs.tsx is the obvious candidate here, but
          activity-log.spec.ts asserts "Unit added" is visible on load, and a
          non-default tab would hide it. */}
      <SectionHeader title="Activity" className="mt-10" />
      <ActivityLog fetchPath={`/units/${unitId}/activity`} />
    </div>
  );
}
