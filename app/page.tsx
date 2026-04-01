import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg font-mono text-white/90">
      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-heading text-xl text-white">Alexandria</span>
          <nav className="flex items-center gap-3">
            <Link
              href="/verify"
              className="rounded-xs border border-border bg-surface px-4 py-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              Verify
            </Link>
            <Link
              href="/login"
              className="rounded-xs bg-accent px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">
            USPF · Academic Thesis Registry
          </p>
          <h1 className="font-heading text-5xl leading-tight text-white sm:text-6xl">
            A permanent record
            <br />
            for academic work.
          </h1>
          <p className="mt-6 max-w-xl font-mono text-sm leading-relaxed text-white/50">
            Alexandria registers the SHA-256 hash of your thesis on the Sepolia
            blockchain — establishing tamper-proof, publicly verifiable proof of
            existence and registration without ever storing the document itself.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-xs bg-accent px-6 py-3 text-sm text-white transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
            <Link
              href="/verify"
              className="rounded-xs border border-border bg-surface px-6 py-3 text-sm text-white/70 transition-colors hover:text-white"
            >
              Verify a Document
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature Highlights ───────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-10 font-heading text-2xl text-white">
            How it works
          </h2>
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-surface p-6">
                <p className="mb-3 font-mono text-xs text-accent">{f.step}</p>
                <h3 className="mb-2 font-heading text-lg text-white">
                  {f.title}
                </h3>
                <p className="font-mono text-xs leading-relaxed text-white/40">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Properties ───────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-10 font-heading text-2xl text-white">
            System properties
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROPERTIES.map((p, i) => (
              <div
                key={i}
                className="rounded-xs border border-border bg-surface p-5"
              >
                <div
                  className="mb-3 inline-block rounded-xs px-2 py-0.5 font-mono text-xs"
                  style={{ background: p.chipBg, color: p.chipColor }}
                >
                  {p.chip}
                </div>
                <p className="font-mono text-xs leading-relaxed text-white/50">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-xs border border-border bg-surface p-10">
            <h2 className="font-heading text-3xl text-white">
              Ready to register?
            </h2>
            <p className="mt-3 max-w-lg font-mono text-sm text-white/40">
              Create an account with your USPF email address. Access is granted
              after admin approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xs bg-accent px-6 py-3 text-sm text-white transition-opacity hover:opacity-90"
              >
                Create Account
              </Link>
              <Link
                href="/verify"
                className="rounded-xs border border-border bg-bg px-6 py-3 text-sm text-white/60 transition-colors hover:text-white"
              >
                Browse Public Registry
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="font-heading text-sm text-white/60">
              Alexandria
            </span>
            <span className="ml-2 font-mono text-xs text-white/20">
              · USPF Academic Thesis Registry
            </span>
          </div>
          <p className="font-mono text-xs text-white/20">
            Records on blockchain are permanent and unalterable.
          </p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    step: "01",
    title: "Hash your thesis",
    description:
      "Upload your PDF. A SHA-256 fingerprint is computed in your browser. The file is discarded immediately — it never leaves your device.",
  },
  {
    step: "02",
    title: "Register on-chain",
    description:
      "The hash is submitted to a smart contract on the Sepolia Ethereum testnet, creating an immutable timestamped record.",
  },
  {
    step: "03",
    title: "Receive a certificate",
    description:
      "A registration certificate is generated with the hash, transaction ID, and a QR code linking to the blockchain record.",
  },
  {
    step: "04",
    title: "Publicly verifiable",
    description:
      "Anyone can verify a document without an account by uploading the PDF or pasting the hash on the public verification page.",
  },
];

const PROPERTIES = [
  {
    chip: "IMMUTABLE",
    chipBg: "#4A90D915",
    chipColor: "#4A90D9",
    description:
      "Blockchain entries cannot be altered or deleted, even by administrators. The record stands permanently.",
  },
  {
    chip: "PDF-FREE",
    chipBg: "#2ECC8F15",
    chipColor: "#2ECC8F",
    description:
      "Only the cryptographic hash is registered. The document itself is never uploaded, stored, or transmitted.",
  },
  {
    chip: "SIMILARITY ALERTS",
    chipBg: "#E2A84B15",
    chipColor: "#E2A84B",
    description:
      "Title similarity checks run automatically on every registration using pg_trgm. Authors of matching entries are notified.",
  },
  {
    chip: "DISPUTE FLAGS",
    chipBg: "#C0392B15",
    chipColor: "#C0392B",
    description:
      "Any authenticated user can raise a dispute against a registration. Flags are reviewed by administrators.",
  },
  {
    chip: "STATUS WORKFLOW",
    chipBg: "#4A90D915",
    chipColor: "#4A90D9",
    description:
      "Registrations move through pending → accepted / flagged / rejected. Status changes trigger email notifications.",
  },
  {
    chip: "NO-LOGIN VERIFY",
    chipBg: "#2ECC8F15",
    chipColor: "#2ECC8F",
    description:
      "The public verification interface requires no account. Search, filter, and verify against the blockchain freely.",
  },
];
