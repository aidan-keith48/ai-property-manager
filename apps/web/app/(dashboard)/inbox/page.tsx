"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import type { InboxSubmissionItem, Property, Tenant } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";

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

const statusStyles: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
};

export default function InboxPage() {
  const [items, setItems] = useState<InboxSubmissionItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
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
    if (propertyFilter) params.set("property_id", propertyFilter);
    if (tenantFilter) params.set("tenant_id", tenantFilter);
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

  return (
    <div>
      <PageHeader title="Inbox" />

      <div className="mb-4 flex gap-3">
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No submissions yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Link key={item.id} href={`/inbox/${item.id}`}>
              <Card className="transition hover:border-slate-400">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{item.tenant_name}</span>
                      <span className="text-xs text-slate-500">
                        {item.property_name} · Unit {item.unit_label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-700">{item.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      {timeAgo(item.last_activity_at)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.message_count} message{item.message_count === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
