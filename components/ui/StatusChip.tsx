import { STATUS_LABELS } from "@/lib/constants";
import type { ThesisStatus } from "@/lib/supabase/types";

/**
 * Every state a record can be shown in: the seven thesis pipeline statuses
 * plus the account, dispute, and alert states.
 */
type Status =
  | ThesisStatus
  | "verified"
  | "pending"
  | "approved"
  | "disputed"
  | "open"
  | "resolved"
  | "notified"
  | "revoked"
  | "active"
  | "deactivated";

/** Soft fill + matching ink. Colour carries state; it never decorates. */
const statusStyles: Record<Status, string> = {
  // Thesis pipeline
  draft: "bg-raised text-ink-muted",
  pending_adviser: "bg-warning-soft text-warning",
  returned: "bg-accent-soft text-accent",
  pending_librarian: "bg-primary-soft text-primary",
  accepted: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  flagged: "bg-danger-soft text-danger",

  // Accounts
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  revoked: "bg-danger-soft text-danger",
  active: "bg-success-soft text-success",
  deactivated: "bg-raised text-ink-muted",

  // Disputes, alerts, verification
  verified: "bg-success-soft text-success",
  disputed: "bg-danger-soft text-danger",
  open: "bg-warning-soft text-warning",
  resolved: "bg-success-soft text-success",
  notified: "bg-primary-soft text-primary",
};

/** Pipeline statuses read better as words than as raw enum values. */
function labelFor(status: Status): string {
  if (status in STATUS_LABELS) return STATUS_LABELS[status as ThesisStatus];
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface StatusChipProps {
  status: Status;
  className?: string;
}

export function StatusChip({ status, className = "" }: StatusChipProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]} ${className}`}
    >
      {labelFor(status)}
    </span>
  );
}
