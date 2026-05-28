-- ============================================================
-- 016_appointment_notes_and_cancel.sql
-- 1. Add notes column to appointments
-- 2. admin_cancel_appointment — quick cancel RPC for Panel
-- 3. get_today_appointments — add patient_email, patient_id, notes
-- 4. get_all_appointments   — add notes
-- 5. admin_create_appointment — accept p_notes
-- 6. admin_update_appointment — accept p_notes
-- ============================================================

-- ─── 1. Column ────────────────────────────────────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── 2. admin_cancel_appointment ──────────────────────────────────────────────
DROP FUNCTION IF EXISTS admin_cancel_appointment(UUID);

CREATE FUNCTION admin_cancel_appointment(p_appointment_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE appointments
  SET status = 'cancelled'
  WHERE id = p_appointment_id
    AND status IN ('scheduled', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cita no encontrada o ya está cancelada/completada';
  END IF;
END;
$$;

-- ─── 3. get_today_appointments (add patient_email, patient_id, notes) ─────────
DROP FUNCTION IF EXISTS get_today_appointments();

CREATE FUNCTION get_today_appointments()
RETURNS TABLE (
  id               UUID,
  appointment_time TIME,
  treatment        TEXT,
  patient_name     TEXT,
  patient_id       UUID,
  patient_email    TEXT,
  doctor_name      TEXT,
  room             TEXT,
  appt_status      TEXT,
  notes            TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.time           AS appointment_time,
    a.treatment,
    pat_pr.full_name AS patient_name,
    a.patient_id,
    pat_pr.email     AS patient_email,
    doc_pr.full_name AS doctor_name,
    a.room,
    a.status         AS appt_status,
    a.notes
  FROM appointments a
  JOIN patients pat         ON pat.id    = a.patient_id
  JOIN profiles pat_pr      ON pat_pr.id = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = a.doctor_id
  WHERE a.date = CURRENT_DATE
    AND is_staff()
  ORDER BY a.time ASC;
$$;

-- ─── 4. get_all_appointments (add notes) ──────────────────────────────────────
DROP FUNCTION IF EXISTS get_all_appointments();

CREATE FUNCTION get_all_appointments()
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
  doctor_id        UUID,
  notes            TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.date,
    a.time           AS appointment_time,
    a.treatment,
    a.room,
    a.status         AS appt_status,
    pat_pr.full_name AS patient_name,
    a.patient_id,
    doc_pr.full_name AS doctor_name,
    a.doctor_id,
    a.notes
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

-- ─── 5. admin_create_appointment (add p_notes) ────────────────────────────────
DROP FUNCTION IF EXISTS admin_create_appointment(UUID, DATE, TIME, TEXT, TEXT, UUID, TEXT);

CREATE FUNCTION admin_create_appointment(
  p_patient_id UUID,
  p_date       DATE,
  p_time       TIME,
  p_treatment  TEXT,
  p_room       TEXT    DEFAULT NULL,
  p_doctor_id  UUID    DEFAULT NULL,
  p_status     TEXT    DEFAULT 'scheduled',
  p_notes      TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO appointments (patient_id, doctor_id, date, time, treatment, room, status, notes)
  VALUES (p_patient_id, p_doctor_id, p_date, p_time, p_treatment, NULLIF(p_room,''), p_status, p_notes)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── 6. admin_update_appointment (add p_notes) ────────────────────────────────
DROP FUNCTION IF EXISTS admin_update_appointment(UUID, DATE, TIME, TEXT, TEXT, TEXT, UUID);

CREATE FUNCTION admin_update_appointment(
  p_appointment_id UUID,
  p_date           DATE,
  p_time           TIME,
  p_treatment      TEXT,
  p_room           TEXT,
  p_status         TEXT,
  p_doctor_id      UUID    DEFAULT NULL,
  p_notes          TEXT    DEFAULT NULL
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
    doctor_id = p_doctor_id,
    notes     = p_notes
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada'; END IF;
END;
$$;