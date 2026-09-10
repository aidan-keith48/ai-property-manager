"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, DoorOpen, FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { MetaChip, MetaChipRow } from "@/components/meta-chip";
import { DetailSkeleton } from "@/components/skeletons";
import { LeaseStatusBadge } from "@/components/status-badge";
import { Eyebrow, PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatZARParts } from "@/lib/format";
import { useLeasesWithDetails } from "@/lib/use-leases";

export default function LeaseDetailPage(props: PageProps<"/leases/[leaseId]">) {
  const { leaseId } = use(props.params);
  const { leases, loading } = useLeasesWithDetails();

  if (loading) {
    return <DetailSkeleton />;
  }

  const lease = leases.find((l) => l.id === Number(leaseId));

  if (!lease) {
    return (
      <EmptyState
        icon={FileText}
        title="Lease not found"
        description="This lease doesn't exist or you don't have access to it."
        action={
          <Button asChild variant="outline">
            <Link href="/leases">
              <ArrowLeft className="size-4" />
              Back to leases
            </Link>
          </Button>
        }
      />
    );
  }

  const rent = formatZARParts(lease.rent_amount);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3 text-muted-foreground">
        <Link href="/leases">
          <ArrowLeft className="size-4" />
          Back to leases
        </Link>
      </Button>

      <PageHeader
        eyebrow="Lease"
        size="display"
        title={lease.tenant_name}
        description={
          <MetaChipRow>
            <MetaChip icon={Building2}>{lease.property_name}</MetaChip>
            <MetaChip icon={DoorOpen}>Unit {lease.unit_label}</MetaChip>
          </MetaChipRow>
        }
      >
        <LeaseStatusBadge status={lease.status} />
      </PageHeader>

      <Card className="mb-6 p-6">
        <Eyebrow>Monthly rent</Eyebrow>
        <p className="mt-2 font-heading text-metric-lg tabular-nums text-foreground">
          <span className="mr-1.5 align-baseline text-xl font-semibold text-muted-foreground">
            {rent.symbol}
          </span>
          {rent.amount}
        </p>

        <dl className="mt-8 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-eyebrow uppercase text-muted-foreground">Tenant</dt>
            <dd className="mt-1.5 text-sm font-medium">
              <Link href={`/tenants/${lease.tenant_id}`} className="text-primary hover:underline">
                {lease.tenant_name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-eyebrow uppercase text-muted-foreground">Start date</dt>
            <dd className="mt-1.5 text-sm font-medium text-foreground">
              {formatDate(lease.start_date)}
            </dd>
          </div>
          <div>
            <dt className="text-eyebrow uppercase text-muted-foreground">End date</dt>
            <dd className="mt-1.5 text-sm font-medium text-foreground">
              {lease.end_date ? formatDate(lease.end_date) : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Lease documents and ending a lease live on the unit page, so there's
          exactly one place those mutations happen. */}
      <Card className="flex-row items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Documents and lease actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage lease documents or end this lease from the unit page.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/units/${lease.unit_id}`}>
            <DoorOpen className="size-4" />
            Go to unit
          </Link>
        </Button>
      </Card>
    </div>
  );
}
