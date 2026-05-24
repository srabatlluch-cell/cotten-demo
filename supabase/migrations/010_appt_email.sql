-- ============================================================
-- 010_appt_email.sql
-- Helper function to get patient email by appointment id.
-- Used server-side and as a fallback when patient data is
-- not already loaded in the frontend.
-- ============================================================

CREATE OR REPLACE FUNCTION get_patient_email_by_appointment(p_appointment_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.email
  FROM appointments a
  JOIN patients pat ON pat.id = a.patient_id
  JOIN profiles  pr  ON pr.id  = pat.profile_id
  WHERE a.id = p_appointment_id
    AND is_staff()
  LIMIT 1;
$$;