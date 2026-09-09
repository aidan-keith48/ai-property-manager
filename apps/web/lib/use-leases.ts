"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "./api";
import type { Lease, Property, Tenant, Unit } from "./types";

export interface LeaseWithDetails extends Lease {
  tenant_name: string;
  unit_label: string;
  property_name: string;
  property_id: number | null;
}

/** LeaseRead carries only unit_id/tenant_id, so names are joined client-side.
 * There's no flat /units endpoint — units are fetched per property. */
async function fetchLeasesWithDetails(): Promise<LeaseWithDetails[]> {
  const [leases, tenants, properties] = await Promise.all([
    apiFetch<Lease[]>("/leases"),
    apiFetch<Tenant[]>("/tenants"),
    apiFetch<Property[]>("/properties"),
  ]);

  const unitsByProperty = await Promise.all(
    properties.map((property) =>
      apiFetch<Unit[]>(`/properties/${property.id}/units`).catch(() => [] as Unit[])
    )
  );

  const units = new Map<number, Unit>();
  for (const list of unitsByProperty) {
    for (const unit of list) units.set(unit.id, unit);
  }
  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const propertyById = new Map(properties.map((p) => [p.id, p]));

  return leases.map((lease) => {
    const unit = units.get(lease.unit_id);
    const property = unit ? propertyById.get(unit.property_id) : undefined;
    return {
      ...lease,
      tenant_name: tenantById.get(lease.tenant_id)?.name ?? `Tenant #${lease.tenant_id}`,
      unit_label: unit?.unit_label ?? `#${lease.unit_id}`,
      property_name: property?.name ?? "Unknown property",
      property_id: property?.id ?? null,
    };
  });
}

export function useLeasesWithDetails() {
  const [leases, setLeases] = useState<LeaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeasesWithDetails()
      .then(setLeases)
      .catch(() => setLeases([]))
      .finally(() => setLoading(false));
  }, []);

  return { leases, loading };
}
