-- ============================================================
-- 011_fix_consent_document_path.sql
-- Ensures document_path is persisted and returned correctly.
-- Safe to run multiple times (idempotent).
-- Run in Supabase SQL Editor.
-- ============================================================

-- ─── 1. Ensure column exists ─────────────────────────────────
ALTER TABLE consent_forms
  ADD COLUMN IF NOT EXISTS document_path TEXT;

-- ─── 2. admin_create_consent_form ────────────────────────────
-- Drop ALL overloads so no stale signature lingers.
DROP FUNCTION IF EXISTS admin_create_consent_form(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_create_consent_form(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_create_consent_form(p_patient_id UUID, p_title TEXT, p_content TEXT, p_document_path TEXT);

CREATE FUNCTION admin_create_consent_form(
  p_patient_id    UUID,
  p_title         TEXT,
  p_content       TEXT    DEFAULT NULL,
  p_document_path TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO consent_forms (patient_id, title, content, document_path, status)
  VALUES (p_patient_id, p_title, p_content, p_document_path, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── 3. get_all_consent_forms ────────────────────────────────
DROP FUNCTION IF EXISTS get_all_consent_forms();

CREATE FUNCTION get_all_consent_forms()
RETURNS TABLE (
  id             UUID,
  patient_id     UUID,
  patient_name   TEXT,
  title          TEXT,
  content        TEXT,
  document_path  TEXT,
  form_status    TEXT,
  created_at     TIMESTAMPTZ,
  signed_at      TIMESTAMPTZ,
  signature_data TEXT,
  ip_address     TEXT,
  user_agent     TEXT,
  days_waiting   INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cf.id,
    pat.id                                        AS patient_id,
    pr.full_name                                  AS patient_name,
    cf.title,
    cf.content,
    cf.document_path,
    cf.status                                     AS form_status,
    cf.created_at,
    cf.signed_at,
    cf.signature_data,
    cf.ip_address,
    cf.user_agent,
    EXTRACT(DAY FROM NOW() - cf.created_at)::INT  AS days_waiting
  FROM consent_forms cf
  JOIN patients pat ON pat.id = cf.patient_id
  JOIN profiles  pr  ON pr.id = pat.profile_id
  WHERE is_staff()
  ORDER BY
    CASE WHEN cf.status = 'pending' THEN 0 ELSE 1 END,
    cf.created_at DESC;
$$;

-- ─── 4. get_pending_signatures ───────────────────────────────
-- Now includes document_path so the frontend badge stays visible.
DROP FUNCTION IF EXISTS get_pending_signatures();

CREATE FUNCTION get_pending_signatures()
RETURNS TABLE (
  id             UUID,
  patient_id     UUID,
  patient_name   TEXT,
  title          TEXT,
  document_path  TEXT,
  created_at     TIMESTAMPTZ,
  days_waiting   INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cf.id,
    pat.id                                        AS patient_id,
    pr.full_name                                  AS patient_name,
    cf.title,
    cf.document_path,
    cf.created_at,
    EXTRACT(DAY FROM NOW() - cf.created_at)::INT  AS days_waiting
  FROM consent_forms cf
  JOIN patients pat ON pat.id = cf.patient_id
  JOIN profiles  pr  ON pr.id = pat.profile_id
  WHERE cf.status = 'pending'
    AND is_staff()
  ORDER BY cf.created_at ASC;
$$;

-- ─── 5. get_my_consent_forms (patient-facing) ────────────────
DROP FUNCTION IF EXISTS get_my_consent_forms();

CREATE FUNCTION get_my_consent_forms()
RETURNS TABLE (
  id            UUID,
  title         TEXT,
  content       TEXT,
  document_path TEXT,
  form_status   TEXT,
  created_at    TIMESTAMPTZ,
  signed_at     TIMESTAMPTZ,
  days_waiting  INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cf.id,
    cf.title,
    cf.content,
    cf.document_path,
    cf.status                                     AS form_status,
    cf.created_at,
    cf.signed_at,
    EXTRACT(DAY FROM NOW() - cf.created_at)::INT  AS days_waiting
  FROM consent_forms cf
  JOIN patients pat ON pat.id = cf.patient_id
  WHERE pat.profile_id = auth.uid()
  ORDER BY
    CASE WHEN cf.status = 'pending' THEN 0 ELSE 1 END,
    cf.created_at DESC;
$$;

-- ─── 6. Reload PostgREST schema cache ────────────────────────
NOTIFY pgrst, 'reload schema';