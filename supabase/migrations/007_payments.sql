-- ============================================================
-- 007_payments.sql
-- Real payment management functions.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- ─── get_all_payments ────────────────────────────────────────
-- All payments for admin, joined with patient name
DROP FUNCTION IF EXISTS get_all_payments();

CREATE FUNCTION get_all_payments()
RETURNS TABLE (
  id           UUID,
  patient_id   UUID,
  patient_name TEXT,
  concept      TEXT,
  amount       NUMERIC,
  pay_status   TEXT,
  due_date     DATE,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pay.id,
    pat.id           AS patient_id,
    pr.full_name     AS patient_name,
    pay.concept,
    pay.amount,
    pay.status       AS pay_status,
    pay.due_date,
    pay.paid_at,
    pay.created_at
  FROM payments pay
  JOIN patients pat ON pat.id     = pay.patient_id
  JOIN profiles pr  ON pr.id      = pat.profile_id
  WHERE is_staff()
  ORDER BY pay.created_at DESC;
$$;

-- ─── get_my_payments ─────────────────────────────────────────
-- Payments visible to the logged-in patient only
DROP FUNCTION IF EXISTS get_my_payments();

CREATE FUNCTION get_my_payments()
RETURNS TABLE (
  id         UUID,
  concept    TEXT,
  amount     NUMERIC,
  pay_status TEXT,
  due_date   DATE,
  paid_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pay.id,
    pay.concept,
    pay.amount,
    pay.status   AS pay_status,
    pay.due_date,
    pay.paid_at,
    pay.created_at
  FROM payments pay
  JOIN patients pat ON pat.id = pay.patient_id
  WHERE pat.profile_id = auth.uid()
  ORDER BY
    CASE WHEN pay.status IN ('pending','overdue') THEN 0 ELSE 1 END,
    pay.due_date ASC NULLS LAST,
    pay.created_at DESC;
$$;

-- ─── admin_create_payment ─────────────────────────────────────
DROP FUNCTION IF EXISTS admin_create_payment(UUID, TEXT, NUMERIC, DATE);

CREATE FUNCTION admin_create_payment(
  p_patient_id UUID,
  p_concept    TEXT,
  p_amount     NUMERIC,
  p_due_date   DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO payments (patient_id, concept, amount, due_date, status)
  VALUES (p_patient_id, p_concept, p_amount, p_due_date, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── admin_mark_payment_paid ──────────────────────────────────
DROP FUNCTION IF EXISTS admin_mark_payment_paid(UUID);

CREATE FUNCTION admin_mark_payment_paid(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE payments
  SET status  = 'paid',
      paid_at = NOW()
  WHERE id = p_payment_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
END;
$$;