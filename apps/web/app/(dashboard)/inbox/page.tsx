"use client";

import { useEffect, useState } from "react";
import { Inbox as InboxIcon, MessageSquare } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { InboxSubmissionItem, Property, SubmissionStatus, Tenant } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { FilterChips, type FilterOption } from "@/components/filter-chips";
import { ListRow } from "@/components/list-row";
import { MetaChip } from "@/components/meta-chip";
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
import { formatRelative } from "@/lib/format";

// Radix Select reserves "" as a value, so "all" is the sentinel for no filter.
const ALL = "all";

/** Status is chips rather than a select: the option set is small and fixed,
 *  and it matches the reference designs. Property and tenant stay selects —
 *  those lists are unbounded, and the inbox spec addresses them positionally
 *  (getByRole("combobox").nth(1)), so only the last select could be removed
 *  without shifting the indices it depends on. */
const STATUS_FILTER_OPTIONS: FilterOption<SubmissionStatus | typeof ALL>[] = [
  { value: ALL, label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

export default function InboxPage() {
  const [items, setItems] = useState<InboxSubmissionItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [propertyFilter, setPropertyFilter] = useState(ALL);
  const [tenantFilter, setTenantFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
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
    if (statusFilter !== ALL) params.set("status", statusFilter);
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
  }, [propertyFilter, tenantFilter, statusFilter]);

  const isFiltered = propertyFilter !== ALL || tenantFilter !== ALL || statusFilter !== ALL;

  return (
    <div>
      <PageHeader
        eyebrow="Maintenance"
        size="display"
        title="Inbox"
        description="Everything your tenants have reported, in one place."
      />

      <FilterChips
        options={STATUS_FILTER_OPTIONS}
        value={statusFilter as SubmissionStatus | typeof ALL}
        onChange={setStatusFilter}
        ariaLabel="Filter by status"
        className="mb-3"
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
                  <div className="space-y-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    <MetaChip icon={MessageSquare}>{item.message_count}</MetaChip>
                  </div>
                }
              />
            </ListItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
