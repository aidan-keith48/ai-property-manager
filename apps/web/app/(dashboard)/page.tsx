"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, FileText, Inbox, Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { ListItem, StaggerList } from "@/components/motion";
import { CardListSkeleton } from "@/components/skeletons";
import { StatCard } from "@/components/stat-card";
import { SubmissionStatusBadge } from "@/components/status-badge";
import { PageHeader, SectionHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelative } from "@/lib/format";
import type { InboxSubmissionItem, Lease, Property, Tenant } from "@/lib/types";

const RECENT_LIMIT = 5;

export default function DashboardHome() {
  const { landlord } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [submissions, setSubmissions] = useState<InboxSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Property[]>("/properties"),
      apiFetch<Tenant[]>("/tenants"),
      apiFetch<Lease[]>("/leases"),
      apiFetch<InboxSubmissionItem[]>("/inbox"),
    ])
      .then(([p, t, l, s]) => {
        setProperties(p);
        setTenants(t);
        setLeases(l);
        setSubmissions(s);
      })
      .catch(() => {
        // Individual sections render their own empty states; a failed summary
        // fetch shouldn't blank the whole dashboard.
      })
      .finally(() => setLoading(false));
  }, []);

  const activeLeases = leases.filter((l) => l.status === "active").length;
  const openSubmissions = submissions.filter((s) => s.status !== "resolved").length;
  const housedTenants = tenants.filter((t) => t.unit_id).length;
  const recent = submissions.slice(0, RECENT_LIMIT);
  const firstName = landlord?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        size="display"
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening across your properties."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Properties"
          value={properties.length}
          icon={Building2}
          href="/properties"
          loading={loading}
        />
        <StatCard
          label="Tenants"
          value={tenants.length}
          icon={Users}
          href="/tenants"
          loading={loading}
          // Occupancy without a second request — both numbers are already in state.
          delta={tenants.length > 0 ? `${housedTenants} housed` : undefined}
        />
        <StatCard
          label="Active leases"
          value={activeLeases}
          icon={FileText}
          href="/leases"
          loading={loading}
        />
        <StatCard
          label="Open issues"
          value={openSubmissions}
          icon={Inbox}
          href="/inbox"
          loading={loading}
          tone={openSubmissions > 0 ? "accent" : "default"}
        />
      </div>

      <section className="mt-10">
        <SectionHeader
          title="Recent submissions"
          action={
            submissions.length > 0 ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/inbox">View all</Link>
              </Button>
            ) : null
          }
        />

        {loading ? (
          <CardListSkeleton count={3} className="space-y-3" />
        ) : properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No properties yet"
            description="Add your first property to start tracking units, tenants and issues."
            action={
              <Button asChild>
                <Link href="/properties">
                  <Plus className="size-4" />
                  Add your first property
                </Link>
              </Button>
            }
          />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No submissions yet"
            description="When a tenant reports an issue, it lands here."
          />
        ) : (
          <StaggerList className="space-y-3">
            {recent.map((item) => (
              <ListItem key={item.id}>
                <ListRow
                  href={`/inbox/${item.id}`}
                  eyebrow={`${item.property_name} · Unit ${item.unit_label}`}
                  title={item.tenant_name}
                  trailing={
                    <>
                      <SubmissionStatusBadge status={item.status} />
                      <time
                        dateTime={item.last_activity_at}
                        className="text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatRelative(item.last_activity_at)}
                      </time>
                    </>
                  }
                  footer={
                    <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                  }
                />
              </ListItem>
            ))}
          </StaggerList>
        )}
      </section>
    </div>
  );
}
