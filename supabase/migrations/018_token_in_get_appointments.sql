-- ============================================================
-- 018_token_in_get_appointments.sql
-- Expose confirmation_token in get_all_appointments and
-- get_today_appointments so staff can build action links.
-- ============================================================

-- ─── get_all_appointments ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_all_appointments();

CREATE FUNCTION get_all_appointments()
RETURNS TABLE (
  id                  UUID,
  date                DATE,
  appointment_time    TIME,
  treatment           TEXT,
  room                TEXT,
  appt_status         TEXT,
  patient_name        TEXT,
  patient_id          UUID,
  doctor_name         TEXT,
  doctor_id           UUID,
  notes               TEXT,
  confirmation_token  UUID
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.date,
    a.time             AS appointment_time,
    a.treatment,
    a.room,
    a.status           AS appt_status,
    pat_pr.full_name   AS patient_name,
    a.patient_id,
    doc_pr.full_name   AS doctor_name,
    a.doctor_id,
    a.notes,
    a.confirmation_token
  FROM appointments a
  JOIN patients  pat    ON pat.id    = a.patient_id
  JOIN profiles  pat_pr ON pat_pr.id = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = a.doctor_id
  WHERE EXISTS (
    SELECT 1 FROM profiles caller
    WHERE caller.id = auth.uid()
      AND caller.role IN ('doctor','staff','admin','receptionist')
  )
  ORDER BY a.date DESC, a.time DESC;
$$;

-- ─── get_today_appointments ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_today_appointments();

CREATE FUNCTION get_today_appointments()
RETURNS TABLE (
  id                  UUID,
  appointment_time    TIME,
  treatment           TEXT,
  patient_name        TEXT,
  patient_id          UUID,
  patient_email       TEXT,
  doctor_name         TEXT,
  room                TEXT,
  appt_status         TEXT,
  notes               TEXT,
  confirmation_token  UUID
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.time             AS appointment_time,
    a.treatment,
    pat_pr.full_name   AS patient_name,
    a.patient_id,
    pat_pr.email       AS patient_email,
    doc_pr.full_name   AS doctor_name,
    a.room,
    a.status           AS appt_status,
    a.notes,
    a.confirmation_token
  FROM appointments a
  JOIN patients pat         ON pat.id    = a.patient_id
  JOIN profiles pat_pr      ON pat_pr.id = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = a.doctor_id
  WHERE a.date = CURRENT_DATE
    AND is_staff()
  ORDER BY a.time ASC;
$$;