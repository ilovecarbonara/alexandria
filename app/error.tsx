"use client";

import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6 text-ink">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-5xl text-ink-subtle">!</div>
        <h1 className="font-heading text-2xl text-ink">
          Something went wrong
        </h1>
        <p className="text-sm text-ink-subtle">
          An unexpected error occurred. You can try again or return to the home
          page.
        </p>
        {error.digest && (
          <p className="text-xs text-ink-subtle">
            Digest: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={unstable_retry}
            className="rounded-md bg-primary px-5 py-2.5 text-sm text-ink transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-border px-5 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
