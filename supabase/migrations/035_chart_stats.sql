-- ============================================================
-- 035_chart_stats.sql
-- Chart data functions for the admin dashboard statistics.
-- Run in Supabase SQL Editor.
-- ============================================================

-- ─── get_monthly_appointments ────────────────────────────────
-- Returns appointment counts per month for the last p_months months.
-- Excludes cancelled and no-show appointments.
DROP FUNCTION IF EXISTS get_monthly_appointments(INT);

CREATE FUNCTION get_monthly_appointments(p_months INT DEFAULT 6)
RETURNS TABLE (month_date DATE, total BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT
    m.month_start                AS month_date,
    COUNT(a.id)::BIGINT          AS total
  FROM (
    SELECT
      (DATE_TRUNC('month', CURRENT_DATE::TIMESTAMP)
        - (gs * INTERVAL '1 month'))::DATE AS month_start
    FROM GENERATE_SERIES(p_months - 1, 0, -1) AS gs
  ) m
  LEFT JOIN appointments a
    ON DATE_TRUNC('month', a.date::TIMESTAMP)::DATE = m.month_start
   AND a.status NOT IN ('cancelled', 'no_show')
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$;

-- ─── get_monthly_new_patients ─────────────────────────────────
-- Returns new patient registration counts per month for the last p_months months.
DROP FUNCTION IF EXISTS get_monthly_new_patients(INT);

CREATE FUNCTION get_monthly_new_patients(p_months INT DEFAULT 6)
RETURNS TABLE (month_date DATE, total BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT
    m.month_start                AS month_date,
    COUNT(pat.id)::BIGINT        AS total
  FROM (
    SELECT
      (DATE_TRUNC('month', CURRENT_DATE::TIMESTAMP)
        - (gs * INTERVAL '1 month'))::DATE AS month_start
    FROM GENERATE_SERIES(p_months - 1, 0, -1) AS gs
  ) m
  LEFT JOIN patients pat
    ON DATE_TRUNC('month', pat.created_at::TIMESTAMP)::DATE = m.month_start
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$;

-- ─── get_payment_distribution ────────────────────────────────
-- Returns payment count and amount grouped by effective status
-- (paid / pending / overdue based on due_date).
DROP FUNCTION IF EXISTS get_payment_distribution();

CREATE FUNCTION get_payment_distribution()
RETURNS TABLE (pay_status TEXT, total_count BIGINT, total_amount NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT
    CASE
      WHEN p.status = 'paid'                                            THEN 'paid'
      WHEN p.status = 'pending'
       AND (p.due_date IS NULL OR p.due_date >= CURRENT_DATE)           THEN 'pending'
      ELSE                                                                   'overdue'
    END                           AS pay_status,
    COUNT(*)::BIGINT              AS total_count,
    COALESCE(SUM(p.amount), 0)::NUMERIC AS total_amount
  FROM payments p
  GROUP BY 1
  ORDER BY 1;
END;
$$;

-- ─── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';