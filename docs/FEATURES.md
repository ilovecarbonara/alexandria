# Feature Specifications

## F1: Authentication & Roles
- University email only (`@uspf.edu.ph`)
- Sign-up asks what the account is registering as: **Researcher** or **Research Adviser**. The choice is stored as `requested_role`; `role` always starts as `researcher`.
- Registration creates the account with `approval_status: pending`
- The librarian must approve before the user can log in. Approval promotes `requested_role` → `role`, so approving an adviser request is what actually grants the role
- The librarian role is never self-assignable — it is seeded manually (see `docs/SETUP.md`)
- The librarian can change a user's role afterwards via `setUserRole`. Demoting an adviser is refused while they still have submissions in their queue
- Rejected requests and revoked approvals display distinct login messages
- Each role is confined to its own area: `researcher → /dashboard`, `adviser → /adviser`, `librarian → /admin`. Enforced in `proxy.ts` at the edge, in each layout via `requireArea`, in server actions via `lib/actions/auth-guards.ts`, and in Postgres via RLS
- Session management via Supabase Auth

## F2: Thesis Submission

A three-request pipeline. The manuscript never passes through a serverless function body — it goes straight to Storage and the server fetches it back.

**Step 1 — `POST /api/theses/upload/ticket`**
Returns a short-lived Supabase signed upload URL scoped to one staging path.

**Step 2 — browser uploads directly to Storage.**

**Step 3 — `POST /api/theses/upload/process`**
The server downloads the staged object and, in order:
1. verifies the `%PDF-` magic bytes and the size limit (25 MB)
2. **computes the SHA-256 itself**, from the bytes that will be archived — the client never supplies the hash
3. checks the chain via `isRegistered(hash)`; a duplicate is rejected and the staged file deleted
4. extracts the abstract (F14). Failure rejects the submission with actionable guidance and deletes the staged file
5. writes a `staged_uploads` row and returns `{ stagedId, sha256, abstract, keywords, confidence, pageCount }`

The extracted abstract is shown to the researcher read-only. There is no field to type one.

**Step 4 — `POST /api/theses/register`**
Metadata form fields: ordered author list, title, level, category, submission type, and — for Finals — **Research Adviser** (required).
- The first author is the submitter's profile name, pre-filled and read-only. Up to five more authors, six total.
- Client and server validation reject blank, invalid, duplicate, or over-limit author lists. The server independently verifies the submitter is listed as an author.
- If the user has draft submissions without a child revision, a "This is a revision of" dropdown appears (F12)
- On submit the server: re-checks the chain for duplicates → writes the record on-chain → inserts the thesis and its ordered authors → moves the manuscript from staging into the archive → deletes the staged row → triggers the similarity check (F8, non-blocking)
- **Author accounts are resolved at insert**: each author name is matched against `users.full_name_normalized`, and a match stores `thesis_authors.user_id`. That match is what grants a co-author full-text access (F15)
- A **Final** lands in `pending_adviser`. A **Draft** lands in `draft` and skips review entirely

## F3: Review Workflow

The pipeline, and the transition matrix in `lib/workflow.ts` that governs it:

```
insert      → draft (Draft) | pending_adviser (Final)
researcher  → returned ⇒ pending_adviser            (resubmit; revision_count++)
adviser     → pending_adviser ⇒ pending_librarian   (endorse)
              pending_adviser ⇒ returned            (return; comments REQUIRED)
librarian   → pending_librarian ⇒ accepted | rejected | returned
              accepted ⇒ flagged | rejected         (post-publication)
              flagged  ⇒ accepted | rejected
              draft    ⇒ rejected
```

**Resubmission — `POST /api/theses/resubmit`**
The only transition a researcher owns. Reuses the same staged-upload path as a new submission (`/upload/ticket` → `/upload/process`), then revises the existing thesis **in place** rather than inserting a new row, so one thesis keeps one review thread however many attempts it takes.
- Reachable only from `returned`, guarded by `assertTransition` and by `.eq("status", "returned")` on the update, so a reviewer acting concurrently cannot be overwritten
- The manuscript **must differ** from the one submitted before. The identical file is caught client-side by hash before it uploads, and again server-side against `theses.sha256_hash`
- The researcher may correct the **title and author list** — returns are often about exactly those. Level, category, and the assigned adviser are fixed; reassigning an adviser mid-review would let a submission walk away from the reviewer who returned it
- The new manuscript's hash, transaction, abstract, and PDF replace the old ones on the row; `revision_count` increments and the superseded PDF is deleted from storage. The old chain entry remains on chain, simply no longer referenced
- Any reviewer correction to the previous abstract is cleared, since the new abstract came out of a different PDF
- Author rows are rewritten only when the list actually changed, re-running co-author account matching

- Every decision writes a `thesis_reviews` row carrying the reviewer, their role, the decision, and their comments. **Returning or rejecting requires written comments** — enforced in the action and by a DB CHECK
- The researcher reads those comments in full on their dashboard. A returned submission is useless without them
- An adviser may only act on submissions where `adviser_id` matches them
- Status updates are guarded by `.eq("status", previousStatus)` so two reviewers acting concurrently cannot both apply a decision
- Each decision writes two `activity_logs` rows: one for the reviewer's trail, one for the submitter's feed
- Decisions are rate-limited to 60/hour per reviewer

**Queues**: `/adviser` lists submissions in `pending_adviser` assigned to the signed-in adviser; `/admin/review` lists everything in `pending_librarian`. Both surface two advisory flags — `similarity_flagged` and a low-confidence abstract. Sidebar badges show the pending count.

## F4: Certificate Generation
- Generated on demand (not stored), via jsPDF + qrcode
- Contains: authors, title, level, category, submission type, SHA-256 fingerprint, transaction reference, timestamp, and a QR code linking to the ledger entry
- Authors are rendered under a single "Authors" label, one name per line
- Certificate text frames the document as a **record of submission** — not proof of authorship, and not by itself a statement of academic approval
- If the thesis belongs to a version chain (>1 entry), a "Version History" table is included
- Ink-on-paper palette matching the archive's design system
- Downloadable and regeneratable at any time from the dashboard

## F5: Public Archive & Verification (no login)
- Two modes: **Search** and **Verify**
- Search: keyword input + filters (level, category, submission type, date range). Results are a record list — level · category · year, title, authors, and an abstract snippet — each linking to `/thesis/[id]`
- **Search returns `accepted` and `flagged` records only.** RLS enforces the same rule, so the application filter is defence in depth rather than the only gate
- Verify: upload a PDF (hashed client-side, purely for lookup) or paste a hash → checks the chain → returns the record or no match
- If the verified thesis belongs to a version chain, a version-history timeline is displayed

## F6: Thesis Detail Page — `/thesis/[id]`
- Public route. Metadata and the **full abstract** are open to anyone for a published record
- Keywords, when the extractor found them, are shown as chips
- **Stakeholders** (F15) get the manuscript reader: an iframe over `GET /api/theses/[id]/pdf`. Everyone else sees an explicit "full text restricted" notice explaining who has access and why
- The ledger record — fingerprint, transaction, block timestamp, Etherscan link — sits inside a collapsed `<details>` labelled "Record integrity". This is the only place blockchain detail appears in the reading experience
- Unpublished records return 404 to non-stakeholders

## F7: Dispute Flag System (Threaded)
- Any approved **researcher** can flag any thesis except their own
- A dispute is a 3-party thread between **flagger**, **librarian**, and the **thesis owner**
- Filing creates a `disputes` row plus an opening `dispute_messages` row (`author_role: 'flagger'`); the flagger's read pointer is set immediately
- Disputes can also be auto-generated by the similarity system (F8) — the opening message is authored by the matched owner with `author_role: 'owner'`
- Any participant can reply while `open`. Replies are rate-limited to 30/minute per user
- **The flagger is anonymized** to the thesis owner ("Anonymous flagger") to discourage retaliation. The flagger sees the owner's real name; the librarian sees everyone
- Each reply inserts `activity_logs` rows for the two non-actor participants, feeding the unread badge
- Resolution is librarian-only via `PATCH /api/disputes/[id]` with a required `closing_note`, appended as a final `admin` message before `status` flips to `resolved` (read-only at the DB layer thereafter)
- Resolution does NOT alter the blockchain record or the thesis's own status
- Rate-limited to 20/hour per librarian; notifies both flagger and owner

## F8: Title-Based Alert System
- Runs after every successful submission, non-blocking, via `after()`
- Process:
  1. Normalize the incoming title (lowercase, strip punctuation, collapse whitespace) → `title_normalized`
  2. Query `find_similar_titles` using `pg_trgm`, threshold from `TITLE_ALERT_THRESHOLD` (default 0.50)
  3. Skip same-owner matches entirely (e.g. a user's own Draft → Final)
  4. De-duplicate matches by version-chain root
  5. Insert a `title_alerts` row per remaining match
  6. If a score meets `AUTO_FLAG_THRESHOLD` (default 0.75), open a dispute authored by the matched owner and set **`similarity_flagged = true`** on the incoming thesis. One auto-flag per submission, regardless of how many matches clear the bar
- **`similarity_flagged` is advisory.** It raises a warning banner for the adviser and librarian and never changes `status` — setting `status` here would eject a submission from the review pipeline it just entered
- Thresholds are environment-configurable so they can be tuned without a deploy

## F9: User Management
- The librarian can view all non-librarian users
- The queue shows each account's current role and, for pending accounts, the role it requested
- Pending users can be approved (promoting `requested_role`) or rejected
- Approved users can be deactivated or have approval revoked; both can be restored
- Deactivated and revoked users are signed out on the next request and see a distinct message at login
- `last_active_at` is tracked for activity monitoring
- Bulk approve / reject / revoke with progress feedback

## F10: Librarian Dashboard
- Charts (Chart.js, academic palette): category distribution, level distribution, monthly submission volume, open vs resolved disputes, title-alert counts
- **Review queue** — adviser-endorsed submissions awaiting approval
- Thesis registry table: every thesis at any status, with post-publication status changes
- Dispute management: paginated, filterable by status, full thread inline
- Title alert log: matched pairs, similarity scores, sortable
- Activity logs, analytics, and read-only system configuration
- All tables paginated 15/page; the Disputes and Review Queue nav items carry count badges

## F11: Researcher Dashboard
- **Anything returned for revision is surfaced first**, above the statistics
- Stat cards: submissions (with published / in-review breakdown), open disputes, title alerts, recent activity
- Submissions table paginated 15/page; each row opens a detail modal carrying the **review tracker** (`ReviewTimeline`), the abstract, the full **review history with reviewer comments**, and the record-integrity disclosure
- Browse Archive, Disputes (two tabs: "Filed by me" / "On my theses"), Title Alerts, Settings

## F12: Version Chain
- Theses can be linked in a linear chain via `previous_thesis_id` — at most one predecessor and one successor
- Only the user's own drafts without an existing child are valid revision targets
- Displayed as a vertical timeline with version numbering, submission-type badges, and current-entry highlighting
- Appears in the dashboard modal and the certificate PDF
- Built in-memory by walking backward to the root then forward; cycle-safe via `Set` guards

## F13: Activity Logging
- Key actions are logged: submission, review decisions, status changes, dispute activity, account changes
- Append-only, never modified
- Users see their own; the librarian sees all

## F14: Abstract Extraction
- `lib/pdf/extract.ts`, built on `unpdf`
- Scans the first 8 pages for a heading matching `ABSTRACT` standalone, or `Abstract:` with the text running on
- Captures forward until a terminator: `KEYWORDS`, `INDEX TERMS`, `TABLE OF CONTENTS`, `ACKNOWLEDGEMENTS`, `DEDICATION`, `LIST OF TABLES/FIGURES`, `CHAPTER 1`, `INTRODUCTION`, `APPROVAL SHEET`, `REFERENCES`
- Cleans the capture: drops page numbers and running folios, rejoins words hyphenated across a line break, collapses whitespace
- Parses a trailing `KEYWORDS:` line into `keywords[]`
- Validates 200–5000 characters and ≥40 words
- **Confidence**: `high` when an explicit heading was found; `low` when it fell back to the first substantial run of prose. Low confidence warns the researcher before submitting and raises a banner for the reviewer
- **Rejections**, each with guidance the researcher can act on: no text layer (a scan), no abstract found, too short, too long, unreadable PDF
- The prose fallback discriminates real prose from contents pages by line length, sentence terminators, digit density, and dot leaders — PDF extraction does not preserve blank lines, so paragraph splitting alone would treat a whole table of contents as one paragraph
- **Correction**: an adviser (during their review) or the librarian (any time) can rewrite the abstract via `correctAbstract`, recorded in `abstract_corrected_by` / `abstract_corrected_at`. The submitter can never edit it, so an abstract is never authored by the person whose work it describes

## F15: Manuscript Access Control
- Manuscripts live in a **private** Supabase Storage bucket with no RLS policies at all
- The only way out is `GET /api/theses/[id]/pdf`, which authorizes then **streams** the bytes. Streaming rather than redirecting to a signed URL means every read is re-authorized and there is no link to forward
- Access is granted to:
  - the submitter (`theses.user_id`)
  - any listed co-author matched to an account (`thesis_authors.user_id`)
  - the assigned adviser (`theses.adviser_id`)
  - the librarian
- Everyone else — including signed-in researchers browsing the archive — gets metadata and the abstract, and a 403 with an explanation on the PDF route
- `private.is_thesis_stakeholder()` encodes the same rule in Postgres so RLS and the application agree
- Rate-limited to 120 requests/minute per user

## F16: Settings
- All roles: profile summary (name, email, role) and password change with current-password verification
- Librarian additionally: read-only system configuration — network, contract address, similarity thresholds and their source
