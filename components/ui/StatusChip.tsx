type Status = "verified" | "pending" | "disputed" | "open" | "resolved" | "sent" | "failed";

const statusStyles: Record<Status, string> = {
  verified: "bg-success/20 text-success",
  pending: "bg-pending/20 text-pending",
  disputed: "bg-dispute/20 text-dispute",
  open: "bg-pending/20 text-pending",
  resolved: "bg-success/20 text-success",
  sent: "bg-success/20 text-success",
  failed: "bg-dispute/20 text-dispute",
};

interface StatusChipProps {
  status: Status;
  className?: string;
}

export function StatusChip({ status, className = "" }: StatusChipProps) {
  return (
    <span
      className={`inline-block rounded-[2px] px-2 py-0.5 font-mono text-xs uppercase ${statusStyles[status]} ${className}`}
    >
      {status}
    </span>
  );
}
