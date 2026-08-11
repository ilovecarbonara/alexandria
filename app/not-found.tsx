import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6 text-ink">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="font-heading text-6xl text-ink-subtle">404</div>
        <h1 className="font-heading text-2xl text-ink">Page Not Found</h1>
        <p className="text-sm text-ink-subtle">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-primary px-5 py-2.5 text-sm text-ink transition-opacity hover:opacity-90"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
