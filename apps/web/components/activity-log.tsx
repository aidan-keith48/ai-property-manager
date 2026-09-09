"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { AuditLogEntry } from "@/lib/types";
import { Card } from "@/components/ui";

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
    return <p className="text-sm text-slate-500">Loading activity...</p>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No activity yet.</p>;
  }

  return (
    <Card>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between text-sm">
            <span className="text-slate-700">
              {describe(entry)}
              <span className="ml-1 text-xs text-slate-400">
                ({entry.actor_type}
                {entry.actor_id !== null ? ` #${entry.actor_id}` : ""})
              </span>
            </span>
            <span className="shrink-0 text-xs text-slate-400">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
