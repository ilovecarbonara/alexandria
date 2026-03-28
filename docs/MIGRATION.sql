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
CREATE TYPE dispute_status AS ENUM ('open', 'resolved');
CREATE TYPE alert_status AS ENUM ('sent', 'failed');

-- ============================================================
-- Tables
-- ============================================================

-- users
CREATE TABLE public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  full_name      text NOT NULL,
  is_approved    boolean NOT NULL DEFAULT false,
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
  author_name      text NOT NULL,
  thesis_level     thesis_level NOT NULL,
  thesis_category  text NOT NULL,
  submission_type  submission_type NOT NULL,
  sha256_hash      text NOT NULL UNIQUE,
  tx_hash          text NOT NULL,
  block_timestamp  timestamptz NOT NULL,
  status           thesis_status NOT NULL DEFAULT 'pending',
  registered_at    timestamptz NOT NULL DEFAULT now()
);

-- disputes
CREATE TABLE public.disputes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id  uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason     text NOT NULL,
  status     dispute_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
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
  status            alert_status NOT NULL DEFAULT 'sent',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_theses_user_id ON public.theses(user_id);
CREATE INDEX idx_theses_sha256_hash ON public.theses(sha256_hash);
CREATE INDEX idx_theses_title_trgm ON public.theses USING gin (title_normalized gin_trgm_ops);
CREATE INDEX idx_disputes_thesis_id ON public.disputes(thesis_id);
CREATE INDEX idx_theses_status ON public.theses(status);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_title_alerts_notified_user ON public.title_alerts(notified_user_id);

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
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_alerts ENABLE ROW LEVEL SECURITY;

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

-- users: insert own row on registration
CREATE POLICY "Users can insert own row"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

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

-- disputes: authenticated users can read all disputes
CREATE POLICY "Authenticated users can read disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (true);

-- disputes: admin can update status
CREATE POLICY "Admin can update disputes"
  ON public.disputes FOR UPDATE
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
