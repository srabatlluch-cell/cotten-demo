-- ============================================================
-- 024_fix_auth_identity.sql
-- Repairs auth.identities records created via direct SQL INSERT
-- (admin_create_patient) so GoTrue can generate links for them.
-- Direct SQL inserts create identities missing required fields
-- (email_verified, phone_verified, provider_id) that GoTrue
-- requires for generateLink / magic links / recovery flows.
-- ============================================================

DROP FUNCTION IF EXISTS admin_fix_auth_identity(UUID, TEXT);

CREATE FUNCTION admin_fix_auth_identity(p_user_id UUID, p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove any bad email identity for this user
  DELETE FROM auth.identities
  WHERE user_id = p_user_id AND provider = 'email';

  -- Insert a proper GoTrue-compatible email identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    jsonb_build_object(
      'sub',             p_user_id::text,
      'email',           lower(p_email),
      'email_verified',  true,
      'phone_verified',  false
    ),
    'email',
    lower(p_email),
    now(), now(), now()
  );

  -- Confirm the email in auth.users so recovery links work
  UPDATE auth.users
  SET    email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE  id = p_user_id;
END;
$$;