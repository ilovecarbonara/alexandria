import Link from "next/link";
import { Button } from "@/components/ui";
import { RegistryBrowser } from "@/components/RegistryBrowser";

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-heading text-xl text-white">
            Alexandria
          </Link>
          <Link href="/login">
            <Button variant="secondary">Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <div>
          <h1 className="font-heading text-3xl text-white">
            Public Verification
          </h1>
          <p className="mt-2 font-mono text-sm text-white/40">
            Search the thesis registry or verify a document against the
            blockchain. No account required.
          </p>
        </div>

        <RegistryBrowser />
      </main>
    </div>
  );
}
