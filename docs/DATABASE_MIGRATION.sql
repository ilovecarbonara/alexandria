-- Alexandria Fresh Supabase Database Migration
-- Run this in the Supabase SQL Editor for a new project/database.
--
-- This schema supersedes the hash-only model. Alexandria now archives the
-- manuscript PDF itself and carries a four-role, three-stage review pipeline:
--
--   student submits -> adviser reviews -> librarian approves -> public registry
--
-- Roles are `users.role` (student | adviser | librarian). The old `is_admin`
-- boolean is gone.

-- ============================================================
-- Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Enum Types
-- ============================================================

CREATE TYPE user_role AS ENUM ('student', 'adviser', 'librarian');
CREATE TYPE thesis_level AS ENUM ('undergraduate', 'masteral', 'doctoral');
CREATE TYPE submission_type AS ENUM ('draft', 'final');

-- The review pipeline. `draft` and the three terminal-ish states are the only
-- ones a thesis can rest in indefinitely; the two `pending_*` states are queues.
CREATE TYPE thesis_status AS ENUM (
  'draft',              -- Draft submission. Private to owner + librarian, never public.
  'pending_adviser',    -- Final submitted, awaiting the assigned adviser.
  'returned',           -- Sent back to the student for revision.
  'pending_librarian',  -- Adviser endorsed, awaiting the librarian.
  'accepted',           -- Librarian approved. PUBLIC.
  'rejected',           -- Terminal.
  'flagged'             -- Published, then disputed. Librarian-set, post-publication.
);

CREATE TYPE user_approval_status AS ENUM ('pending', 'approved', 'rejected', 'revoked');
CREATE TYPE reviewer_role AS ENUM ('adviser', 'librarian');
CREATE TYPE review_decision AS ENUM ('endorsed', 'returned', 'approved', 'rejected');
CREATE TYPE abstract_confidence AS ENUM ('high', 'low');
CREATE TYPE dispute_status AS ENUM ('open', 'resolved');
CREATE TYPE dispute_author_role AS ENUM ('flagger', 'admin', 'owner');
CREATE TYPE alert_status AS ENUM ('sent', 'failed', 'notified');

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE public.users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL,
  full_name       text NOT NULL,
  -- Name used for co-author matching. Kept in sync by trg_users_normalize_name.
  full_name_normalized text NOT NULL DEFAULT '',
  approval_status user_approval_status NOT NULL DEFAULT 'pending',
  role            user_role NOT NULL DEFAULT 'student',
  -- What the account asked to be at signup. The librarian sees this in the
  -- approval queue and promotes `requested_role` -> `role` on approval.
  requested_role  user_role NOT NULL DEFAULT 'student',
  is_active       boolean NOT NULL DEFAULT true,
  last_active_at  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Nobody may self-register as a librarian.
  CONSTRAINT requested_role_not_librarian CHECK (requested_role <> 'librarian')
);

CREATE TABLE public.theses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- The adviser who reviews this submission. NULL for drafts (never reviewed).
  adviser_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title              text NOT NULL,
  title_normalized   text NOT NULL,
  authors_search     text NOT NULL DEFAULT '',

  -- Machine-extracted from the PDF. Never typed by the submitter; an adviser or
  -- librarian may correct it during review.
  abstract              text,
  abstract_confidence   abstract_confidence,
  abstract_extracted_at timestamptz,
  abstract_corrected_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  abstract_corrected_at timestamptz,
  keywords              text[] NOT NULL DEFAULT '{}',

  thesis_level       thesis_level NOT NULL,
  thesis_category    text NOT NULL,
  submission_type    submission_type NOT NULL,

  -- Blockchain proof-of-existence. Hash is computed server-side from the
  -- stored object, so it is no longer a client-trusted value.
  sha256_hash        text NOT NULL UNIQUE,
  tx_hash            text NOT NULL,
  block_timestamp    timestamptz NOT NULL,

  -- Archived manuscript. Object key inside the private `theses` storage bucket.
  pdf_path           text,
  pdf_size_bytes     bigint,
  pdf_page_count     int,

  previous_thesis_id uuid REFERENCES public.theses(id) ON DELETE SET NULL,
  status             thesis_status NOT NULL DEFAULT 'draft',
  -- Set by the title-similarity check. Advisory only: it warns reviewers and
  -- never moves the thesis out of its pipeline state.
  similarity_flagged boolean NOT NULL DEFAULT false,
  revision_count     int NOT NULL DEFAULT 0,
  adviser_reviewed_at   timestamptz,
  librarian_reviewed_at timestamptz,
  registered_at      timestamptz NOT NULL DEFAULT now(),

  -- Finals need an adviser, but that is enforced in register_thesis_with_authors
  -- rather than as a CHECK: adviser_id is ON DELETE SET NULL, and a CHECK would
  -- make deleting an adviser account fail instead of orphaning their reviews.
  --
  -- Drafts stay out of the review pipeline entirely.
  CONSTRAINT draft_status_scope CHECK (
    submission_type = 'final' OR status IN ('draft', 'rejected')
  )
);

CREATE TABLE public.thesis_authors (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  name      text NOT NULL CHECK (length(btrim(name)) > 0),
  -- Resolved at registration by matching `name` against users.full_name_normalized.
  -- NULL when the listed author has no account. Grants full-text PDF access.
  user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  position  int NOT NULL CHECK (position BETWEEN 1 AND 6),
  UNIQUE (thesis_id, position)
);

-- Every adviser and librarian decision, in order. Carries the comments the
-- student reads when a submission is returned.
CREATE TABLE public.thesis_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id       uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  reviewer_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewer_role   reviewer_role NOT NULL,
  decision        review_decision NOT NULL,
  comments        text,
  revision_number int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- A rejection or a return must explain itself.
  CONSTRAINT negative_decision_needs_comments CHECK (
    decision IN ('endorsed', 'approved')
    OR (comments IS NOT NULL AND length(btrim(comments)) > 0)
  )
);

-- Bridges the two-step upload: the browser uploads straight to Storage, then
-- the server hashes and parses the staged object before the metadata form is
-- submitted. Rows are consumed by registration or expired by cleanup.
CREATE TABLE public.staged_uploads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sha256_hash         text NOT NULL,
  storage_path        text NOT NULL,
  abstract            text,
  abstract_confidence abstract_confidence,
  keywords            text[] NOT NULL DEFAULT '{}',
  page_count          int,
  size_bytes          bigint,
  original_filename   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- Re-processing the same staged file updates the row rather than piling up.
  UNIQUE (user_id, storage_path)
);

CREATE TABLE public.disputes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id   uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  flagged_by  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status      dispute_status NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dispute_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_role dispute_author_role NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dispute_reads (
  dispute_id   uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dispute_id, user_id)
);

CREATE TABLE public.activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action     text NOT NULL,
  thesis_id  uuid REFERENCES public.theses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.title_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  new_thesis_id     uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  matched_thesis_id uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  notified_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  similarity_score  real NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  status            alert_status NOT NULL DEFAULT 'notified',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rate_limits (
  key      text PRIMARY KEY,
  count    int NOT NULL CHECK (count >= 0),
  reset_at timestamptz NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_theses_user_id ON public.theses(user_id);
CREATE INDEX idx_theses_adviser_id ON public.theses(adviser_id);
CREATE INDEX idx_theses_sha256_hash ON public.theses(sha256_hash);
CREATE INDEX idx_theses_previous_thesis_id ON public.theses(previous_thesis_id);
CREATE INDEX idx_theses_title_trgm ON public.theses USING gin (title_normalized gin_trgm_ops);
CREATE INDEX idx_theses_authors_search ON public.theses USING gin (authors_search gin_trgm_ops);
CREATE INDEX idx_theses_status ON public.theses(status);
-- Drives the adviser and librarian review queues.
CREATE INDEX idx_theses_adviser_queue ON public.theses(adviser_id, status)
  WHERE status = 'pending_adviser';
CREATE INDEX idx_theses_librarian_queue ON public.theses(status, registered_at)
  WHERE status = 'pending_librarian';
CREATE INDEX idx_thesis_authors_thesis_id ON public.thesis_authors(thesis_id);
CREATE INDEX idx_thesis_authors_user_id ON public.thesis_authors(user_id);
CREATE INDEX idx_thesis_reviews_thesis_id ON public.thesis_reviews(thesis_id, created_at);
CREATE INDEX idx_thesis_reviews_reviewer_id ON public.thesis_reviews(reviewer_id);
CREATE INDEX idx_staged_uploads_user_id ON public.staged_uploads(user_id);
CREATE INDEX idx_staged_uploads_created_at ON public.staged_uploads(created_at);
CREATE INDEX idx_disputes_thesis_id ON public.disputes(thesis_id);
CREATE INDEX idx_disputes_flagged_by ON public.disputes(flagged_by);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_dispute_messages_dispute_id ON public.dispute_messages(dispute_id, created_at);
CREATE INDEX idx_dispute_messages_author_id ON public.dispute_messages(author_id);
CREATE INDEX idx_dispute_reads_user_id ON public.dispute_reads(user_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_thesis_id ON public.activity_logs(thesis_id);
CREATE INDEX idx_title_alerts_notified_user ON public.title_alerts(notified_user_id);
CREATE INDEX idx_users_approval_status ON public.users(approval_status);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_full_name_normalized ON public.users(full_name_normalized);

-- ============================================================
-- Storage
-- ============================================================
-- Private bucket for archived manuscripts. There are deliberately NO storage
-- RLS policies: every read is streamed through GET /api/theses/[id]/pdf, which
-- re-authorizes on each request using the service role. Uploads reach the
-- bucket only via short-lived signed upload URLs minted server-side.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('theses', 'theses', false, 26214400, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Private Schema + Authorization Helpers
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;

-- Canonical name form used for co-author matching. Mirrors
-- normalizeNameForComparison() in lib/validation.ts.
CREATE OR REPLACE FUNCTION public.normalize_name(p_name text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(btrim(regexp_replace(COALESCE(p_name, ''), '\s+', ' ', 'g')));
$$;

CREATE OR REPLACE FUNCTION private.current_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.has_role(VARIADIC p_roles user_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role = ANY (p_roles)
  );
$$;

-- Everyone entitled to the full manuscript: the submitter, any listed co-author
-- resolved to an account, the assigned adviser, and the librarian.
-- SECURITY DEFINER so policies on `theses` and `thesis_authors` can call it
-- without re-entering each other's RLS.
CREATE OR REPLACE FUNCTION private.is_thesis_stakeholder(p_thesis_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.theses t
    WHERE t.id = p_thesis_id
      AND (
        t.user_id = (SELECT auth.uid())
        OR t.adviser_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.thesis_authors ta
          WHERE ta.thesis_id = t.id
            AND ta.user_id = (SELECT auth.uid())
        )
      )
  )
  OR (SELECT private.has_role('librarian'));
$$;

-- Metadata + abstract visibility: published to everyone, otherwise stakeholders.
CREATE OR REPLACE FUNCTION private.can_view_thesis(p_thesis_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.theses t
    WHERE t.id = p_thesis_id
      AND t.status IN ('accepted', 'flagged')
  )
  OR (SELECT private.is_thesis_stakeholder(p_thesis_id));
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staged_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ---- users ----

CREATE POLICY "Users can read own row"
  ON public.users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Librarian can read all users"
  ON public.users FOR SELECT
  TO authenticated
  USING ((SELECT private.has_role('librarian')));

-- Students pick an adviser at submission time, so the adviser roster is
-- readable by any signed-in account. Only name/role are ever selected.
CREATE POLICY "Authenticated users can read advisers"
  ON public.users FOR SELECT
  TO authenticated
  USING (role = 'adviser' AND approval_status = 'approved' AND is_active);

CREATE POLICY "Librarian can update users"
  ON public.users FOR UPDATE
  TO authenticated
  USING ((SELECT private.has_role('librarian')));

-- ---- theses ----
-- Only published records are world-readable. Everything still in the pipeline
-- is limited to its stakeholders. This is a deliberate tightening: the previous
-- schema exposed every row to `anon` and filtered only in application code.

CREATE POLICY "Published theses are publicly readable"
  ON public.theses FOR SELECT
  TO authenticated, anon
  USING (status IN ('accepted', 'flagged'));

CREATE POLICY "Stakeholders can read in-pipeline theses"
  ON public.theses FOR SELECT
  TO authenticated
  USING ((SELECT private.is_thesis_stakeholder(id)));

CREATE POLICY "Students can insert own theses"
  ON public.theses FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- No client UPDATE policy. Every status change runs through the transition
-- matrix in lib/workflow.ts and is written with the service role, so granting
-- PostgREST update rights would only widen the surface without being used.

-- ---- thesis_authors ----

CREATE POLICY "Thesis authors follow thesis visibility"
  ON public.thesis_authors FOR SELECT
  TO authenticated, anon
  USING ((SELECT private.can_view_thesis(thesis_id)));

-- ---- thesis_reviews ----
-- The student must be able to read the comments that came back to them.

CREATE POLICY "Stakeholders can read reviews"
  ON public.thesis_reviews FOR SELECT
  TO authenticated
  USING ((SELECT private.is_thesis_stakeholder(thesis_id)));

-- Review rows are written server-side by lib/actions/reviews.ts after the
-- transition matrix has approved the change; no client INSERT policy.

-- ---- staged_uploads ----

CREATE POLICY "Users can read own staged uploads"
  ON public.staged_uploads FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---- disputes ----

CREATE POLICY "Authenticated users can create disputes"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = flagged_by);

CREATE POLICY "Participants can read disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (
    (SELECT private.has_role('librarian'))
    OR flagged_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.theses t
      WHERE t.id = disputes.thesis_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Librarian can update disputes"
  ON public.disputes FOR UPDATE
  TO authenticated
  USING ((SELECT private.has_role('librarian')));

-- ---- dispute_messages ----

CREATE POLICY "Participants can read dispute messages"
  ON public.dispute_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      LEFT JOIN public.theses t ON t.id = d.thesis_id
      WHERE d.id = dispute_messages.dispute_id
        AND (
          (SELECT private.has_role('librarian'))
          OR d.flagged_by = (SELECT auth.uid())
          OR t.user_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY "Participants can post dispute messages"
  ON public.dispute_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.disputes d
      LEFT JOIN public.theses t ON t.id = d.thesis_id
      WHERE d.id = dispute_messages.dispute_id
        AND d.status = 'open'
        AND (
          (SELECT private.has_role('librarian'))
          OR d.flagged_by = (SELECT auth.uid())
          OR t.user_id = (SELECT auth.uid())
        )
    )
  );

-- ---- dispute_reads ----

CREATE POLICY "Users can read own dispute reads"
  ON public.dispute_reads FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can upsert own dispute reads"
  ON public.dispute_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own dispute reads"
  ON public.dispute_reads FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---- activity_logs ----

CREATE POLICY "Librarian can read all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING ((SELECT private.has_role('librarian')));

CREATE POLICY "Users can read own activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Authenticated users can insert own activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---- title_alerts ----

CREATE POLICY "Users can read own alerts"
  ON public.title_alerts FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = notified_user_id);

CREATE POLICY "Librarian can read all alerts"
  ON public.title_alerts FOR SELECT
  TO authenticated
  USING ((SELECT private.has_role('librarian')));

-- rate_limits has no client policies. The consume_rate_limit RPC runs with
-- SECURITY DEFINER and is granted only to the service role.

-- ============================================================
-- Functions + Triggers
-- ============================================================

-- Keeps users.full_name_normalized in step with full_name so co-author
-- resolution is a plain indexed equality lookup.
CREATE OR REPLACE FUNCTION public.sync_full_name_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.full_name_normalized := public.normalize_name(NEW.full_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_normalize_name
BEFORE INSERT OR UPDATE OF full_name ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_full_name_normalized();

CREATE OR REPLACE FUNCTION public.find_similar_titles(
  target_title text,
  similarity_threshold real DEFAULT 0.75,
  exclude_thesis_id uuid DEFAULT NULL
)
RETURNS TABLE (
  thesis_id uuid,
  title text,
  title_normalized text,
  user_id uuid,
  similarity_score real
)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.id AS thesis_id,
    t.title,
    t.title_normalized,
    t.user_id,
    similarity(t.title_normalized, target_title)::real AS similarity_score
  FROM public.theses t
  WHERE t.id IS DISTINCT FROM exclude_thesis_id
    AND similarity(t.title_normalized, target_title) >= similarity_threshold
  ORDER BY similarity_score DESC;
$$;

CREATE OR REPLACE FUNCTION public.refresh_authors_search()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('alexandria.skip_authors_sync', true) = 'on' THEN
    RETURN NULL;
  END IF;

  UPDATE public.theses
  SET authors_search = COALESCE(
    (SELECT string_agg(name, ', ' ORDER BY position)
       FROM public.thesis_authors
      WHERE thesis_id = COALESCE(NEW.thesis_id, OLD.thesis_id)),
    ''
  )
  WHERE id = COALESCE(NEW.thesis_id, OLD.thesis_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_thesis_authors_sync
AFTER INSERT OR UPDATE OR DELETE ON public.thesis_authors
FOR EACH ROW EXECUTE FUNCTION public.refresh_authors_search();

-- Atomic registration: thesis row + ordered author rows, with each author name
-- resolved against a user account where one exists (that match is what grants a
-- co-author full-text access to the manuscript).
CREATE OR REPLACE FUNCTION public.register_thesis_with_authors(
  p_user_id uuid,
  p_adviser_id uuid,
  p_title text,
  p_title_normalized text,
  p_abstract text,
  p_abstract_confidence abstract_confidence,
  p_keywords text[],
  p_thesis_level thesis_level,
  p_thesis_category text,
  p_submission_type submission_type,
  p_sha256_hash text,
  p_tx_hash text,
  p_block_timestamp timestamptz,
  p_pdf_path text,
  p_pdf_size_bytes bigint,
  p_pdf_page_count int,
  p_previous_thesis_id uuid,
  p_author_names text[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_thesis_id uuid;
  v_author_count int;
  v_trimmed text[];
  v_status thesis_status;
BEGIN
  v_author_count := COALESCE(array_length(p_author_names, 1), 0);
  IF v_author_count < 1 OR v_author_count > 6 THEN
    RAISE EXCEPTION 'A thesis must list between 1 and 6 authors.';
  END IF;

  SELECT array_agg(btrim(n) ORDER BY i)
    INTO v_trimmed
    FROM unnest(p_author_names) WITH ORDINALITY AS t(n, i);

  IF EXISTS (SELECT 1 FROM unnest(v_trimmed) AS n WHERE length(n) = 0) THEN
    RAISE EXCEPTION 'Author names cannot be blank.';
  END IF;

  -- Drafts bypass review; finals enter the adviser queue.
  v_status := CASE p_submission_type
    WHEN 'draft' THEN 'draft'::thesis_status
    ELSE 'pending_adviser'::thesis_status
  END;

  IF p_submission_type = 'final' AND p_adviser_id IS NULL THEN
    RAISE EXCEPTION 'A final submission must name a research adviser.';
  END IF;

  INSERT INTO public.theses (
    user_id, adviser_id, title, title_normalized,
    abstract, abstract_confidence, abstract_extracted_at, keywords,
    thesis_level, thesis_category, submission_type,
    sha256_hash, tx_hash, block_timestamp,
    pdf_path, pdf_size_bytes, pdf_page_count,
    previous_thesis_id, status
  ) VALUES (
    p_user_id,
    CASE WHEN p_submission_type = 'draft' THEN NULL ELSE p_adviser_id END,
    p_title, p_title_normalized,
    p_abstract, p_abstract_confidence, now(), COALESCE(p_keywords, '{}'),
    p_thesis_level, p_thesis_category, p_submission_type,
    p_sha256_hash, p_tx_hash, p_block_timestamp,
    p_pdf_path, p_pdf_size_bytes, p_pdf_page_count,
    p_previous_thesis_id, v_status
  ) RETURNING id INTO v_thesis_id;

  PERFORM set_config('alexandria.skip_authors_sync', 'on', true);

  INSERT INTO public.thesis_authors (thesis_id, name, position, user_id)
  SELECT
    v_thesis_id,
    t.n,
    t.i,
    (SELECT u.id
       FROM public.users u
      WHERE u.full_name_normalized = public.normalize_name(t.n)
        AND u.is_active
      ORDER BY u.created_at
      LIMIT 1)
  FROM unnest(v_trimmed) WITH ORDINALITY AS t(n, i);

  PERFORM set_config('alexandria.skip_authors_sync', 'off', true);

  UPDATE public.theses
  SET authors_search = array_to_string(v_trimmed, ', ')
  WHERE id = v_thesis_id;

  RETURN v_thesis_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_thesis_with_authors(
  uuid, uuid, text, text, text, abstract_confidence, text[], thesis_level, text,
  submission_type, text, text, timestamptz, text, bigint, int, uuid, text[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_thesis_with_authors(
  uuid, uuid, text, text, text, abstract_confidence, text[], thesis_level, text,
  submission_type, text, text, timestamptz, text, bigint, int, uuid, text[]
) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text,
  p_limit int,
  p_window_ms int
)
RETURNS TABLE(success boolean, remaining int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_reset_at timestamptz;
  v_count int;
  v_window interval := (p_window_ms::text || ' milliseconds')::interval;
BEGIN
  LOOP
    SELECT count, reset_at
      INTO v_count, v_reset_at
      FROM public.rate_limits
     WHERE key = p_key
     FOR UPDATE;

    IF FOUND THEN
      IF v_now >= v_reset_at THEN
        UPDATE public.rate_limits
           SET count = 1, reset_at = v_now + v_window
         WHERE key = p_key;
        RETURN QUERY SELECT true, greatest(p_limit - 1, 0);
        RETURN;
      END IF;

      IF v_count >= p_limit THEN
        RETURN QUERY SELECT false, 0;
        RETURN;
      END IF;

      UPDATE public.rate_limits
         SET count = count + 1
       WHERE key = p_key;
      RETURN QUERY SELECT true, greatest(p_limit - v_count - 1, 0);
      RETURN;
    END IF;

    BEGIN
      INSERT INTO public.rate_limits (key, count, reset_at)
      VALUES (p_key, 1, v_now + v_window);
      RETURN QUERY SELECT true, greatest(p_limit - 1, 0);
      RETURN;
    EXCEPTION WHEN unique_violation THEN
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, int, int) TO service_role;

-- ============================================================
-- Librarian Seed Template
-- ============================================================
-- 1. Create the librarian account in Supabase Auth.
-- 2. Replace the UUID below with the Auth user id and run this insert.
--    The librarian role is never self-assignable through the app.
--
-- INSERT INTO public.users (id, email, full_name, approval_status, role, requested_role)
-- VALUES (
--   '<supabase-auth-user-uuid>',
--   'librarian@uspf.edu.ph',
--   'Librarian Name',
--   'approved',
--   'librarian',
--   'student'
-- );
