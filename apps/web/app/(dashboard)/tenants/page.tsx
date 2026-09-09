"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api";
import type { Tenant } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ListItem, StaggerList } from "@/components/motion";
import { CardListSkeleton } from "@/components/skeletons";
import { ErrorText, PageHeader } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      toast.success("Tenant added");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create tenant";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Everyone renting from you, and where they currently live."
      />

      <Card className="mb-8 p-6">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
          <div className="min-w-32 flex-1">
            <Label htmlFor="tenant-name" className="mb-2">
              Name
            </Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Thandi Mokoena"
              required
            />
          </div>
          <div className="min-w-40 flex-1">
            <Label htmlFor="tenant-email" className="mb-2">
              Email
            </Label>
            <Input
              id="tenant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenant@example.com"
              required
            />
          </div>
          <div className="min-w-32 flex-1">
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
          <Button type="submit" disabled={submitting}>
            <Plus className="size-4" />
            {submitting ? "Adding..." : "Add tenant"}
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      {loading ? (
        <CardListSkeleton />
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants yet"
          description="Add your first tenant above, then assign them to a unit from that unit's page."
        />
      ) : (
        <StaggerList className="grid gap-4 sm:grid-cols-2">
          {tenants.map((tenant) => (
            <ListItem key={tenant.id}>
              <Link
                href={`/tenants/${tenant.id}`}
                className="block h-full rounded-xl bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground">{tenant.name}</h2>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {tenant.email}
                    </p>
                  </div>
                  {tenant.unit_id ? (
                    <Badge className="bg-status-active text-status-active-foreground">
                      Housed
                    </Badge>
                  ) : (
                    <Badge className="bg-status-ended text-status-ended-foreground">
                      Unassigned
                    </Badge>
                  )}
                </div>
              </Link>
            </ListItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
