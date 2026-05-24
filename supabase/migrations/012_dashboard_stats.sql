-- ============================================================
-- 012_dashboard_stats.sql
-- Dashboard / Panel functions.
-- Safe to run multiple times (DROP … IF EXISTS before each CREATE).
-- Run in Supabase SQL Editor.
-- ============================================================

-- ─── get_dashboard_stats ─────────────────────────────────────
DROP FUNCTION IF EXISTS get_dashboard_stats();
DROP FUNCTION IF EXISTS get_panel_stats();   -- remove old alias if present

CREATE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_patients            BIGINT,
  appointments_today        BIGINT,
  pending_payments          NUMERIC,
  pending_signatures        BIGINT,
  overdue_payments          BIGINT,
  unconfirmed_appointments  BIGINT,
  old_pending_signatures    BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Total active patients
    (SELECT COUNT(*) FROM patients)::BIGINT,

    -- Appointments scheduled for today
    (SELECT COUNT(*) FROM appointments
     WHERE date = CURRENT_DATE
       AND status NOT IN ('cancelled', 'no_show'))::BIGINT,

    -- Sum of all pending payment amounts
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'pending'), 0)::NUMERIC,

    -- Unsigned consent forms
    (SELECT COUNT(*) FROM consent_forms WHERE status = 'pending')::BIGINT,

    -- Overdue payments: due_date passed, still pending
    (SELECT COUNT(*) FROM payments
     WHERE status = 'pending'
       AND due_date IS NOT NULL
       AND due_date < CURRENT_DATE)::BIGINT,

    -- Today's appointments not yet confirmed (status = 'scheduled')
    (SELECT COUNT(*) FROM appointments
     WHERE date = CURRENT_DATE
       AND status = 'scheduled')::BIGINT,

    -- Consent forms pending for more than 3 days
    (SELECT COUNT(*) FROM consent_forms
     WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '3 days')::BIGINT
  WHERE is_staff();
$$;

-- ─── get_today_appointments ───────────────────────────────────
DROP FUNCTION IF EXISTS get_today_appointments();

CREATE FUNCTION get_today_appointments()
RETURNS TABLE (
  id               UUID,
  appointment_time TIME,
  patient_name     TEXT,
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
    a.time                AS appointment_time,
    pr.full_name          AS patient_name,
    a.treatment,
    a.room,
    a.status              AS appt_status,
    doc_pr.full_name      AS doctor_name
  FROM appointments a
  JOIN patients  pat    ON pat.id = a.patient_id
  JOIN profiles  pr     ON pr.id  = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = a.doctor_id
  WHERE a.date = CURRENT_DATE
    AND is_staff()
  ORDER BY a.time ASC;
$$;

-- ─── get_recent_patients ──────────────────────────────────────
DROP FUNCTION IF EXISTS get_recent_patients();

CREATE FUNCTION get_recent_patients()
RETURNS TABLE (
  patient_id     UUID,
  full_name      TEXT,
  email          TEXT,
  treatment      TEXT,
  patient_status TEXT,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pat.id            AS patient_id,
    pr.full_name,
    pr.email,
    pat.treatment,
    pat.status        AS patient_status,
    pat.created_at
  FROM patients pat
  JOIN profiles pr ON pr.id = pat.profile_id
  WHERE is_staff()
  ORDER BY pat.created_at DESC
  LIMIT 5;
$$;

-- ─── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';