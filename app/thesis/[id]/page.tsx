import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Card, StatusChip, HashDisplay, Field } from "@/components/ui";
import { PdfViewer } from "@/components/PdfViewer";
import { sortThesisAuthors } from "@/lib/authors";
import { validateUUID } from "@/lib/validation";
import { STATUS_LABELS } from "@/lib/constants";
import { isPublic } from "@/lib/workflow";

/**
 * The public record for a single thesis.
 *
 * Metadata and the abstract are open to everyone. The manuscript itself is
 * shown only to its stakeholders — the submitter, co-authors matched to an
 * account, the assigned adviser, and the librarian.
 */

const THESIS_COLUMNS =
  "id, user_id, adviser_id, title, abstract, keywords, thesis_level, thesis_category, submission_type, sha256_hash, tx_hash, block_timestamp, pdf_page_count, status, registered_at, thesis_authors(name, position, user_id)";

type ThesisRecord = {
  id: string;
  user_id: string;
  adviser_id: string | null;
  title: string;
  abstract: string | null;
  keywords: string[];
  thesis_level: string;
  thesis_category: string;
  submission_type: string;
  sha256_hash: string;
  tx_hash: string;
  block_timestamp: string;
  pdf_page_count: number | null;
  status: string;
  registered_at: string;
  thesis_authors: { name: string; position: number; user_id: string | null }[];
};

async function loadThesis(id: string) {
  if (!validateUUID(id)) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("theses")
    .select(THESIS_COLUMNS)
    .eq("id", id)
    .single();

  return (data as ThesisRecord | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const thesis = await loadThesis(id);

  if (!thesis || !isPublic(thesis.status as never)) {
    return { title: "Thesis — Alexandria" };
  }

  return {
    title: `${thesis.title} — Alexandria`,
    description: thesis.abstract?.slice(0, 200) ?? undefined,
  };
}

export default async function ThesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thesis = await loadThesis(id);
  if (!thesis) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  const isCoAuthor = thesis.thesis_authors.some(
    (a) => a.user_id && a.user_id === user?.id,
  );
  const isStakeholder =
    !!user &&
    (role === "librarian" ||
      thesis.user_id === user.id ||
      thesis.adviser_id === user.id ||
      isCoAuthor);

  // Unpublished records exist, but only their stakeholders may see them.
  if (!isPublic(thesis.status as never) && !isStakeholder) notFound();

  const authors = sortThesisAuthors(thesis.thesis_authors);
  const year = new Date(thesis.registered_at).getFullYear();

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-heading text-2xl text-ink">
            Alexandria
          </Link>
          <Link
            href="/verify"
            className="rounded-md px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-raised hover:text-ink"
          >
            Browse the archive
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        {/* ---- Title block ---- */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            {thesis.thesis_level} · {thesis.thesis_category} · {year}
          </p>
          <h1 className="mt-3 font-heading text-4xl leading-tight text-ink">
            {thesis.title}
          </h1>
          <p className="mt-4 text-base text-ink-muted">
            {authors.map((a) => a.name).join(" · ")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StatusChip status={thesis.status as never} />
            {thesis.submission_type === "draft" && (
              <span className="text-xs text-ink-subtle">
                Draft — not published to the public archive
              </span>
            )}
          </div>
        </div>

        {/* ---- Abstract ---- */}
        <Card>
          <h2 className="font-heading text-lg text-ink">Abstract</h2>
          <div className="mt-1 h-px w-12 bg-accent" />
          {thesis.abstract ? (
            <p className="mt-4 text-base leading-relaxed text-ink">
              {thesis.abstract}
            </p>
          ) : (
            <p className="mt-4 text-sm text-ink-subtle">
              No abstract is on file for this record.
            </p>
          )}

          {thesis.keywords.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                Keywords
              </span>
              {thesis.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-raised px-2.5 py-1 text-xs text-ink-muted"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* ---- Manuscript ---- */}
        {isStakeholder ? (
          <PdfViewer
            thesisId={thesis.id}
            title={thesis.title}
            pageCount={thesis.pdf_page_count}
          />
        ) : (
          <Card className="border-dashed">
            <h2 className="font-heading text-lg text-ink">Full manuscript</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              The complete text of this thesis is available to its authors, their
              research adviser, and the university librarian. Everyone else has
              access to the record and abstract above.
            </p>
            {!user && (
              <p className="mt-3 text-sm text-ink-subtle">
                If you are one of its authors,{" "}
                <Link href="/login" className="text-primary hover:underline">
                  sign in
                </Link>{" "}
                to read it.
              </p>
            )}
          </Card>
        )}

        {/* ---- Record detail ---- */}
        <Card>
          <h2 className="font-heading text-lg text-ink">Record</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Level" value={thesis.thesis_level} capitalize />
            <Field label="Category" value={thesis.thesis_category} />
            <Field label="Type" value={thesis.submission_type} capitalize />
            <Field label="Status" value={STATUS_LABELS[thesis.status as never]} />
            <Field
              label="Submitted"
              value={new Date(thesis.registered_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
            {thesis.pdf_page_count && (
              <Field label="Length" value={`${thesis.pdf_page_count} pages`} />
            )}
          </div>

          {/* The ledger record, present but out of the way. */}
          <details className="mt-6 border-t border-border pt-4">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-ink-subtle transition-colors hover:text-ink-muted">
              Record integrity
            </summary>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
              A cryptographic fingerprint of this manuscript was written to a
              public ledger when it was submitted. Anyone can recompute the
              fingerprint from the file and check it against the entry below to
              confirm the document has not been altered since.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  Document fingerprint (SHA-256)
                </span>
                <HashDisplay hash={thesis.sha256_hash} copyable />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  Ledger entry
                </span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${thesis.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  <HashDisplay hash={thesis.tx_hash} />
                </a>
              </div>
              <Field
                label="Recorded"
                value={new Date(thesis.block_timestamp).toLocaleString()}
              />
            </div>
          </details>
        </Card>
      </main>
    </div>
  );
}
