-- ============================================================
-- 022_add_receptionist_role.sql
-- Add 'receptionist' to the profiles.role CHECK constraint
-- ============================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('patient', 'doctor', 'staff', 'admin', 'receptionist'));