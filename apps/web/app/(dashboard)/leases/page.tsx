"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ListItem, StaggerList } from "@/components/motion";
import { CardListSkeleton } from "@/components/skeletons";
import { LeaseStatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeasesWithDetails } from "@/lib/use-leases";

const ALL = "all";

export default function LeasesPage() {
  const { leases, loading } = useLeasesWithDetails();
  const [statusFilter, setStatusFilter] = useState(ALL);

  const visible =
    statusFilter === ALL ? leases : leases.filter((l) => l.status === statusFilter);

  return (
    <div>
      <PageHeader
        title="Leases"
        description="Every lease across your properties, active and ended."
      />

      <div className="mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All leases</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          {visible.map((lease) => (
            <ListItem key={lease.id}>
              <Link
                href={`/leases/${lease.id}`}
                className="block rounded-xl bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{lease.tenant_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lease.property_name} · Unit {lease.unit_label}
                    </p>
                  </div>
                  <LeaseStatusBadge status={lease.status} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  R{lease.rent_amount} / month · from {lease.start_date}
                  {lease.end_date ? ` to ${lease.end_date}` : ""}
                </p>
              </Link>
            </ListItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
