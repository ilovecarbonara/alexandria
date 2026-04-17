import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 font-mono text-white/90">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="font-heading text-6xl text-white/20">404</div>
        <h1 className="font-heading text-2xl text-white">Page Not Found</h1>
        <p className="text-sm text-white/50">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xs bg-accent px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
