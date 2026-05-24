-- ============================================================
-- 014_fix_archive_debug.sql
-- Diagnostic + idempotent fix for patient archive feature.
-- Safe to run multiple times.
-- Run in Supabase SQL Editor.
-- ============================================================

-- ─── STEP 0: Diagnostic — run this first to see current state ─
/*
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patients'
  AND column_name IN ('archived', 'archived_at', 'archived_by')
ORDER BY column_name;

SELECT id, archived, archived_at, archived_by
FROM patients
ORDER BY created_at DESC;
*/

-- ─── 1. Ensure archive columns exist ─────────────────────────
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
    RAISE EXCEPTION 'Patient not found: %', p_patient_id;
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
    RAISE EXCEPTION 'Patient not found: %', p_patient_id;
  END IF;
END;
$$;

-- ─── 4. get_all_patients — must exclude archived rows ─────────
-- DROP first to avoid "cannot change return type" errors
DROP FUNCTION IF EXISTS get_all_patients();

CREATE FUNCTION get_all_patients()
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

-- ─── 6. Also fix get_dashboard_stats to exclude archived ──────
-- total_patients stat should not count archived patients
DROP FUNCTION IF EXISTS get_dashboard_stats();

CREATE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_patients            BIGINT,
  appointments_today        BIGINT,
  pending_payments          NUMERIC,
  pending_signatures        BIGINT,
  overdue_payments          BIGINT,
  unconfirmed_appointments  BIGINT,
  old_pending_signatures    BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM patients WHERE archived = FALSE)::BIGINT,

    (SELECT COUNT(*) FROM appointments
     WHERE date = CURRENT_DATE
       AND status NOT IN ('cancelled', 'no_show'))::BIGINT,

    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'pending'), 0)::NUMERIC,

    (SELECT COUNT(*) FROM consent_forms WHERE status = 'pending')::BIGINT,

    (SELECT COUNT(*) FROM payments
     WHERE status = 'pending'
       AND due_date IS NOT NULL
       AND due_date < CURRENT_DATE)::BIGINT,

    (SELECT COUNT(*) FROM appointments
     WHERE date = CURRENT_DATE
       AND status = 'scheduled')::BIGINT,

    (SELECT COUNT(*) FROM consent_forms
     WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '3 days')::BIGINT
  WHERE is_staff();
$$;

-- ─── Verify ───────────────────────────────────────────────────
-- After running, confirm the column and filter are active:
SELECT
  (SELECT COUNT(*) FROM patients) AS total_rows,
  (SELECT COUNT(*) FROM patients WHERE archived = FALSE) AS active,
  (SELECT COUNT(*) FROM patients WHERE archived = TRUE)  AS archived;

-- ─── Reload schema cache ──────────────────────────────────────
NOTIFY pgrst, 'reload schema';