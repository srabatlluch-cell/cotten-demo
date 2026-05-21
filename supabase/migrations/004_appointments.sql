-- ============================================================
-- 004_appointments.sql
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── get_my_appointments ─────────────────────────────────────────
-- Patient's own appointment history + upcoming
CREATE OR REPLACE FUNCTION get_my_appointments()
RETURNS TABLE (
  id               UUID,
  date             DATE,
  appointment_time TIME,
  treatment        TEXT,
  room             TEXT,
  appt_status      TEXT,
  doctor_name      TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.date,
    a.time       AS appointment_time,
    a.treatment,
    a.room,
    a.status     AS appt_status,
    pr.full_name AS doctor_name
  FROM appointments a
  LEFT JOIN profiles pr ON pr.id = a.doctor_id
  WHERE a.patient_id = (
    SELECT id FROM patients WHERE profile_id = auth.uid() LIMIT 1
  )
  ORDER BY a.date DESC, a.time DESC;
$$;

-- ─── get_all_appointments ────────────────────────────────────────
-- All appointments for staff/admin with patient + doctor info
CREATE OR REPLACE FUNCTION get_all_appointments()
RETURNS TABLE (
  id               UUID,
  date             DATE,
  appointment_time TIME,
  treatment        TEXT,
  room             TEXT,
  appt_status      TEXT,
  patient_name     TEXT,
  patient_id       UUID,
  doctor_name      TEXT,
  doctor_id        UUID
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.date,
    a.time          AS appointment_time,
    a.treatment,
    a.room,
    a.status        AS appt_status,
    pat_pr.full_name AS patient_name,
    a.patient_id,
    doc_pr.full_name AS doctor_name,
    a.doctor_id
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

-- ─── get_doctors ─────────────────────────────────────────────────
-- List of staff profiles for doctor selector dropdowns
CREATE OR REPLACE FUNCTION get_doctors()
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name
  FROM profiles
  WHERE role IN ('doctor','admin')
    AND full_name IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles caller
      WHERE caller.id = auth.uid()
        AND caller.role IN ('doctor','staff','admin','receptionist')
    )
  ORDER BY full_name;
$$;

-- ─── request_appointment ─────────────────────────────────────────
-- Patient requests a new appointment (status = 'scheduled')
CREATE OR REPLACE FUNCTION request_appointment(
  p_date      DATE,
  p_time      TIME,
  p_treatment TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_appt_id    UUID;
BEGIN
  SELECT id INTO v_patient_id
  FROM patients
  WHERE profile_id = auth.uid()
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró su registro de paciente';
  END IF;

  INSERT INTO appointments (patient_id, treatment, date, time, status)
  VALUES (v_patient_id, p_treatment, p_date, p_time, 'scheduled')
  RETURNING id INTO v_appt_id;

  RETURN v_appt_id;
END;
$$;

-- ─── admin_create_appointment ────────────────────────────────────
-- Staff creates a new appointment for any patient
CREATE OR REPLACE FUNCTION admin_create_appointment(
  p_patient_id UUID,
  p_date       DATE,
  p_time       TIME,
  p_treatment  TEXT,
  p_room       TEXT    DEFAULT NULL,
  p_doctor_id  UUID    DEFAULT NULL,
  p_status     TEXT    DEFAULT 'scheduled'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO appointments (patient_id, doctor_id, date, time, treatment, room, status)
  VALUES (p_patient_id, p_doctor_id, p_date, p_time, p_treatment, NULLIF(p_room,''), p_status)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── admin_update_appointment ────────────────────────────────────
-- Staff updates an existing appointment
CREATE OR REPLACE FUNCTION admin_update_appointment(
  p_appointment_id UUID,
  p_date           DATE,
  p_time           TIME,
  p_treatment      TEXT,
  p_room           TEXT,
  p_status         TEXT,
  p_doctor_id      UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE appointments SET
    date      = p_date,
    time      = p_time,
    treatment = NULLIF(p_treatment,''),
    room      = NULLIF(p_room,''),
    status    = p_status,
    doctor_id = p_doctor_id
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada'; END IF;
END;
$$;