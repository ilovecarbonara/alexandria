import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-page text-ink">
      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-heading text-2xl text-ink">Alexandria</span>
            <span className="hidden text-xs tracking-wide text-ink-subtle sm:inline">
              University of Southern Philippines Foundation
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/verify"
              className="rounded-md px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            >
              Browse the archive
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition-colors hover:bg-primary-hover"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-accent">
            Thesis &amp; Capstone Archive
          </p>
          <h1 className="max-w-3xl font-heading text-5xl leading-[1.1] text-ink sm:text-6xl">
            The university&apos;s record of its own research.
          </h1>
          <div className="mt-6 h-px w-16 bg-accent" />
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-muted">
            Alexandria holds the theses and capstone projects of USPF students and
            faculty. Every submission is reviewed by a research adviser and the
            university librarian before it joins the archive — where its title,
            authors, and abstract are open to anyone.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/verify"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-primary-hover"
            >
              Browse the archive
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-border bg-surface px-6 py-3 text-sm font-medium text-ink shadow-card transition-colors hover:bg-raised"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>

      {/* ── How submission works ─────────────────────────────────── */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-heading text-3xl text-ink">
            From submission to shelf
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Four steps, two reviewers. Nothing reaches the public archive without
            passing both.
          </p>

          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <li key={step.step} className="border-t-2 border-accent pt-5">
                <p className="font-heading text-2xl text-accent">{step.step}</p>
                <h3 className="mt-2 font-heading text-lg text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── What the archive does ────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-heading text-3xl text-ink">
            How the archive works
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROPERTIES.map((p) => (
              <div
                key={p.title}
                className="rounded-lg border border-border bg-surface p-6 shadow-card"
              >
                <h3 className="font-heading text-lg text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-heading text-3xl text-ink">
            Ready to submit your thesis?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
            Register with your <span className="text-ink">@uspf.edu.ph</span>{" "}
            address. The university librarian approves new accounts, and research
            advisers can request their role when signing up.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-primary-hover"
            >
              Create an account
            </Link>
            <Link
              href="/verify"
              className="rounded-md border border-border bg-page px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-raised"
            >
              Search without an account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <span className="font-heading text-base text-ink">Alexandria</span>
            <span className="ml-2 text-xs text-ink-subtle">
              University of Southern Philippines Foundation
            </span>
          </div>
          <p className="text-xs text-ink-subtle">
            Full manuscripts are available to their authors, advisers, and the
            university librarian.
          </p>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  {
    step: "01",
    title: "Submit the manuscript",
    description:
      "Upload the PDF and choose your research adviser. Alexandria reads the abstract straight out of the document — you never retype it.",
  },
  {
    step: "02",
    title: "Adviser review",
    description:
      "Your adviser reads the full manuscript and either endorses it or returns it with written comments for revision.",
  },
  {
    step: "03",
    title: "Librarian approval",
    description:
      "The university librarian gives the final approval, checking the record against the rest of the collection.",
  },
  {
    step: "04",
    title: "Published to the archive",
    description:
      "Title, authors, and abstract become publicly searchable. The full text stays with the authors, their adviser, and the librarian.",
  },
];

const PROPERTIES = [
  {
    title: "Abstracts, not paperwork",
    description:
      "The abstract is extracted from the manuscript itself, so what the archive shows is what the thesis actually says — never a summary retyped from memory.",
  },
  {
    title: "Open metadata, protected text",
    description:
      "Anyone can search titles, authors, and abstracts without an account. The complete manuscript is restricted to its authors, their adviser, and the librarian.",
  },
  {
    title: "Two-stage review",
    description:
      "Every final submission passes a research adviser and the university librarian. A returned submission comes back with comments and can be revised.",
  },
  {
    title: "Similar-title alerts",
    description:
      "Each new submission is compared against the existing collection. Close matches notify both parties and raise a flag for the reviewers.",
  },
  {
    title: "Tamper-evident records",
    description:
      "A cryptographic fingerprint of every manuscript is written to a public ledger at submission, so the archive can prove a document has not been altered since.",
  },
  {
    title: "A permanent collection",
    description:
      "Once published, a record stays. Disputes are recorded alongside it rather than erasing it, keeping the collection's history intact.",
  },
];
