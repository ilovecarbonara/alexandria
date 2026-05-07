-- Alexandria Database Migration
-- Run this in the Supabase SQL Editor

-- ============================================================
-- Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- Enum Types
-- ============================================================

CREATE TYPE thesis_level AS ENUM ('undergraduate', 'masteral', 'doctoral');
CREATE TYPE submission_type AS ENUM ('draft', 'final');
CREATE TYPE thesis_status AS ENUM ('pending', 'accepted', 'flagged', 'rejected');
CREATE TYPE user_approval_status AS ENUM ('pending', 'approved', 'rejected', 'revoked');
CREATE TYPE dispute_status AS ENUM ('open', 'resolved');
CREATE TYPE dispute_author_role AS ENUM ('flagger', 'admin', 'owner');
CREATE TYPE alert_status AS ENUM ('sent', 'failed', 'notified');

-- ============================================================
-- Tables
-- ============================================================

-- users
CREATE TABLE public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  full_name      text NOT NULL,
  approval_status user_approval_status NOT NULL DEFAULT 'pending',
  is_admin       boolean NOT NULL DEFAULT false,
  is_active      boolean NOT NULL DEFAULT true,
  last_active_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- theses
CREATE TABLE public.theses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title            text NOT NULL,
  title_normalized text NOT NULL,
  authors_search   text NOT NULL DEFAULT '',
  thesis_level     thesis_level NOT NULL,
  thesis_category  text NOT NULL,
  submission_type  submission_type NOT NULL,
  sha256_hash      text NOT NULL UNIQUE,
  tx_hash          text NOT NULL,
  block_timestamp  timestamptz NOT NULL,
  previous_thesis_id uuid REFERENCES public.theses(id) ON DELETE SET NULL,
  status           thesis_status NOT NULL DEFAULT 'pending',
  registered_at    timestamptz NOT NULL DEFAULT now()
);

-- disputes (threaded)
-- Each dispute is a 3-party thread between flagger, admin, and thesis owner.
-- The opening reason and any resolution note are stored as messages in
-- dispute_messages, not as columns on this table.
CREATE TABLE public.disputes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id    uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  flagged_by   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       dispute_status NOT NULL DEFAULT 'open',
  resolved_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- dispute_messages: thread bodies (opening reason, replies, closing note)
CREATE TABLE public.dispute_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_role dispute_author_role NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- dispute_reads: per-user last-read timestamp for unread badges
CREATE TABLE public.dispute_reads (
  dispute_id   uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dispute_id, user_id)
);

-- activity_logs
CREATE TABLE public.activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- title_alerts
CREATE TABLE public.title_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  new_thesis_id     uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  matched_thesis_id uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  notified_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  similarity_score  real NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  status            alert_status NOT NULL DEFAULT 'notified',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- thesis_authors: ordered author list per thesis (1–6 authors)
CREATE TABLE public.thesis_authors (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  name      text NOT NULL CHECK (length(btrim(name)) > 0),
  position  int  NOT NULL CHECK (position BETWEEN 1 AND 6),
  UNIQUE (thesis_id, position)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_theses_user_id ON public.theses(user_id);
CREATE INDEX idx_theses_sha256_hash ON public.theses(sha256_hash);
CREATE INDEX idx_theses_previous_thesis_id ON public.theses(previous_thesis_id);
CREATE INDEX idx_theses_title_trgm ON public.theses USING gin (title_normalized gin_trgm_ops);
CREATE INDEX idx_disputes_thesis_id ON public.disputes(thesis_id);
CREATE INDEX idx_disputes_flagged_by ON public.disputes(flagged_by);
CREATE INDEX idx_theses_status ON public.theses(status);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_dispute_messages_dispute_id ON public.dispute_messages(dispute_id, created_at);
CREATE INDEX idx_dispute_messages_author_id ON public.dispute_messages(author_id);
CREATE INDEX idx_dispute_reads_user_id ON public.dispute_reads(user_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_title_alerts_notified_user ON public.title_alerts(notified_user_id);
CREATE INDEX idx_thesis_authors_thesis_id ON public.thesis_authors(thesis_id);
CREATE INDEX idx_theses_authors_search ON public.theses USING gin (authors_search gin_trgm_ops);
CREATE INDEX idx_users_approval_status ON public.users(approval_status);

-- ============================================================
-- Private Schema + Admin Helper
-- ============================================================
-- The private schema is NOT exposed via PostgREST, so these
-- functions are inaccessible from the client API.

CREATE SCHEMA IF NOT EXISTS private;

-- SECURITY DEFINER runs as the creating role (postgres), bypassing
-- RLS. This avoids infinite recursion when admin-check policies
-- need to read the users table.
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
      AND is_admin = true
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_authors ENABLE ROW LEVEL SECURITY;

-- users: read own row
CREATE POLICY "Users can read own row"
  ON public.users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- users: admin reads all
CREATE POLICY "Admin can read all users"
  ON public.users FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin()));

-- users: admin can update any user (approve, etc.)
CREATE POLICY "Admin can update users"
  ON public.users FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()));

-- users: profile rows are inserted server-side during registration.
DROP POLICY IF EXISTS "Users can insert own row" ON public.users;

-- theses: anyone can read (public verification)
CREATE POLICY "Theses are publicly readable"
  ON public.theses FOR SELECT
  TO authenticated, anon
  USING (true);

-- theses: authenticated users insert own
CREATE POLICY "Authenticated users can insert own theses"
  ON public.theses FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- theses: admin can update status
CREATE POLICY "Admin can update theses"
  ON public.theses FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()));

-- disputes: authenticated users can create
CREATE POLICY "Authenticated users can create disputes"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = flagged_by);

-- disputes: only participants (flagger, thesis owner) and admins can read
CREATE POLICY "Participants can read disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin())
    OR flagged_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.theses t
      WHERE t.id = disputes.thesis_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

-- disputes: admin can update status
CREATE POLICY "Admin can update disputes"
  ON public.disputes FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()));

-- ----------------------------------------------------------------
-- dispute_messages: read/write only by participants of the parent
-- dispute. Inserts additionally require the dispute to be open and
-- the author_id to match the caller. The application also enforces
-- author_role consistency.
-- ----------------------------------------------------------------

CREATE POLICY "Participants can read dispute messages"
  ON public.dispute_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      LEFT JOIN public.theses t ON t.id = d.thesis_id
      WHERE d.id = dispute_messages.dispute_id
        AND (
          (SELECT private.is_admin())
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
          (SELECT private.is_admin())
          OR d.flagged_by = (SELECT auth.uid())
          OR t.user_id = (SELECT auth.uid())
        )
    )
  );

-- ----------------------------------------------------------------
-- dispute_reads: each user manages only their own read marker.
-- ----------------------------------------------------------------

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

-- activity_logs: admin can read all
CREATE POLICY "Admin can read all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin()));

-- activity_logs: user can read own logs
CREATE POLICY "Users can read own activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- activity_logs: authenticated users can insert own logs
CREATE POLICY "Authenticated users can insert own activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- title_alerts: user can read own alerts
CREATE POLICY "Users can read own alerts"
  ON public.title_alerts FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = notified_user_id);

-- title_alerts: admin can read all alerts
CREATE POLICY "Admin can read all alerts"
  ON public.title_alerts FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin()));

-- title_alerts: service role inserts (via API route with service key)
-- No INSERT policy needed for anon/authenticated — inserts happen server-side
-- via the service_role key which bypasses RLS.

-- thesis_authors: publicly readable (mirrors theses public read access)
CREATE POLICY "Thesis authors are publicly readable"
  ON public.thesis_authors FOR SELECT
  TO authenticated, anon
  USING (true);
-- thesis_authors: inserts happen via the service-role RPC; no INSERT/UPDATE policy.

-- ============================================================
-- Functions
-- ============================================================

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

-- Keeps theses.authors_search in sync with thesis_authors. Skipped when the
-- transaction-local GUC alexandria.skip_authors_sync is 'on' so bulk inserts
-- in register_thesis_with_authors can recompute exactly once at the end.
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

-- Atomic registration: thesis row + 1–6 author rows in one transaction.
-- Sets a transaction-local GUC so the per-row trigger short-circuits during
-- the bulk insert, then recomputes authors_search exactly once.
CREATE OR REPLACE FUNCTION public.register_thesis_with_authors(
  p_user_id uuid,
  p_title text,
  p_title_normalized text,
  p_thesis_level thesis_level,
  p_thesis_category text,
  p_submission_type submission_type,
  p_sha256_hash text,
  p_tx_hash text,
  p_block_timestamp timestamptz,
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

  INSERT INTO public.theses (
    user_id, title, title_normalized, thesis_level, thesis_category,
    submission_type, sha256_hash, tx_hash, block_timestamp, previous_thesis_id
  ) VALUES (
    p_user_id, p_title, p_title_normalized, p_thesis_level, p_thesis_category,
    p_submission_type, p_sha256_hash, p_tx_hash, p_block_timestamp, p_previous_thesis_id
  ) RETURNING id INTO v_thesis_id;

  -- Skip the per-row trigger; we'll do one final recompute below.
  PERFORM set_config('alexandria.skip_authors_sync', 'on', true);

  INSERT INTO public.thesis_authors (thesis_id, name, position)
  SELECT v_thesis_id, n, i
    FROM unnest(v_trimmed) WITH ORDINALITY AS t(n, i);

  PERFORM set_config('alexandria.skip_authors_sync', 'off', true);

  UPDATE public.theses
  SET authors_search = array_to_string(v_trimmed, ', ')
  WHERE id = v_thesis_id;

  RETURN v_thesis_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_thesis_with_authors(
  uuid, text, text, thesis_level, text, submission_type, text, text, timestamptz, uuid, text[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_thesis_with_authors(
  uuid, text, text, thesis_level, text, submission_type, text, text, timestamptz, uuid, text[]
) TO service_role;

-- ============================================================
-- Migration: Add thesis_id to activity_logs
-- ============================================================

ALTER TABLE public.activity_logs
  ADD COLUMN thesis_id uuid REFERENCES public.theses(id) ON DELETE SET NULL;

CREATE INDEX idx_activity_logs_thesis_id ON public.activity_logs(thesis_id);

-- ============================================================
-- Migration: Threaded disputes (idempotent)
-- ------------------------------------------------------------
-- Converts disputes from single-reason/single-resolution columns
-- into an email-style thread (flagger / admin / owner).
-- DEV-ONLY: existing dispute rows are wiped; no backfill.
-- Safe to run on databases that already have the new schema —
-- everything is guarded with IF [NOT] EXISTS.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_author_role') THEN
    CREATE TYPE dispute_author_role AS ENUM ('flagger', 'admin', 'owner');
  END IF;
END$$;

-- Wipe existing rows before dropping the columns (cascades to any
-- new dispute_messages / dispute_reads rows if this is re-run).
DELETE FROM public.disputes;

ALTER TABLE public.disputes DROP COLUMN IF EXISTS reason;
ALTER TABLE public.disputes DROP COLUMN IF EXISTS resolution_notes;

CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_role dispute_author_role NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dispute_reads (
  dispute_id   uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dispute_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_disputes_flagged_by
  ON public.disputes(flagged_by);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id
  ON public.dispute_messages(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_author_id
  ON public.dispute_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_dispute_reads_user_id
  ON public.dispute_reads(user_id);

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_reads    ENABLE ROW LEVEL SECURITY;

-- Tighten disputes SELECT to participants + admin
DROP POLICY IF EXISTS "Authenticated users can read disputes" ON public.disputes;
DROP POLICY IF EXISTS "Participants can read disputes"        ON public.disputes;
CREATE POLICY "Participants can read disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin())
    OR flagged_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.theses t
      WHERE t.id = disputes.thesis_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can read dispute messages" ON public.dispute_messages;
CREATE POLICY "Participants can read dispute messages"
  ON public.dispute_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      LEFT JOIN public.theses t ON t.id = d.thesis_id
      WHERE d.id = dispute_messages.dispute_id
        AND (
          (SELECT private.is_admin())
          OR d.flagged_by = (SELECT auth.uid())
          OR t.user_id = (SELECT auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Participants can post dispute messages" ON public.dispute_messages;
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
          (SELECT private.is_admin())
          OR d.flagged_by = (SELECT auth.uid())
          OR t.user_id = (SELECT auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Users can read own dispute reads"   ON public.dispute_reads;
DROP POLICY IF EXISTS "Users can upsert own dispute reads" ON public.dispute_reads;
DROP POLICY IF EXISTS "Users can update own dispute reads" ON public.dispute_reads;
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

-- ============================================================
-- Migration: Multi-author support (April 2026, idempotent)
-- ------------------------------------------------------------
-- On a fresh DB the schema above already declares thesis_authors,
-- authors_search, the trigger, and the RPC, so every statement
-- below is a no-op. On an older DB still using theses.author_name,
-- this block performs the upgrade and backfills authors_search.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.thesis_authors (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  name      text NOT NULL CHECK (length(btrim(name)) > 0),
  position  int  NOT NULL CHECK (position BETWEEN 1 AND 6),
  UNIQUE (thesis_id, position)
);

CREATE INDEX IF NOT EXISTS idx_thesis_authors_thesis_id
  ON public.thesis_authors(thesis_id);

ALTER TABLE public.theses
  ADD COLUMN IF NOT EXISTS authors_search text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_theses_authors_search
  ON public.theses USING gin (authors_search gin_trgm_ops);

ALTER TABLE public.thesis_authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Thesis authors are publicly readable" ON public.thesis_authors;
CREATE POLICY "Thesis authors are publicly readable"
  ON public.thesis_authors FOR SELECT
  TO authenticated, anon
  USING (true);

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

DROP TRIGGER IF EXISTS trg_thesis_authors_sync ON public.thesis_authors;
CREATE TRIGGER trg_thesis_authors_sync
AFTER INSERT OR UPDATE OR DELETE ON public.thesis_authors
FOR EACH ROW EXECUTE FUNCTION public.refresh_authors_search();

CREATE OR REPLACE FUNCTION public.register_thesis_with_authors(
  p_user_id uuid,
  p_title text,
  p_title_normalized text,
  p_thesis_level thesis_level,
  p_thesis_category text,
  p_submission_type submission_type,
  p_sha256_hash text,
  p_tx_hash text,
  p_block_timestamp timestamptz,
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

  INSERT INTO public.theses (
    user_id, title, title_normalized, thesis_level, thesis_category,
    submission_type, sha256_hash, tx_hash, block_timestamp, previous_thesis_id
  ) VALUES (
    p_user_id, p_title, p_title_normalized, p_thesis_level, p_thesis_category,
    p_submission_type, p_sha256_hash, p_tx_hash, p_block_timestamp, p_previous_thesis_id
  ) RETURNING id INTO v_thesis_id;

  PERFORM set_config('alexandria.skip_authors_sync', 'on', true);

  INSERT INTO public.thesis_authors (thesis_id, name, position)
  SELECT v_thesis_id, n, i
    FROM unnest(v_trimmed) WITH ORDINALITY AS t(n, i);

  PERFORM set_config('alexandria.skip_authors_sync', 'off', true);

  UPDATE public.theses
  SET authors_search = array_to_string(v_trimmed, ', ')
  WHERE id = v_thesis_id;

  RETURN v_thesis_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_thesis_with_authors(
  uuid, text, text, thesis_level, text, submission_type, text, text, timestamptz, uuid, text[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_thesis_with_authors(
  uuid, text, text, thesis_level, text, submission_type, text, text, timestamptz, uuid, text[]
) TO service_role;

-- Backfill + drop the legacy single-author column only if it still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'theses'
      AND column_name = 'author_name'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.theses
      WHERE length(btrim(author_name)) = 0
    ) THEN
      RAISE EXCEPTION 'Cannot migrate blank thesis author_name values. Clean these rows before applying multi-author support.';
    END IF;

    -- Backfill only theses that don't already have author rows (re-run safe).
    INSERT INTO public.thesis_authors (thesis_id, name, position)
    SELECT t.id, btrim(t.author_name), 1
      FROM public.theses t
     WHERE NOT EXISTS (
       SELECT 1 FROM public.thesis_authors a WHERE a.thesis_id = t.id
     );

    -- The trigger populated authors_search during the INSERT above.
    ALTER TABLE public.theses DROP COLUMN author_name;
  END IF;
END;
$$;

-- Migration: Rate limiting (idempotent)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key      text PRIMARY KEY,
  count    int NOT NULL CHECK (count >= 0),
  reset_at timestamptz NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text,
  p_limit int,
  p_window_ms int
)
RETURNS TABLE(success boolean, remaining int) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, int, int) TO service_role;
