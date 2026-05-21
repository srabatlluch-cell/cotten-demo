-- ============================================================
-- 005_fix_today_appointments.sql
-- Remove cancelled/no_show filter so Panel shows all today's
-- appointments (cancelled ones are shown with visual indicators)
-- Run this in the Supabase SQL Editor
-- ============================================================

DROP FUNCTION IF EXISTS get_today_appointments();

CREATE FUNCTION get_today_appointments()
RETURNS TABLE (
  id               UUID,
  appointment_time TIME,
  treatment        TEXT,
  patient_name     TEXT,
  doctor_name      TEXT,
  room             TEXT,
  appt_status      TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.time AS appointment_time, a.treatment,
         pat_pr.full_name, doc_pr.full_name,
         a.room, a.status
  FROM appointments a
  JOIN patients pat        ON pat.id     = a.patient_id
  JOIN profiles pat_pr     ON pat_pr.id  = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = a.doctor_id
  WHERE a.date = CURRENT_DATE
    AND is_staff()
  ORDER BY a.time ASC;
$$;