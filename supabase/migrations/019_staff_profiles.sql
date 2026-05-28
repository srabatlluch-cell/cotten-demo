-- ============================================================
-- 019_staff_profiles.sql
-- 1. Add phone + specialty columns to profiles
-- 2. get_staff_members()        — list all staff/doctors
-- 3. admin_update_staff_member() — edit phone & specialty
-- ============================================================

-- ─── 1. Columns ───────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty TEXT;

-- ─── 2. get_staff_members ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_staff_members();

CREATE FUNCTION get_staff_members()
RETURNS TABLE (
  id        UUID,
  full_name TEXT,
  email     TEXT,
  role      TEXT,
  phone     TEXT,
  specialty TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, email, role, phone, specialty
  FROM profiles
  WHERE role IN ('doctor', 'staff', 'admin', 'receptionist')
  ORDER BY
    CASE role
      WHEN 'doctor'       THEN 1
      WHEN 'admin'        THEN 2
      WHEN 'receptionist' THEN 3
      WHEN 'staff'        THEN 4
      ELSE 5
    END,
    full_name;
$$;

-- ─── 3. admin_update_staff_member ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS admin_update_staff_member(UUID, TEXT, TEXT);

CREATE FUNCTION admin_update_staff_member(
  p_id        UUID,
  p_phone     TEXT DEFAULT NULL,
  p_specialty TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE profiles
  SET phone     = p_phone,
      specialty = p_specialty
  WHERE id = p_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;
END;
$$;