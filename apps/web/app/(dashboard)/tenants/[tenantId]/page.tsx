"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, DoorOpen, Mail, Phone, Users } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api";
import type { Tenant } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { MetaChip, MetaChipRow } from "@/components/meta-chip";
import { PropertyIdentity } from "@/components/property-identity";
import { DetailSkeleton } from "@/components/skeletons";
import { ErrorText, PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      toast.success("Changes saved");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update tenant";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await apiFetch(`/tenants/${tenantId}`, { method: "DELETE" });
      toast.success("Tenant deleted");
      router.replace("/tenants");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete tenant");
    }
  }

  if (notFound) {
    return (
      <EmptyState
        icon={Users}
        title="Tenant not found"
        description="This tenant doesn't exist or you don't have access to them."
        action={
          <Button asChild variant="outline">
            <Link href="/tenants">
              <ArrowLeft className="size-4" />
              Back to tenants
            </Link>
          </Button>
        }
      />
    );
  }

  if (loading || !tenant) {
    return <DetailSkeleton />;
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3 text-muted-foreground">
        <Link href="/tenants">
          <ArrowLeft className="size-4" />
          Back to tenants
        </Link>
      </Button>

      <PageHeader
        eyebrow="Tenant"
        size="display"
        title={tenant.name}
        leading={<PropertyIdentity seed={`tenant-${tenant.id}`} label={tenant.name} size="lg" />}
        description={
          <MetaChipRow>
            <MetaChip icon={Mail}>{tenant.email}</MetaChip>
            {tenant.phone ? <MetaChip icon={Phone}>{tenant.phone}</MetaChip> : null}
          </MetaChipRow>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight text-foreground">
            Contact details
          </h2>
          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="tenant-name" className="mb-2">
                Name
              </Label>
              <Input
                id="tenant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="tenant-email" className="mb-2">
                Email
              </Label>
              <Input
                id="tenant-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="tenant-phone" className="mb-2">
                Phone
              </Label>
              <Input
                id="tenant-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <ErrorText>{error}</ErrorText>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save changes"}
              </Button>
              <ConfirmDialog
                title="Delete this tenant?"
                description="This permanently removes the tenant record. This can't be undone."
                confirmLabel="Delete tenant"
                onConfirm={handleDelete}
                trigger={
                  <Button type="button" variant="destructive-soft">
                    Delete tenant
                  </Button>
                }
              />
            </div>
          </form>
        </Card>

        <Card className="h-fit p-6">
          <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight text-foreground">
            Current unit
          </h2>
          {tenant.unit_id ? (
            <Link
              href={`/units/${tenant.unit_id}`}
              className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-3 transition-colors hover:bg-muted"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <DoorOpen className="size-4" />
              </span>
              <span className="text-sm font-medium text-primary">
                Unit #{tenant.unit_id}
              </span>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active lease. Assign this tenant from a unit&apos;s page.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
