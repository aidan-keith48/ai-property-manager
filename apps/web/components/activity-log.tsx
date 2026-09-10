"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_LABELS: Record<string, string> = {
  "property.create": "Property created",
  "property.update": "Property details updated",
  "property.delete": "Property deleted",
  "unit.create": "Unit added",
  "unit.update": "Unit details updated",
  "unit.delete": "Unit removed",
  "tenant.create": "Tenant added",
  "tenant.update": "Tenant details updated",
  "tenant.delete": "Tenant removed",
  "lease.create": "Lease started",
  "lease.end": "Lease ended",
  "submission.create": "Tenant submitted an issue",
  "inbox.reply": "Landlord replied to a submission",
  "submission.status_change": "Submission status changed",
  "lease_document.upload": "Lease document uploaded",
  "lease_document.download": "Lease document viewed",
  "lease_document.delete": "Lease document deleted",
};

function describe(entry: AuditLogEntry): string {
  return ACTION_LABELS[entry.action] ?? entry.action;
}

/** Epic H1: automatic, timestamped activity log — no manual data entry.
 * Reused for both the per-property and per-unit views (Milestone 9). */
export function ActivityLog({ fetchPath }: { fetchPath: string }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setEntries(await apiFetch<AuditLogEntry[]>(fetchPath));
      setLoading(false);
    }
    load();
  }, [fetchPath]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Actions on this property and its units are recorded here automatically."
      />
    );
  }

  return (
    <Card className="p-6">
      <ul className="flex flex-col">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0"
          >
            <span className="text-sm font-medium text-foreground">
              {describe(entry)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {entry.actor_type}
                {entry.actor_id !== null ? ` #${entry.actor_id}` : ""}
              </span>
            </span>
            <time
              dateTime={entry.timestamp}
              className="shrink-0 font-mono text-xs text-muted-foreground"
            >
              {formatDateTime(entry.timestamp)}
            </time>
          </li>
        ))}
      </ul>
    </Card>
  );
}
