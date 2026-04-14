type Status =
  | "verified" | "pending" | "disputed" | "open" | "resolved" | "notified"
  | "accepted" | "flagged" | "rejected" | "active" | "deactivated";

const statusStyles: Record<Status, string> = {
  verified: "border-l-success text-success",
  pending: "border-l-pending text-pending",
  disputed: "border-l-dispute text-dispute",
  open: "border-l-pending text-pending",
  resolved: "border-l-success text-success",
  notified: "border-l-success text-success",
  accepted: "border-l-success text-success",
  flagged: "border-l-dispute text-dispute",
  rejected: "border-l-dispute text-dispute",
  active: "border-l-success text-success",
  deactivated: "border-l-white/40 text-white/40",
};

interface StatusChipProps {
  status: Status;
  className?: string;
}

export function StatusChip({ status, className = "" }: StatusChipProps) {
  return (
    <span
      className={`inline-block border-l-2 pl-2 py-0.5 font-mono text-xs uppercase ${statusStyles[status]} ${className}`}
    >
      {status}
    </span>
  );
}
