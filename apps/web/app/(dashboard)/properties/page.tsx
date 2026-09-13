"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Building2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api";
import type { Property } from "@/lib/types";
import { useAuthedPhotoUrl } from "@/lib/use-authed-photo-url";
import { EmptyState } from "@/components/empty-state";
import { MetaChip } from "@/components/meta-chip";
import { ListItem, StaggerList } from "@/components/motion";
import { PropertyIdentity } from "@/components/property-identity";
import { CardListSkeleton } from "@/components/skeletons";
import { SurfaceCard } from "@/components/surface";
import { ErrorText, PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** PropertyIdentity's `photoUrl` renders as a CSS background-image, not an
 * <img> — deliberately, so this stays consistent with the monogram fallback
 * it replaces rather than swapping in a differently-styled bare image. */
function PropertyHero({ property }: { property: Property }) {
  const photoPath =
    property.first_photo_id != null
      ? `/properties/${property.id}/photos/${property.first_photo_id}`
      : null;
  const photoUrl = useAuthedPhotoUrl(photoPath);
  return (
    <PropertyIdentity
      seed={property.id}
      label={property.name}
      size="hero"
      photoUrl={photoUrl ?? undefined}
    />
  );
}

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
      toast.success("Property added");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create property";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        size="display"
        title="Properties"
        description="Every building you manage, and the units inside them."
      />

      <Card className="mb-8 p-6">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
          <div className="min-w-40 flex-1">
            <Label htmlFor="property-name" className="mb-2">
              Name
            </Label>
            <Input
              id="property-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seaside Apartments"
              required
            />
          </div>
          <div className="min-w-40 flex-1">
            <Label htmlFor="property-address" className="mb-2">
              Address
            </Label>
            <Input
              id="property-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 Main Rd, Cape Town"
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            <Plus className="size-4" />
            {submitting ? "Adding..." : "Add property"}
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      {loading ? (
        <CardListSkeleton />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property using the form above to start tracking units, tenants and issues."
        />
      ) : (
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <ListItem key={property.id}>
              {/* The one justified hero band in the dashboard — this page is a
                  genuine browse surface. The name renders below the band and
                  not over it, so it stays a single text match for the specs. */}
              <SurfaceCard href={`/properties/${property.id}`} padding="none">
                <PropertyHero property={property} />
                <div className="p-5">
                  <h2 className="truncate font-heading text-base font-semibold text-foreground">
                    {property.name}
                  </h2>
                  <MetaChip icon={MapPin} className="mt-2 max-w-full">
                    {property.address}
                  </MetaChip>
                </div>
              </SurfaceCard>
            </ListItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
