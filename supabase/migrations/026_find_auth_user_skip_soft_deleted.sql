-- ============================================================
-- 026_find_auth_user_skip_soft_deleted.sql
-- Update admin_find_auth_user_by_email to ignore soft-deleted
-- users (deleted_at IS NOT NULL). When Supabase's admin.deleteUser
-- soft-deletes a user, they still exist in auth.users with
-- deleted_at set. The old query found them and caused the invite
-- flow to think it needed to clean up a non-deletable user.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_find_auth_user_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users
  WHERE email = lower(p_email)
  AND deleted_at IS NULL
  LIMIT 1;
$$;