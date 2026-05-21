-- ============================================================
-- 006_patient_update_appointment.sql
-- Lets a patient confirm or cancel their own appointment.
-- Run this in the Supabase SQL Editor.
-- ============================================================

DROP FUNCTION IF EXISTS update_my_appointment_status(UUID, TEXT);

CREATE FUNCTION update_my_appointment_status(
  p_appointment_id UUID,
  p_status         TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id     UUID;
  v_current_status TEXT;
BEGIN
  -- Guard: only these two target statuses are allowed
  IF p_status NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Estado no permitido: %', p_status;
  END IF;

  -- Resolve the patient record for the logged-in user
  SELECT id INTO v_patient_id
  FROM patients
  WHERE profile_id = auth.uid()
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró su registro de paciente';
  END IF;

  -- Verify ownership and fetch current status
  SELECT status INTO v_current_status
  FROM appointments
  WHERE id = p_appointment_id
    AND patient_id = v_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cita no encontrada';
  END IF;

  -- Only act on appointments that are still actionable
  IF v_current_status NOT IN ('scheduled', 'confirmed') THEN
    RAISE EXCEPTION 'No se puede modificar una cita en estado "%"', v_current_status;
  END IF;

  -- Confirming is only valid from scheduled
  IF p_status = 'confirmed' AND v_current_status != 'scheduled' THEN
    RAISE EXCEPTION 'Solo se puede confirmar una cita programada';
  END IF;

  UPDATE appointments
  SET status = p_status
  WHERE id = p_appointment_id;
END;
$$;