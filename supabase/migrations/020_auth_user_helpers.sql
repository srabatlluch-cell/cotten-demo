-- ============================================================
-- 020_auth_user_helpers.sql
-- Direct auth.users helpers for invite-staff and delete-user
-- ============================================================

-- ─── admin_find_auth_user_by_email ────────────────────────────────
-- Queries auth.users directly (bypasses GoTrue API soft-delete quirks).
-- Returns the UUID if found, NULL otherwise.
-- SECURITY DEFINER runs as postgres which has access to auth schema.
DROP FUNCTION IF EXISTS admin_find_auth_user_by_email(TEXT);

CREATE FUNCTION admin_find_auth_user_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
$$;

-- ─── admin_force_delete_auth_by_email ─────────────────────────────
-- Hard-deletes an auth user and all dependent auth rows by email.
-- Used when GoTrue's deleteUser returns "not found" but the record
-- still exists (can happen when users were created via direct SQL insert).
DROP FUNCTION IF EXISTS admin_force_delete_auth_by_email(TEXT);

CREATE FUNCTION admin_force_delete_auth_by_email(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
  IF v_id IS NOT NULL THEN
    DELETE FROM auth.identities  WHERE user_id = v_id;
    DELETE FROM auth.sessions    WHERE user_id = v_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = v_id;
    DELETE FROM auth.users       WHERE id = v_id;
  END IF;
END;
$$;