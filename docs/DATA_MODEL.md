# Data Model

The executable source of truth is `docs/DATABASE_MIGRATION.sql`. This document describes it.

## Extensions

| Extension | Purpose |
|-----------|---------|
| pg_trgm   | Trigram-based similarity matching for title comparison |
| pgcrypto  | `gen_random_uuid()` for primary keys |

## Enum Types

| Enum | Values |
|------|--------|
| user_role | student, adviser, librarian |
| thesis_level | undergraduate, masteral, doctoral |
| submission_type | draft, final |
| thesis_status | draft, pending_adviser, returned, pending_librarian, accepted, rejected, flagged |
| user_approval_status | pending, approved, rejected, revoked |
| reviewer_role | adviser, librarian |
| review_decision | endorsed, returned, approved, rejected |
| abstract_confidence | high, low |
| dispute_status | open, resolved |
| dispute_author_role | flagger, admin, owner |
| alert_status | sent, failed, notified |

### thesis_status

The review pipeline. `draft` and `rejected` are resting states, the two `pending_*` values are queues, `returned` bounces back to the student, and only `accepted` and `flagged` are publicly visible.

```
insert      → draft (Draft) | pending_adviser (Final)
student     → returned ⇒ pending_adviser
adviser     → pending_adviser ⇒ pending_librarian | returned
librarian   → pending_librarian ⇒ accepted | rejected | returned
              accepted ⇒ flagged | rejected
              flagged  ⇒ accepted | rejected
              draft    ⇒ rejected
```

Enforced in `lib/workflow.ts`; nothing writes `theses.status` outside it.

## Storage

A single **private** bucket, `theses`, holding the archived manuscripts.

| Setting | Value |
|---------|-------|
| public | false |
| file_size_limit | 26214400 (25 MB) |
| allowed_mime_types | application/pdf |

Paths: `staging/{user_id}/{sha256}.pdf` while a submission is being filled in, `archive/{thesis_id}/{sha256}.pdf` once the thesis row exists.

The bucket has **no RLS policies**, deliberately. Reads go through `GET /api/theses/[id]/pdf`, which re-authorizes per request and streams the bytes; writes arrive via short-lived signed upload URLs minted server-side.

## Tables

### users
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | | PK · FK → auth.users(id) CASCADE |
| email | text | NO | | Must be @uspf.edu.ph |
| full_name | text | NO | | |
| full_name_normalized | text | NO | '' | Maintained by `trg_users_normalize_name`; used for co-author matching |
| approval_status | user_approval_status | NO | 'pending' | |
| role | user_role | NO | 'student' | The live role |
| requested_role | user_role | NO | 'student' | Asked for at sign-up; promoted into `role` on approval. CHECK: never 'librarian' |
| is_active | boolean | NO | true | |
| last_active_at | timestamptz | YES | | |
| created_at | timestamptz | NO | now() | |

### theses
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| user_id | uuid | NO | | FK → users CASCADE. The submitter |
| adviser_id | uuid | YES | | FK → users SET NULL. NULL for drafts |
| title | text | NO | | |
| title_normalized | text | NO | | Lowercased, stripped — drives similarity matching |
| authors_search | text | NO | '' | Denormalized author names; maintained by trigger |
| abstract | text | YES | | **Machine-extracted from the PDF.** Never typed by the submitter |
| abstract_confidence | abstract_confidence | YES | | `low` means it was inferred without an explicit heading |
| abstract_extracted_at | timestamptz | YES | | |
| abstract_corrected_by | uuid | YES | | FK → users SET NULL. A reviewer, never the submitter |
| abstract_corrected_at | timestamptz | YES | | |
| keywords | text[] | NO | '{}' | Parsed from a trailing KEYWORDS line |
| thesis_level | thesis_level | NO | | |
| thesis_category | text | NO | | From a predefined list |
| submission_type | submission_type | NO | | |
| sha256_hash | text | NO | | UNIQUE. **Computed server-side** from the archived bytes |
| tx_hash | text | NO | | |
| block_timestamp | timestamptz | NO | | |
| pdf_path | text | YES | | Object key in the `theses` bucket |
| pdf_size_bytes | bigint | YES | | |
| pdf_page_count | int | YES | | |
| previous_thesis_id | uuid | YES | | Self-FK SET NULL — version chain |
| status | thesis_status | NO | 'draft' | |
| similarity_flagged | boolean | NO | false | **Advisory only.** Warns reviewers; never changes `status` |
| revision_count | int | NO | 0 | Increments on each resubmission |
| adviser_reviewed_at | timestamptz | YES | | |
| librarian_reviewed_at | timestamptz | YES | | |
| registered_at | timestamptz | NO | now() | |

CHECK `draft_status_scope`: a Draft may only be in `draft` or `rejected`.

`adviser_id` is required for Finals, but that is enforced in `register_thesis_with_authors` rather than as a CHECK — the FK is ON DELETE SET NULL, and a CHECK would make deleting an adviser account fail instead of orphaning their reviews.

### thesis_authors
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NO | PK |
| thesis_id | uuid | NO | FK → theses CASCADE |
| name | text | NO | CHECK length > 0 |
| user_id | uuid | YES | FK → users SET NULL. Resolved at registration by matching `name` against `users.full_name_normalized`. **A match is what grants a co-author full-text access** |
| position | int | NO | CHECK 1–6 · UNIQUE (thesis_id, position) |

An ordered snapshot captured at submission. The registration API independently verifies the submitter is in this list. Up to six authors.

### thesis_reviews
Every adviser and librarian decision, in order. Carries the comments the student reads when a submission is returned.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| thesis_id | uuid | NO | | FK → theses CASCADE |
| reviewer_id | uuid | NO | | FK → users CASCADE |
| reviewer_role | reviewer_role | NO | | |
| decision | review_decision | NO | | |
| comments | text | YES | | |
| revision_number | int | NO | 0 | The `revision_count` at the time of the decision |
| created_at | timestamptz | NO | now() | |

CHECK `negative_decision_needs_comments`: a `returned` or `rejected` decision must carry non-empty comments.

### staged_uploads
Bridges the two-step upload: the browser uploads straight to Storage, then the server hashes and parses the staged object before the metadata form is submitted. Rows are consumed by registration or expired by cleanup.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NO | PK |
| user_id | uuid | NO | FK → users CASCADE |
| sha256_hash | text | NO | Server-computed |
| storage_path | text | NO | |
| abstract | text | YES | |
| abstract_confidence | abstract_confidence | YES | |
| keywords | text[] | NO | |
| page_count | int | YES | |
| size_bytes | bigint | YES | |
| original_filename | text | YES | |
| created_at | timestamptz | NO | |

UNIQUE (user_id, storage_path) — re-processing the same file updates the row rather than piling up.

### disputes
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| thesis_id | uuid | NO | | FK → theses CASCADE |
| flagged_by | uuid | NO | | FK → users CASCADE |
| status | dispute_status | NO | 'open' | |
| resolved_by | uuid | YES | | FK → users SET NULL |
| resolved_at | timestamptz | YES | | |
| created_at | timestamptz | NO | now() | |

A dispute is a 3-party thread between flagger, librarian, and thesis owner. The opening reason and the closing note are **not** columns — they are messages in `dispute_messages`.

### dispute_messages
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NO | PK |
| dispute_id | uuid | NO | FK → disputes CASCADE |
| author_id | uuid | NO | FK → users CASCADE |
| author_role | dispute_author_role | NO | |
| body | text | NO | Sanitized, ≤ MAX_REASON_LENGTH |
| created_at | timestamptz | NO | |

Inserts are rejected by RLS once the parent dispute is `resolved`.

### dispute_reads
Composite PK (dispute_id, user_id) plus `last_read_at`. Drives unread badges.

### activity_logs
`id`, `user_id` (FK → users CASCADE), `action` (text), `thesis_id` (FK → theses SET NULL), `created_at`. Append-only.

### title_alerts
`id`, `new_thesis_id`, `matched_thesis_id` (both FK → theses CASCADE), `notified_user_id` (FK → users CASCADE), `similarity_score` (real, CHECK 0.0–1.0), `status` (alert_status, default `notified`), `created_at`.

### rate_limits
`key` (PK), `count` (CHECK ≥ 0), `reset_at`. No client policies; written only by `consume_rate_limit`.

## Indexes

Beyond the primary and foreign keys:

- `idx_theses_title_trgm` — GIN `gin_trgm_ops` on `title_normalized`
- `idx_theses_authors_search` — GIN `gin_trgm_ops` on `authors_search`
- `idx_theses_adviser_queue` — partial on `(adviser_id, status) WHERE status = 'pending_adviser'`
- `idx_theses_librarian_queue` — partial on `(status, registered_at) WHERE status = 'pending_librarian'`
- `idx_thesis_authors_user_id`, `idx_thesis_reviews_thesis_id`, `idx_users_role`, `idx_users_full_name_normalized`, plus the dispute, activity, and alert indexes

## Row Level Security

RLS is enabled on all eleven tables. Authorization helpers live in the `private` schema, all `SECURITY DEFINER` with `search_path = ''`:

| Function | Returns |
|----------|---------|
| `private.current_role()` | the caller's `user_role` |
| `private.has_role(variadic user_role[])` | whether the caller holds one of them |
| `private.is_thesis_stakeholder(uuid)` | submitter ∪ matched co-author ∪ assigned adviser ∪ librarian |
| `private.can_view_thesis(uuid)` | published, or a stakeholder |

`is_thesis_stakeholder` is `SECURITY DEFINER` so the policies on `theses` and `thesis_authors` can call it without re-entering each other's RLS. It is also the exact rule the PDF route applies, so the database and the application agree by construction.

### Key policies

| Table | Policy | Using |
|-------|--------|-------|
| theses | Published theses are publicly readable | `status IN ('accepted','flagged')` — `authenticated, anon` |
| theses | Stakeholders can read in-pipeline theses | `private.is_thesis_stakeholder(id)` |
| theses | Students can insert own theses | `auth.uid() = user_id` |
| thesis_authors | follow thesis visibility | `private.can_view_thesis(thesis_id)` |
| thesis_reviews | Stakeholders can read reviews | `private.is_thesis_stakeholder(thesis_id)` — this is how a student reads their reviewer's comments |
| users | Authenticated users can read advisers | `role = 'adviser' AND approval_status = 'approved' AND is_active` |
| users | Librarian can read/update all | `private.has_role('librarian')` |
| dispute_messages | Participants can post | author is caller AND parent is `open` AND caller is a participant |

**This is a deliberate tightening.** The previous schema exposed every thesis row to `anon` with `USING (true)` and filtered only in application code. Unpublished work is now invisible at the database.

`theses` has **no client UPDATE policy**: every status change runs through the transition matrix and is written with the service role, so granting PostgREST update rights would only widen the surface without being used. The same reasoning applies to `thesis_reviews` inserts, `thesis_authors` writes, and `title_alerts` writes.

## Database Functions

| Function | Notes |
|----------|-------|
| `public.normalize_name(text)` | IMMUTABLE. Mirrors `normalizeNameForComparison` in `lib/validation.ts` |
| `public.sync_full_name_normalized()` | BEFORE INSERT/UPDATE trigger on `users.full_name` |
| `public.find_similar_titles(target_title, similarity_threshold, exclude_thesis_id)` | Returns matches ordered by `similarity()` desc |
| `public.refresh_authors_search()` | AFTER trigger on `thesis_authors`; skippable via `alexandria.skip_authors_sync` |
| `public.register_thesis_with_authors(...)` | Atomic thesis + ordered authors insert. Resolves each author name to an account, derives the initial status from `submission_type`, and rejects a Final without an adviser. Granted to `service_role` only |
| `public.consume_rate_limit(key, limit, window_ms)` | SECURITY DEFINER, row-locked counter. `service_role` only |

## Smart Contract

### Struct: ThesisRecord
- `sha256Hash: bytes32`
- `submissionType: string`
- `thesisLevel: string`
- `thesisCategory: string`
- `timestamp: uint256`
- `registeredBy: address`

### Functions
- `registerThesis(hash, submissionType, level, category)` — `onlyOwner`; emits `ThesisRegistered`
- `getThesis(hash)` → `ThesisRecord`
- `isRegistered(hash)` → `bool`
- `transferOwnership(address)` — `onlyOwner`

### Events
- `ThesisRegistered(hash, registeredBy, timestamp)`
- `OwnershipTransferred(previousOwner, newOwner)`

Writes are owner-only, so the application is a single-signer custodian: the server's deployer wallet signs every entry. Users hold no wallets and pay no gas. The chain stores only the fingerprint and three metadata strings — every queryable field lives in Postgres.
