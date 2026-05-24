-- ============================================================
-- 013_archive_patient.sql
-- Soft-archive for patients (no delete — legal/medical retention).
-- Run in Supabase SQL Editor.
-- ============================================================

-- ─── 1. Add archive columns ──────────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS archived     BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by  UUID REFERENCES profiles(id);

-- ─── 2. archive_patient ──────────────────────────────────────
DROP FUNCTION IF EXISTS archive_patient(UUID);

CREATE FUNCTION archive_patient(p_patient_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: staff role required';
  END IF;

  UPDATE patients SET
    archived    = TRUE,
    archived_at = NOW(),
    archived_by = auth.uid()
  WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;
END;
$$;

-- ─── 3. unarchive_patient ─────────────────────────────────────
DROP FUNCTION IF EXISTS unarchive_patient(UUID);

CREATE FUNCTION unarchive_patient(p_patient_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: staff role required';
  END IF;

  UPDATE patients SET
    archived    = FALSE,
    archived_at = NULL,
    archived_by = NULL
  WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;
END;
$$;

-- ─── 4. get_all_patients — exclude archived by default ────────
CREATE OR REPLACE FUNCTION get_all_patients()
RETURNS TABLE (
  patient_id          UUID,
  profile_id          UUID,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  dni                 TEXT,
  birth_date          DATE,
  treatment           TEXT,
  patient_status      TEXT,
  notes               TEXT,
  doctor_name         TEXT,
  next_appointment    DATE,
  pending_amount      NUMERIC,
  doc_count           BIGINT,
  created_at          TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pat.id,
    pat.profile_id,
    pr.full_name,
    pr.email,
    pr.phone,
    pr.dni,
    pr.birth_date,
    pat.treatment,
    pat.status,
    pat.notes,
    doc_pr.full_name,
    (SELECT a.date FROM appointments a
     WHERE a.patient_id = pat.id AND a.date >= CURRENT_DATE
     ORDER BY a.date, a.time LIMIT 1),
    COALESCE((SELECT SUM(p.amount) FROM payments p
              WHERE p.patient_id = pat.id AND p.status = 'pending'), 0),
    COALESCE((SELECT COUNT(*) FROM documents d WHERE d.patient_id = pat.id), 0),
    pat.created_at
  FROM patients pat
  JOIN profiles pr ON pr.id = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = pat.doctor_id
  WHERE pat.archived = FALSE
    AND EXISTS (
      SELECT 1 FROM profiles caller
      WHERE caller.id = auth.uid()
        AND caller.role IN ('doctor', 'staff', 'admin', 'receptionist')
    )
  ORDER BY pat.created_at DESC;
$$;

-- ─── 5. get_archived_patients ─────────────────────────────────
DROP FUNCTION IF EXISTS get_archived_patients();

CREATE FUNCTION get_archived_patients()
RETURNS TABLE (
  patient_id     UUID,
  profile_id     UUID,
  full_name      TEXT,
  email          TEXT,
  treatment      TEXT,
  patient_status TEXT,
  archived_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pat.id,
    pat.profile_id,
    pr.full_name,
    pr.email,
    pat.treatment,
    pat.status,
    pat.archived_at,
    pat.created_at
  FROM patients pat
  JOIN profiles pr ON pr.id = pat.profile_id
  WHERE pat.archived = TRUE
    AND EXISTS (
      SELECT 1 FROM profiles caller
      WHERE caller.id = auth.uid()
        AND caller.role IN ('doctor', 'staff', 'admin', 'receptionist')
    )
  ORDER BY pat.archived_at DESC;
$$;

-- ─── Reload schema cache ──────────────────────────────────────
NOTIFY pgrst, 'reload schema';