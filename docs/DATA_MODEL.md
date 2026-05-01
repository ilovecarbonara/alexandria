# Data Model

## Extensions

| Extension | Purpose                                    |
|-----------|--------------------------------------------|
| pg_trgm   | Trigram-based similarity matching for title comparison |

## Enum Types

| Enum                | Values                                     |
|---------------------|--------------------------------------------|
| thesis_level        | undergraduate, masteral, doctoral          |
| submission_type     | draft, final                               |
| thesis_status       | pending, accepted, flagged, rejected       |
| dispute_status      | open, resolved                             |
| dispute_author_role | flagger, admin, owner                      |
| alert_status        | sent, failed, notified                     |

## Supabase Tables

### users
| Column         | Type        | Nullable | Default | Constraints / Notes                        |
|----------------|-------------|----------|---------|--------------------------------------------|
| id             | uuid        | NO       |         | PK · FK → auth.users(id) ON DELETE CASCADE |
| email          | text        | NO       |         | Must be @uspf.edu.ph                       |
| full_name      | text        | NO       |         |                                            |
| is_approved    | boolean     | NO       | false   | Admin approves before access               |
| is_admin       | boolean     | NO       | false   | Only one seeded admin                      |
| is_active      | boolean     | NO       | true    | Admin can deactivate users                 |
| last_active_at | timestamptz | YES      |         | Updated on authenticated requests          |
| created_at     | timestamptz | NO       | now()   |                                            |

### theses
| Column             | Type            | Nullable | Default   | Constraints / Notes                                      |
|--------------------|-----------------|----------|-----------|----------------------------------------------------------|
| id                 | uuid            | NO       | gen_random_uuid() | PK                                                |
| user_id            | uuid            | NO       |           | FK → users.id ON DELETE CASCADE                          |
| title              | text            | NO       |           |                                                          |
| title_normalized   | text            | NO       |           | Lowercased, stripped — used for similarity matching       |
| authors_search     | text            | NO       | ''        | Denormalized author names for fast `ILIKE` search; maintained by trigger |
| thesis_level       | thesis_level    | NO       |           | undergraduate, masteral, doctoral                        |
| thesis_category    | text            | NO       |           | User-selected from predefined list                       |
| submission_type    | submission_type | NO       |           | draft, final                                             |
| sha256_hash        | text            | NO       |           | UNIQUE — one hash per entry                              |
| tx_hash            | text            | NO       |           | Blockchain transaction hash                              |
| block_timestamp    | timestamptz     | NO       |           | Timestamp from blockchain                                |
| previous_thesis_id | uuid            | YES      |           | FK → theses.id ON DELETE SET NULL — links version chain  |
| status             | thesis_status   | NO       | 'pending' | pending, accepted, flagged, rejected                     |
| registered_at      | timestamptz     | NO       | now()     | System registration time                                 |

### thesis_authors
Author rows are an ordered snapshot captured at registration time. The thesis owner (`theses.user_id`) remains the single account owner, and the registration API independently verifies that the owner is included in this list.

| Column    | Type | Nullable | Default | Constraints / Notes |
|-----------|------|----------|---------|---------------------|
| id        | uuid | NO       | gen_random_uuid() | PK |
| thesis_id | uuid | NO       |         | FK → theses.id ON DELETE CASCADE |
| name      | text | NO       |         | Author display name at registration time |
| position  | int  | NO       |         | 1-based display order; UNIQUE (thesis_id, position) |

### disputes
A dispute is a 3-party thread between flagger, admin, and thesis owner. The opening reason and the admin's closing note are NOT stored as columns — they are messages in `dispute_messages`.

| Column           | Type           | Nullable | Default | Constraints / Notes                                      |
|------------------|----------------|----------|---------|----------------------------------------------------------|
| id               | uuid           | NO       | gen_random_uuid() | PK                                            |
| thesis_id        | uuid           | NO       |         | FK → theses.id ON DELETE CASCADE                         |
| flagged_by       | uuid           | NO       |         | FK → users.id ON DELETE CASCADE                          |
| status           | dispute_status | NO       | 'open'  | open, resolved                                           |
| resolved_by      | uuid           | YES      |         | FK → users.id ON DELETE SET NULL — admin who resolved    |
| resolved_at      | timestamptz    | YES      |         | Timestamp when dispute was resolved                      |
| created_at       | timestamptz    | NO       | now()   |                                                          |

### dispute_messages
Thread bodies — opening reason, replies, and the admin closing note. Inserts are rejected by RLS once the parent dispute status is `resolved`, making resolved threads read-only.

| Column      | Type                | Nullable | Default           | Constraints / Notes                                  |
|-------------|---------------------|----------|-------------------|------------------------------------------------------|
| id          | uuid                | NO       | gen_random_uuid() | PK                                                   |
| dispute_id  | uuid                | NO       |                   | FK → disputes.id ON DELETE CASCADE                   |
| author_id   | uuid                | NO       |                   | FK → users.id ON DELETE CASCADE                      |
| author_role | dispute_author_role | NO       |                   | flagger, admin, owner — must match caller's role     |
| body        | text                | NO       |                   | Sanitized via `sanitizeTextInput`, ≤ MAX_REASON_LENGTH |
| created_at  | timestamptz         | NO       | now()             |                                                      |

### dispute_reads
Per-user last-read pointer used to derive unread counts for the sidebar badge and dispute list. Composite PK `(dispute_id, user_id)`.

| Column       | Type        | Nullable | Default | Constraints / Notes                          |
|--------------|-------------|----------|---------|----------------------------------------------|
| dispute_id   | uuid        | NO       |         | FK → disputes.id ON DELETE CASCADE — PK part |
| user_id      | uuid        | NO       |         | FK → users.id ON DELETE CASCADE — PK part    |
| last_read_at | timestamptz | NO       | now()   | Upserted by `markDisputeRead` server action  |

### title_alerts
| Column            | Type         | Nullable | Default    | Constraints / Notes                                     |
|-------------------|--------------|----------|------------|---------------------------------------------------------|
| id                | uuid         | NO       | gen_random_uuid() | PK                                              |
| new_thesis_id     | uuid         | NO       |            | FK → theses.id ON DELETE CASCADE — incoming registration |
| matched_thesis_id | uuid         | NO       |            | FK → theses.id ON DELETE CASCADE — existing match       |
| notified_user_id  | uuid         | NO       |            | FK → users.id ON DELETE CASCADE — alert recipient       |
| similarity_score  | real         | NO       |            | CHECK (0.0–1.0) — pg_trgm score at time of match       |
| status            | alert_status | NO       | 'notified' | notified                                                |
| created_at        | timestamptz  | NO       | now()      |                                                         |

### activity_logs
| Column     | Type        | Nullable | Default           | Constraints / Notes                          |
|------------|-------------|----------|-------------------|----------------------------------------------|
| id         | uuid        | NO       | gen_random_uuid() | PK                                           |
| user_id    | uuid        | NO       |                   | FK → users.id ON DELETE CASCADE              |
| action     | text        | NO       |                   | Description of the action                    |
| thesis_id  | uuid        | YES      |                   | FK → theses.id ON DELETE SET NULL            |
| created_at | timestamptz | NO       | now()             |                                              |

## Indexes

| Index Name                     | Table        | Column(s)          | Type  | Purpose                              |
|--------------------------------|--------------|--------------------|-------|--------------------------------------|
| idx_theses_user_id             | theses       | user_id            | B-tree | Fast lookup by owner                |
| idx_theses_sha256_hash         | theses       | sha256_hash        | B-tree | Fast duplicate / verification check |
| idx_theses_previous_thesis_id  | theses       | previous_thesis_id | B-tree | Version chain traversal             |
| idx_theses_title_trgm          | theses       | title_normalized   | GIN (gin_trgm_ops) | Trigram similarity search |
| idx_theses_authors_search      | theses       | authors_search     | GIN (gin_trgm_ops) | Fast author name search |
| idx_theses_status              | theses       | status             | B-tree | Filter by thesis status             |
| idx_thesis_authors_thesis_id   | thesis_authors | thesis_id        | B-tree | Fetch ordered authors for a thesis  |
| idx_disputes_thesis_id         | disputes     | thesis_id          | B-tree | Lookup disputes for a thesis        |
| idx_disputes_flagged_by        | disputes     | flagged_by         | B-tree | "Filed by me" list lookup           |
| idx_disputes_status            | disputes     | status             | B-tree | Filter by dispute status            |
| idx_dispute_messages_dispute_id| dispute_messages | (dispute_id, created_at) | B-tree | Ordered thread fetch     |
| idx_dispute_messages_author_id | dispute_messages | author_id      | B-tree | Author lookup                       |
| idx_dispute_reads_user_id      | dispute_reads | user_id           | B-tree | Per-user unread aggregation         |
| idx_activity_logs_user_id      | activity_logs| user_id            | B-tree | User activity lookup                |
| idx_activity_logs_thesis_id    | activity_logs| thesis_id          | B-tree | Lookup activity for a specific thesis |
| idx_title_alerts_notified_user | title_alerts | notified_user_id   | B-tree | User alert lookup                   |

## Row Level Security

RLS is enabled on all eight application tables (`users`, `theses`, `thesis_authors`, `disputes`, `dispute_messages`, `dispute_reads`, `activity_logs`, `title_alerts`). An internal helper function `private.is_admin()` (SECURITY DEFINER, executes as the database owner) is used by admin policies to avoid infinite recursion when checking the `users` table.

### users
| Policy                    | Operation | Role          | Condition                  |
|---------------------------|-----------|---------------|----------------------------|
| Users can read own row    | SELECT    | authenticated | auth.uid() = id            |
| Admin can read all users  | SELECT    | authenticated | private.is_admin()         |
| Admin can update users    | UPDATE    | authenticated | private.is_admin()         |
| Users can insert own row  | INSERT    | authenticated | auth.uid() = id            |

### theses
| Policy                                    | Operation | Role                | Condition              |
|-------------------------------------------|-----------|---------------------|------------------------|
| Theses are publicly readable              | SELECT    | authenticated, anon | true (unrestricted)    |
| Authenticated users can insert own theses | INSERT    | authenticated       | auth.uid() = user_id   |
| Admin can update theses                   | UPDATE    | authenticated       | private.is_admin()     |

### thesis_authors
| Policy                              | Operation | Role                | Condition           |
|-------------------------------------|-----------|---------------------|---------------------|
| Thesis authors are publicly readable| SELECT    | authenticated, anon | true (unrestricted) |

> Inserts into `thesis_authors` are performed server-side via the Supabase service role key after a thesis row is created. No INSERT policy is defined for browser clients.

### disputes
| Policy                                 | Operation | Role          | Condition                                                                 |
|----------------------------------------|-----------|---------------|---------------------------------------------------------------------------|
| Authenticated users can create disputes| INSERT    | authenticated | auth.uid() = flagged_by                                                   |
| Participants can read disputes         | SELECT    | authenticated | private.is_admin() OR flagged_by = auth.uid() OR thesis.user_id = auth.uid() |
| Admin can update disputes              | UPDATE    | authenticated | private.is_admin()                                                        |

### dispute_messages
| Policy                                  | Operation | Role          | Condition                                                                                   |
|-----------------------------------------|-----------|---------------|---------------------------------------------------------------------------------------------|
| Participants can read dispute messages  | SELECT    | authenticated | Caller is admin OR dispute.flagged_by OR thesis.user_id of the parent dispute               |
| Participants can post dispute messages  | INSERT    | authenticated | author_id = auth.uid() AND parent dispute is `open` AND caller is a participant of it       |

> Resolved threads are read-only at the database layer — the INSERT policy requires `dispute.status = 'open'`. The application also enforces `author_role` consistency with the caller's role in the dispute.

### dispute_reads
| Policy                          | Operation | Role          | Condition                  |
|---------------------------------|-----------|---------------|----------------------------|
| Users can read own dispute reads| SELECT    | authenticated | user_id = auth.uid()       |
| Users can upsert own dispute reads | INSERT | authenticated | user_id = auth.uid()       |
| Users can update own dispute reads | UPDATE | authenticated | user_id = auth.uid() (USING + WITH CHECK) |

### activity_logs
| Policy                                       | Operation | Role          | Condition              |
|----------------------------------------------|-----------|---------------|------------------------|
| Admin can read all activity logs             | SELECT    | authenticated | private.is_admin()     |
| Users can read own activity logs             | SELECT    | authenticated | auth.uid() = user_id   |
| Authenticated users can insert own activity logs | INSERT | authenticated | auth.uid() = user_id   |

### title_alerts
| Policy                    | Operation | Role          | Condition                       |
|---------------------------|-----------|---------------|---------------------------------|
| Users can read own alerts | SELECT    | authenticated | auth.uid() = notified_user_id   |
| Admin can read all alerts | SELECT    | authenticated | private.is_admin()              |

> Inserts into `title_alerts` are performed server-side via the Supabase service role key, which bypasses RLS. No INSERT policy is defined.

## Database Functions

### find_similar_titles

Finds existing theses with titles similar to a given input using `pg_trgm` trigram matching.

| Parameter             | Type | Default | Description                          |
|-----------------------|------|---------|--------------------------------------|
| target_title          | text | —       | Normalized title to compare against  |
| similarity_threshold  | real | 0.75    | Minimum similarity score (0.0–1.0)   |
| exclude_thesis_id     | uuid | NULL    | Thesis to exclude from results       |

**Returns:** `TABLE (thesis_id uuid, title text, title_normalized text, user_id uuid, similarity_score real)`

Results are ordered by `similarity_score` descending.

## Smart Contract (Solidity)

### Struct: ThesisRecord
- sha256Hash: string
- submissionType: string
- thesisLevel: string
- thesisCategory: string
- timestamp: uint256
- registeredBy: address

### Functions
- registerThesis(hash, submissionType, level, category) → emits ThesisRegistered event
- getThesis(hash) → returns ThesisRecord
- isRegistered(hash) → returns bool

### Events
- ThesisRegistered(hash, registeredBy, timestamp)