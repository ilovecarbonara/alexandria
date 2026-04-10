import Link from "next/link";
import { Button } from "@/components/ui";
import { RegistryBrowser } from "@/components/RegistryBrowser";

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-360 items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="font-heading text-lg tracking-widest text-white"
            >
              Alexandria
            </Link>
            <span className="hidden font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase sm:inline">
              Academic Blockchain Registry
            </span>
          </div>
          <Link href="/login">
            <Button variant="primary" className="text-xs">
              Login &rarr;
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-bg py-16 text-center">
        <h1 className="font-heading text-4xl text-white">
          Public Thesis Registry & Verification
        </h1>
        <p className="mt-4 font-mono text-sm text-white/40 whitespace-nowrap">
          Search and verify academic thesis registrations secured on the Sepolia blockchain.
        </p>
        <div className="mx-auto mt-6 h-px w-12 bg-border" />
      </section>

      <main className="mx-auto max-w-360 space-y-10 px-6 py-2">
        <RegistryBrowser />
      </main>
    </div>
  );
}
