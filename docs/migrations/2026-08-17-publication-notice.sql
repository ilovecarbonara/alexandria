-- Publication consent notice — incremental migration
--
-- DATABASE_MIGRATION.sql is a fresh-install script; run this instead against a
-- database that already holds data (the demo deployment). Safe to re-run.
--
-- Adds the flag behind the consent modal shown before a final submission.
-- NULL = the researcher has not opted out, so the notice still appears.
-- A timestamp = they affirmed the notice and ticked "Don't show again".
--
-- No RLS policy accompanies this column. `public.users` has no self-update
-- policy, and adding one would let an account edit its own `role`; the value is
-- written by /api/account/publication-notice through the service client, which
-- scopes the write to the caller's own row.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS publication_notice_ack_at timestamptz;
