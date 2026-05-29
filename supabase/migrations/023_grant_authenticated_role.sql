-- ============================================================
-- 023_grant_authenticated_role.sql
-- Grant table-level access to 'authenticated' role.
-- Tables created via SQL migrations don't get automatic grants
-- the way tables created in the Supabase dashboard do.
-- Without these grants, authenticated users get 403 "permission
-- denied for table X" before RLS policies even run.
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure future tables also get these grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;