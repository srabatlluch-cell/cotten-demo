-- ─── admin_confirm_appointment ───────────────────────────────────────────────
-- Marks a single appointment as confirmed. Staff-only, status must be 'scheduled'.

DROP FUNCTION IF EXISTS admin_confirm_appointment(UUID);

CREATE FUNCTION admin_confirm_appointment(p_appointment_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE appointments
  SET status = 'confirmed'
  WHERE id = p_appointment_id
    AND status = 'scheduled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cita no encontrada o ya no está en estado pendiente';
  END IF;
END;
$$;