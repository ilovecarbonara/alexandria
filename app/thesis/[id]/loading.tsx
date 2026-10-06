import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="font-heading text-2xl text-ink">Alexandria</span>
        </div>
      </header>

      <main
        role="status"
        aria-busy="true"
        className="mx-auto max-w-5xl space-y-8 px-6 py-12"
      >
        <span className="sr-only">Loading…</span>

        {/* Title block */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>

        {/* Abstract */}
        <Card className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </Card>
      </main>
    </div>
  );
}
