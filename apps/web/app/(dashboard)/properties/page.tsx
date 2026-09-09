"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { apiFetch, ApiError } from "@/lib/api";
import type { Property } from "@/lib/types";
import { Button, Card, ErrorText, Input, PageHeader } from "@/components/ui";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadProperties() {
    setLoading(true);
    try {
      setProperties(await apiFetch<Property[]>("/properties"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount, no data-fetching library in Phase 1
    loadProperties();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch<Property>("/properties", { method: "POST", json: { name, address } });
      setName("");
      setAddress("");
      await loadProperties();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create property");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Properties" />

      <Card className="mb-6">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <Button type="submit" disabled={submitting}>
            Add Property
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : properties.length === 0 ? (
        <p className="text-sm text-slate-500">No properties yet. Add one above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {properties.map((property) => (
            <Link key={property.id} href={`/properties/${property.id}`}>
              <Card className="transition hover:border-slate-400">
                <h2 className="font-medium text-slate-900">{property.name}</h2>
                <p className="text-sm text-slate-600">{property.address}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
