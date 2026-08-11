# Project Alexandria

The University of Southern Philippines Foundation's archive of student and faculty theses. Alexandria stores the manuscripts themselves, routes every final submission through a two-stage academic review, and publishes approved records — title, authors, and abstract — to a publicly searchable catalogue.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Supabase — PostgreSQL, Auth, and a private Storage bucket for manuscripts
- Solidity smart contract on Sepolia via Hardhat + Alchemy
- ethers.js for blockchain interaction
- unpdf for abstract extraction from submitted PDFs
- jsPDF + qrcode for certificate generation
- Chart.js for librarian analytics
- pg_trgm (Postgres trigram extension) for title similarity matching
- Deployed on Vercel

## Roles

Roles live in `users.role` (`student | adviser | librarian`).

- **Public** (no account): search the archive, read metadata and abstracts, verify a document by hash
- **Student**: submit theses, track them through review, revise returned submissions, flag disputes, receive title alerts, link thesis revisions
- **Research Adviser**: review submissions assigned to them — endorse to the librarian or return with comments; read the full manuscript; correct a badly-extracted abstract
- **University Librarian**: final approval or rejection; manage accounts and roles; mediate disputes; monitor title alerts; view analytics and activity logs

A person chooses `student` or `adviser` at sign-up (`requested_role`); the librarian grants it on approval. The librarian role is seeded manually and is never self-assignable.

## The review pipeline

```
Student submits a Final
        │
        ▼  pending_adviser
Research Adviser reviews ──── returned ───▶ student revises and resubmits
        │
        ▼  pending_librarian
University Librarian approves
        │
        ▼  accepted ──▶ published to the public archive
```

Drafts skip review entirely: they are archived privately (`draft`) and are visible only to their owner and the librarian.

`lib/workflow.ts` holds the transition matrix. Every status change goes through it — nothing writes `theses.status` directly.

## Key Rules
- **The manuscript PDF IS stored**, in a private Supabase Storage bucket. It is streamed through `GET /api/theses/[id]/pdf`, which re-authorizes on every request; there is no shareable signed URL.
- **Full text is restricted** to the submitter, co-authors matched to an account by name, the assigned adviser, and the librarian. Everyone else sees metadata plus the abstract.
- **The abstract is extracted from the PDF**, never typed by the submitter. If it cannot be read, submission is blocked. Only a reviewer may correct it afterwards.
- **The SHA-256 is computed server-side** from the bytes actually archived. The client does not supply it — this closes the trust boundary the hash-only design had to accept.
- Duplicate detection happens BEFORE the manuscript is archived and before the blockchain write.
- Drafts are archived privately and skip review. Only Finals enter the pipeline.
- Theses can be linked in version chains (Draft → Final) via `previous_thesis_id`.
- A student may resubmit a returned thesis. A new on-chain entry is written only when the document itself changed.
- Blockchain records are NEVER altered, even on dispute.
- On every new submission a title-similarity check runs against existing entries. Above the alert threshold it notifies the matching author; above the auto-flag threshold (default 75%) it also opens a dispute and sets `similarity_flagged`. **This is advisory only** — it never moves a thesis out of the review pipeline.
- Public search returns `accepted` and `flagged` records only. RLS enforces the same rule at the database, so application filtering is the second gate rather than the only one.
- Sign-up requires an `@uspf.edu.ph` address and librarian approval.
- Public verification requires NO login.
- The system records SUBMISSION and INSTITUTIONAL REVIEW, not a determination of authorship. It does not verify that the submitter wrote the thesis.

## Where things are

| Concern | Location |
| --- | --- |
| Role gates | `lib/actions/auth-guards.ts`, `lib/actions/require-area.ts`, `proxy.ts` |
| Review state machine | `lib/workflow.ts` |
| Review actions | `lib/actions/reviews.ts` |
| Abstract extraction | `lib/pdf/extract.ts` |
| Manuscript storage | `lib/storage.ts` |
| Submission pipeline | `app/api/theses/upload/ticket` → `upload/process` → `register` |
| Schema | `docs/DATABASE_MIGRATION.sql` |

## Docs
See `/docs` for full specs on the data model, features, and design system, and `/docs/diagrams` for the ERD, DFD, use cases, workflows, and architecture.
