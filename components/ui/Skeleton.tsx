interface SkeletonProps {
  className?: string;
}

/** A pulsing placeholder block. Size and shape come from `className`. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-raised ${className}`}
    />
  );
}
