"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox as InboxIcon, MessageSquare } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { InboxSubmissionItem, Property, Tenant } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ListItem, StaggerList } from "@/components/motion";
import { CardListSkeleton } from "@/components/skeletons";
import { SubmissionStatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Radix Select reserves "" as a value, so "all" is the sentinel for no filter.
const ALL = "all";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxSubmissionItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [propertyFilter, setPropertyFilter] = useState(ALL);
  const [tenantFilter, setTenantFilter] = useState(ALL);
  const [loading, setLoading] = useState(true);

  async function loadFilters() {
    const [propertiesData, tenantsData] = await Promise.all([
      apiFetch<Property[]>("/properties"),
      apiFetch<Tenant[]>("/tenants"),
    ]);
    setProperties(propertiesData);
    setTenants(tenantsData);
  }

  async function loadInbox() {
    setLoading(true);
    const params = new URLSearchParams();
    if (propertyFilter !== ALL) params.set("property_id", propertyFilter);
    if (tenantFilter !== ALL) params.set("tenant_id", tenantFilter);
    const query = params.toString() ? `?${params.toString()}` : "";
    setItems(await apiFetch<InboxSubmissionItem[]>(`/inbox${query}`));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount, no data-fetching library in Phase 1
    loadFilters();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount, no data-fetching library in Phase 1
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyFilter, tenantFilter]);

  const isFiltered = propertyFilter !== ALL || tenantFilter !== ALL;

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Everything your tenants have reported, in one place."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger aria-label="Filter by property">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger aria-label="Filter by tenant">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tenants</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <CardListSkeleton count={4} className="space-y-3" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title={isFiltered ? "No submissions match these filters" : "No submissions yet"}
          description={
            isFiltered
              ? "Try clearing a filter to see more."
              : "When a tenant reports an issue from the portal, it lands here."
          }
        />
      ) : (
        <StaggerList className="space-y-3">
          {items.map((item) => (
            <ListItem key={item.id}>
              <Link
                href={`/inbox/${item.id}`}
                className="block rounded-xl bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{item.tenant_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.property_name} · Unit {item.unit_label}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <SubmissionStatusBadge status={item.status} />
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(item.last_activity_at)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="size-3" />
                      {item.message_count}
                    </span>
                  </div>
                </div>
              </Link>
            </ListItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
