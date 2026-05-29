-- ============================================================
-- 025_fix_force_delete_all_auth_tables.sql
-- Update admin_force_delete_auth_by_email to also clean up
-- newer auth tables added in recent Supabase versions.
-- Without these deletes, FK constraints block auth.users
-- deletion and inviteUserByEmail fails with 400.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_force_delete_auth_by_email(p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
  IF v_id IS NOT NULL THEN
    BEGIN DELETE FROM auth.one_time_tokens  WHERE user_id = v_id;    EXCEPTION WHEN others THEN NULL; END;
    BEGIN DELETE FROM auth.mfa_challenges   WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id = v_id); EXCEPTION WHEN others THEN NULL; END;
    BEGIN DELETE FROM auth.mfa_factors      WHERE user_id = v_id;    EXCEPTION WHEN others THEN NULL; END;
    BEGIN DELETE FROM auth.flow_state       WHERE user_id = v_id;    EXCEPTION WHEN others THEN NULL; END;
    DELETE FROM auth.identities      WHERE user_id = v_id;
    DELETE FROM auth.sessions        WHERE user_id = v_id;
    DELETE FROM auth.refresh_tokens  WHERE user_id = v_id;
    DELETE FROM auth.users           WHERE id      = v_id;
  END IF;
END; $$;