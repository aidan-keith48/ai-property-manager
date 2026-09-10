import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Colors come from the --status-* tokens in globals.css so status styling
 * lives in exactly one place. Values match the API enums: SubmissionStatus
 * (open/in_progress/resolved) and LeaseStatus (active/ended). */
const SUBMISSION_STATUSES: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-status-open text-status-open-foreground" },
  in_progress: {
    label: "In progress",
    className: "bg-status-progress text-status-progress-foreground",
  },
  resolved: {
    label: "Resolved",
    className: "bg-status-resolved text-status-resolved-foreground",
  },
};

const LEASE_STATUSES: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-status-active text-status-active-foreground" },
  ended: { label: "Ended", className: "bg-status-ended text-status-ended-foreground" },
};

function StatusBadge({
  status,
  map,
  className,
}: {
  status: string;
  map: Record<string, { label: string; className: string }>;
  className?: string;
}) {
  const entry = map[status] ?? {
    label: status.replace(/_/g, " "),
    className: "bg-muted text-muted-foreground",
  };
  return <Badge className={cn(entry.className, className)}>{entry.label}</Badge>;
}

export function SubmissionStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <StatusBadge status={status} map={SUBMISSION_STATUSES} className={className} />;
}

export function LeaseStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <StatusBadge status={status} map={LEASE_STATUSES} className={className} />;
}

/** Whether a tenant currently occupies a unit. Lives here rather than in the
 *  tenants page so the --status-* tokens keep exactly one consumer. Labels are
 *  asserted verbatim by the E2E suite — do not reword them. */
export function TenancyStatusBadge({
  assigned,
  className,
}: {
  assigned: boolean;
  className?: string;
}) {
  return (
    <StatusBadge
      status={assigned ? "housed" : "unassigned"}
      map={{
        housed: { label: "Housed", className: "bg-status-active text-status-active-foreground" },
        unassigned: {
          label: "Unassigned",
          className: "bg-status-ended text-status-ended-foreground",
        },
      }}
      className={className}
    />
  );
}
