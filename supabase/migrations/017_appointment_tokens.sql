-- ============================================================
-- 017_appointment_tokens.sql
-- 1. Add confirmation_token to appointments
-- 2. admin_create_appointment — now returns JSON {id, token}
-- 3. patient_respond_appointment — public (no login), token-gated
-- ============================================================

-- ─── 1. Column ────────────────────────────────────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_token UUID DEFAULT gen_random_uuid();

-- Back-fill existing rows that might have NULL token
UPDATE appointments SET confirmation_token = gen_random_uuid() WHERE confirmation_token IS NULL;

-- ─── 2. admin_create_appointment — returns JSON {id, token} ───────────────────
DROP FUNCTION IF EXISTS admin_create_appointment(UUID, DATE, TIME, TEXT, TEXT, UUID, TEXT, TEXT);

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
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id    UUID;
  v_token UUID;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO appointments (patient_id, doctor_id, date, time, treatment, room, status, notes)
  VALUES (p_patient_id, p_doctor_id, p_date, p_time, p_treatment, NULLIF(p_room,''), p_status, p_notes)
  RETURNING id, confirmation_token INTO v_id, v_token;

  RETURN json_build_object('id', v_id, 'token', v_token);
END;
$$;

-- ─── 3. patient_respond_appointment — no auth required, token is the key ──────
DROP FUNCTION IF EXISTS patient_respond_appointment(UUID, TEXT, TEXT);

CREATE FUNCTION patient_respond_appointment(
  p_token  UUID,
  p_action TEXT,          -- 'confirm' or 'cancel'
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_appt appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_appt FROM appointments WHERE confirmation_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Enlace no válido o expirado');
  END IF;

  IF v_appt.status NOT IN ('scheduled', 'confirmed') THEN
    RETURN json_build_object('ok', false, 'status', v_appt.status,
      'error', 'Esta cita ya ha sido procesada');
  END IF;

  IF p_action = 'confirm' THEN
    UPDATE appointments SET status = 'confirmed' WHERE confirmation_token = p_token;
    RETURN json_build_object('ok', true, 'action', 'confirmed');

  ELSIF p_action = 'cancel' THEN
    UPDATE appointments
    SET status = 'cancelled',
        notes  = CASE
                   WHEN p_reason IS NOT NULL AND TRIM(p_reason) != ''
                   THEN 'Paciente: ' || TRIM(p_reason)
                   ELSE 'Cancelado por el paciente'
                 END
    WHERE confirmation_token = p_token;
    RETURN json_build_object('ok', true, 'action', 'cancelled');

  ELSE
    RETURN json_build_object('ok', false, 'error', 'Acción no válida');
  END IF;
END;
$$;

-- Allow anonymous callers (patient clicks link from email, not logged in)
GRANT EXECUTE ON FUNCTION patient_respond_appointment(UUID, TEXT, TEXT) TO anon;