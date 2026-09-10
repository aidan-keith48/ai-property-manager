"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Bath, BedDouble, DoorOpen, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api";
import type { Property, Unit } from "@/lib/types";
import { ActivityLog } from "@/components/activity-log";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { MetaChip, MetaChipRow } from "@/components/meta-chip";
import { ListItem, StaggerList } from "@/components/motion";
import { PropertyIdentity } from "@/components/property-identity";
import { DetailSkeleton } from "@/components/skeletons";
import { ErrorText, PageHeader, SectionHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      toast.success("Unit added");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create unit";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <EmptyState
        icon={MapPin}
        title="Property not found"
        description="This property doesn't exist or you don't have access to it."
        action={
          <Button asChild variant="outline">
            <Link href="/properties">
              <ArrowLeft className="size-4" />
              Back to properties
            </Link>
          </Button>
        }
      />
    );
  }

  if (loading || !property) {
    return <DetailSkeleton />;
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3 text-muted-foreground">
        <Link href="/properties">
          <ArrowLeft className="size-4" />
          Back to properties
        </Link>
      </Button>

      <PageHeader
        eyebrow="Property"
        size="display"
        title={property.name}
        leading={<PropertyIdentity seed={property.id} label={property.name} size="lg" />}
        description={
          <MetaChipRow>
            <MetaChip icon={MapPin}>{property.address}</MetaChip>
            <MetaChip icon={DoorOpen}>
              {units.length} {units.length === 1 ? "unit" : "units"}
            </MetaChip>
          </MetaChipRow>
        }
      />

      <Card className="mb-8 p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Add a unit</h2>
        <form onSubmit={handleCreateUnit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-32 flex-1">
            <Label htmlFor="unit-label" className="mb-2">
              Unit label
            </Label>
            <Input
              id="unit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="3B"
              required
            />
          </div>
          <div className="w-24">
            <Label htmlFor="unit-bedrooms" className="mb-2">
              Bedrooms
            </Label>
            <Input
              id="unit-bedrooms"
              type="number"
              min={0}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
            />
          </div>
          <div className="w-24">
            <Label htmlFor="unit-bathrooms" className="mb-2">
              Bathrooms
            </Label>
            <Input
              id="unit-bathrooms"
              type="number"
              min={0}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            <Plus className="size-4" />
            {submitting ? "Adding..." : "Add unit"}
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      <SectionHeader title="Units" />
      {units.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No units yet"
          description="Add the first unit to this property using the form above."
        />
      ) : (
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <ListItem key={unit.id}>
              {/* An icon tile, not a PropertyIdentity monogram: a monogram of a
                  short unit label ("5E") would render that label a second time
                  in the row, and the specs click units by exact text. */}
              <ListRow
                href={`/units/${unit.id}`}
                leading={
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <DoorOpen className="size-4" aria-hidden />
                  </span>
                }
                title={unit.unit_label}
                footer={
                  <MetaChipRow>
                    <MetaChip icon={BedDouble}>{unit.bedrooms ?? "?"} bed</MetaChip>
                    <MetaChip icon={Bath}>{unit.bathrooms ?? "?"} bath</MetaChip>
                  </MetaChipRow>
                }
              />
            </ListItem>
          ))}
        </StaggerList>
      )}

      <SectionHeader title="Activity" className="mt-10" />
      <ActivityLog fetchPath={`/properties/${propertyId}/activity`} />
    </div>
  );
}
