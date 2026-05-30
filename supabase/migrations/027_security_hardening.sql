-- ============================================================
-- 027_security_hardening.sql
-- Fixes:
--   1. Re-enable RLS on documents (was showing UNRESTRICTED)
--   2. Drop + recreate documents policies to ensure they are applied
--   3. Harden profiles INSERT — prevent self-registration as admin/staff
--   4. Harden profiles UPDATE — prevent role escalation via direct API
--   5. Ensure RLS is enabled on every public table
-- ============================================================

-- ── 1 & 2. Documents ─────────────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select"       ON documents;
DROP POLICY IF EXISTS "documents_insert_staff" ON documents;
DROP POLICY IF EXISTS "documents_update_staff" ON documents;
DROP POLICY IF EXISTS "documents_delete_admin" ON documents;

CREATE POLICY "documents_select"
  ON documents FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
    OR is_staff()
  );

CREATE POLICY "documents_insert_staff"
  ON documents FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "documents_update_staff"
  ON documents FOR UPDATE
  USING (is_staff());

CREATE POLICY "documents_delete_admin"
  ON documents FOR DELETE
  USING (is_admin());

-- ── 3. Profiles INSERT — only patients can self-register; staff created via functions ──
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND role = 'patient'   -- prevents self-assigning admin/doctor/staff
  );

-- ── 4. Profiles UPDATE — prevent role escalation via direct API ──────────────
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_staff())
  WITH CHECK (
    -- Staff (admin/doctor/receptionist) can set any role via their session
    is_staff()
    OR
    -- Regular users may only update their own row AND cannot change their role
    (
      id = auth.uid()
      AND role = (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

-- ── 5. Ensure all tables have RLS enabled ────────────────────────────────────
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;