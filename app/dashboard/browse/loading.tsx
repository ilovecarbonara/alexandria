import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-8">
      <span className="sr-only">Loading…</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-11 w-full" />

      {/* Result rows */}
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
