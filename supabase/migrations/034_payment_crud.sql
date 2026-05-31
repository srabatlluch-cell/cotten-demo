-- ============================================================
-- 034_payment_crud.sql
-- Adds update and delete functions for payments.
-- ============================================================

-- ─── admin_update_payment ────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_update_payment(
  p_payment_id UUID,
  p_concept    TEXT,
  p_amount     NUMERIC,
  p_due_date   DATE    DEFAULT NULL,
  p_status     TEXT    DEFAULT 'pending'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE payments
  SET concept  = p_concept,
      amount   = p_amount,
      due_date = p_due_date,
      status   = p_status,
      paid_at  = CASE WHEN p_status = 'paid' AND paid_at IS NULL THEN NOW()
                      WHEN p_status != 'paid'                    THEN NULL
                      ELSE paid_at END
  WHERE id = p_payment_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
END;
$$;

-- ─── admin_delete_payment ────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_delete_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
END;
$$;