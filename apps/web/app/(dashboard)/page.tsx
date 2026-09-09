"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, FileText, Inbox, Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ListItem, StaggerList } from "@/components/motion";
import { SubmissionStatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { InboxSubmissionItem, Lease, Property, Tenant } from "@/lib/types";

const RECENT_LIMIT = 5;

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  loading,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  href: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-12" />
      ) : (
        <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      )}
    </Link>
  );
}

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
  const recent = submissions.slice(0, RECENT_LIMIT);
  const firstName = landlord?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
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
        />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent submissions</h2>
          {submissions.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/inbox">View all</Link>
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-5 shadow-soft">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-3 h-3 w-2/3" />
              </div>
            ))}
          </div>
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
                <Link
                  href={`/inbox/${item.id}`}
                  className="block rounded-xl bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.tenant_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.property_name} · Unit {item.unit_label}
                      </p>
                    </div>
                    <SubmissionStatusBadge status={item.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </Link>
              </ListItem>
            ))}
          </StaggerList>
        )}
      </section>
    </div>
  );
}
