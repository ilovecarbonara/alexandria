type Status =
  | "verified" | "pending" | "disputed" | "open" | "resolved" | "sent" | "failed"
  | "accepted" | "flagged" | "rejected" | "active" | "deactivated";

const statusStyles: Record<Status, string> = {
  verified: "bg-success/20 text-success",
  pending: "bg-pending/20 text-pending",
  disputed: "bg-dispute/20 text-dispute",
  open: "bg-pending/20 text-pending",
  resolved: "bg-success/20 text-success",
  sent: "bg-success/20 text-success",
  failed: "bg-dispute/20 text-dispute",
  accepted: "bg-success/20 text-success",
  flagged: "bg-pending/20 text-pending",
  rejected: "bg-dispute/20 text-dispute",
  active: "bg-success/20 text-success",
  deactivated: "bg-white/10 text-white/40",
};

interface StatusChipProps {
  status: Status;
  className?: string;
}

export function StatusChip({ status, className = "" }: StatusChipProps) {
  return (
    <span
      className={`inline-block rounded-xs px-2 py-0.5 font-mono text-xs uppercase ${statusStyles[status]} ${className}`}
    >
      {status}
    </span>
  );
}
