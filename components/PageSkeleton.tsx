import { Card, Skeleton } from "@/components/ui";

/**
 * Generic route-level loading state: a page heading followed by a few
 * card rows. Rendered inside each role's sidebar shell by that area's
 * loading.tsx.
 */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-8">
      <span className="sr-only">Loading…</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}
