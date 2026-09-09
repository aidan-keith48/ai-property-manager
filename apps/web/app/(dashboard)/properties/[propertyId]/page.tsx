"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { apiFetch, ApiError } from "@/lib/api";
import type { Property, Unit } from "@/lib/types";
import { ActivityLog } from "@/components/activity-log";
import { Button, Card, ErrorText, Input, PageHeader } from "@/components/ui";

export default function PropertyDetailPage(props: PageProps<"/properties/[propertyId]">) {
  const { propertyId } = use(props.params);

  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [label, setLabel] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [propertyData, unitsData] = await Promise.all([
        apiFetch<Property>(`/properties/${propertyId}`),
        apiFetch<Unit[]>(`/properties/${propertyId}/units`),
      ]);
      setProperty(propertyData);
      setUnits(unitsData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount, no data-fetching library in Phase 1
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function handleCreateUnit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch<Unit>(`/properties/${propertyId}/units`, {
        method: "POST",
        json: {
          unit_label: label,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
        },
      });
      setLabel("");
      setBedrooms("");
      setBathrooms("");
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create unit");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div>
        <p className="text-sm text-slate-600">
          This property doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/properties" className="text-sm font-medium text-slate-900 underline">
          Back to properties
        </Link>
      </div>
    );
  }

  if (loading || !property) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <PageHeader title={property.name}>
        <Link href="/properties" className="text-sm font-medium text-slate-600 underline">
          Back to properties
        </Link>
      </PageHeader>
      <p className="mb-6 text-sm text-slate-600">{property.address}</p>

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Add Unit</h2>
        <form onSubmit={handleCreateUnit} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-32">
            <label className="mb-1 block text-xs font-medium text-slate-600">Unit label</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-slate-600">Bedrooms</label>
            <Input
              type="number"
              min={0}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-slate-600">Bathrooms</label>
            <Input
              type="number"
              min={0}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            Add Unit
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Units</h2>
      {units.length === 0 ? (
        <p className="text-sm text-slate-500">No units yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {units.map((unit) => (
            <Link key={unit.id} href={`/units/${unit.id}`}>
              <Card className="transition hover:border-slate-400">
                <h3 className="font-medium text-slate-900">{unit.unit_label}</h3>
                <p className="text-sm text-slate-600">
                  {unit.bedrooms ?? "?"} bed / {unit.bathrooms ?? "?"} bath
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-900">Activity</h2>
      <ActivityLog fetchPath={`/properties/${propertyId}/activity`} />
    </div>
  );
}
