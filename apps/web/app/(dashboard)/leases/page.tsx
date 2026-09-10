"use client";

import { useState } from "react";
import { CalendarRange, FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FilterChips, type FilterOption } from "@/components/filter-chips";
import { ListRow } from "@/components/list-row";
import { MetaChip } from "@/components/meta-chip";
import { ListItem, StaggerList } from "@/components/motion";
import { CardListSkeleton } from "@/components/skeletons";
import { LeaseStatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui";
import { formatDate, formatZARParts } from "@/lib/format";
import { useLeasesWithDetails } from "@/lib/use-leases";

const ALL = "all";

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: ALL, label: "All leases" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
];

export default function LeasesPage() {
  const { leases, loading } = useLeasesWithDetails();
  const [statusFilter, setStatusFilter] = useState(ALL);

  const visible =
    statusFilter === ALL ? leases : leases.filter((l) => l.status === statusFilter);

  return (
    <div>
      <PageHeader
        eyebrow="Agreements"
        size="display"
        title="Leases"
        description="Every lease across your properties, active and ended."
      />

      <FilterChips
        options={STATUS_FILTER_OPTIONS}
        value={statusFilter}
        onChange={setStatusFilter}
        ariaLabel="Filter by status"
        className="mb-6"
      />

      {loading ? (
        <CardListSkeleton count={4} className="space-y-3" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={statusFilter === ALL ? "No leases yet" : `No ${statusFilter} leases`}
          description={
            statusFilter === ALL
              ? "Assign a tenant to a unit to create the first lease."
              : "Try a different filter to see more."
          }
        />
      ) : (
        <StaggerList className="space-y-3">
          {visible.map((lease) => {
            const rent = formatZARParts(lease.rent_amount);
            return (
              <ListItem key={lease.id}>
                <ListRow
                  href={`/leases/${lease.id}`}
                  eyebrow={`${lease.property_name} · Unit ${lease.unit_label}`}
                  title={lease.tenant_name}
                  trailing={<LeaseStatusBadge status={lease.status} />}
                  footer={
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <p className="font-heading text-metric tabular-nums text-foreground">
                        <span className="mr-1 align-baseline text-base font-semibold text-muted-foreground">
                          {rent.symbol}
                        </span>
                        {rent.amount}
                        <span className="ml-1.5 align-baseline text-sm font-medium text-muted-foreground">
                          / month
                        </span>
                      </p>
                      <MetaChip icon={CalendarRange}>
                        {formatDate(lease.start_date)}
                        {lease.end_date ? ` – ${formatDate(lease.end_date)}` : ""}
                      </MetaChip>
                    </div>
                  }
                />
              </ListItem>
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}
