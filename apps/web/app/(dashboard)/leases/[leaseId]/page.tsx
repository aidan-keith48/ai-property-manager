"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, DoorOpen, FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { DetailSkeleton } from "@/components/skeletons";
import { LeaseStatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3 text-muted-foreground">
        <Link href="/leases">
          <ArrowLeft className="size-4" />
          Back to leases
        </Link>
      </Button>

      <PageHeader
        title={lease.tenant_name}
        description={`${lease.property_name} · Unit ${lease.unit_label}`}
      >
        <LeaseStatusBadge status={lease.status} />
      </PageHeader>

      <Card className="mb-6 p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Monthly rent</dt>
            <dd className="mt-1 text-lg font-semibold text-foreground">R{lease.rent_amount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Tenant</dt>
            <dd className="mt-1 text-sm font-medium">
              <Link href={`/tenants/${lease.tenant_id}`} className="text-primary hover:underline">
                {lease.tenant_name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Start date</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{lease.start_date}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">End date</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {lease.end_date ?? "—"}
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
