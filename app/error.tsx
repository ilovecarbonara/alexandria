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
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 font-mono text-white/90">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-5xl text-white/20">!</div>
        <h1 className="font-heading text-2xl text-white">
          Something went wrong
        </h1>
        <p className="text-sm text-white/50">
          An unexpected error occurred. You can try again or return to the home
          page.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-white/30">
            Digest: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={unstable_retry}
            className="rounded-xs bg-accent px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xs border border-border px-5 py-2.5 text-sm text-white/70 transition-colors hover:text-white"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
