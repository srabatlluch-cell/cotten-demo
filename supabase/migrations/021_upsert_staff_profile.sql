-- ============================================================
-- 021_upsert_staff_profile.sql
-- SECURITY DEFINER wrapper so the edge function can upsert
-- profiles without needing direct service_role table grants.
-- ============================================================

-- Also ensure service_role can read/write all public tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

DROP FUNCTION IF EXISTS admin_upsert_staff_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION admin_upsert_staff_profile(
  p_id        UUID,
  p_full_name TEXT,
  p_email     TEXT,
  p_role      TEXT,
  p_phone     TEXT DEFAULT NULL,
  p_specialty TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role, phone, specialty)
  VALUES (p_id, p_full_name, lower(p_email), p_role, p_phone, p_specialty)
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    email      = EXCLUDED.email,
    role       = EXCLUDED.role,
    phone      = EXCLUDED.phone,
    specialty  = EXCLUDED.specialty;
END;
$$;