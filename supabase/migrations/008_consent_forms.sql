-- ============================================================
-- 008_consent_forms.sql  (fixed)
-- Electronic signature system for consent forms.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- ─── Extend consent_forms table ─────────────────────────────
ALTER TABLE consent_forms
  ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE consent_forms
  DROP CONSTRAINT IF EXISTS consent_forms_status_check;
ALTER TABLE consent_forms
  ADD CONSTRAINT consent_forms_status_check
  CHECK (status IN ('pending', 'signed'));

-- Backfill: rows that already have signed_at should be 'signed'
UPDATE consent_forms
SET status = 'signed'
WHERE signed_at IS NOT NULL AND status = 'pending';

-- ─── Audit log table ─────────────────────────────────────────
-- Drop and recreate so we get the correct column name (accessed_by, not user_id)
DROP TABLE IF EXISTS document_access_log CASCADE;

CREATE TABLE document_access_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  form_id     UUID,
  accessed_by UUID,
  action      TEXT NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_log_insert_own"
  ON document_access_log FOR INSERT
  WITH CHECK (accessed_by = auth.uid() OR is_staff());

CREATE POLICY "access_log_select_staff"
  ON document_access_log FOR SELECT
  USING (is_staff());

-- ─── get_my_consent_forms ────────────────────────────────────
DROP FUNCTION IF EXISTS get_my_consent_forms();

CREATE FUNCTION get_my_consent_forms()
RETURNS TABLE (
  id           UUID,
  title        TEXT,
  content      TEXT,
  form_status  TEXT,
  created_at   TIMESTAMPTZ,
  signed_at    TIMESTAMPTZ,
  days_waiting INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cf.id,
    cf.title,
    cf.content,
    cf.status                                    AS form_status,
    cf.created_at,
    cf.signed_at,
    EXTRACT(DAY FROM NOW() - cf.created_at)::INT AS days_waiting
  FROM consent_forms cf
  JOIN patients pat ON pat.id = cf.patient_id
  WHERE pat.profile_id = auth.uid()
  ORDER BY
    CASE WHEN cf.status = 'pending' THEN 0 ELSE 1 END,
    cf.created_at DESC;
$$;

-- ─── sign_consent_form ───────────────────────────────────────
DROP FUNCTION IF EXISTS sign_consent_form(UUID, TEXT, TEXT, TEXT);

CREATE FUNCTION sign_consent_form(
  p_form_id        UUID,
  p_signature_data TEXT,
  p_ip_address     TEXT DEFAULT NULL,
  p_user_agent     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  SELECT id INTO v_patient_id
  FROM patients
  WHERE profile_id = auth.uid()
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró su registro de paciente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM consent_forms
    WHERE id = p_form_id
      AND patient_id = v_patient_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Formulario no encontrado o ya firmado';
  END IF;

  UPDATE consent_forms SET
    status         = 'signed',
    signed_at      = NOW(),
    signature_data = p_signature_data,
    ip_address     = p_ip_address,
    user_agent     = p_user_agent
  WHERE id = p_form_id;

  INSERT INTO document_access_log (form_id, accessed_by, action, ip_address, user_agent)
  VALUES (p_form_id, auth.uid(), 'signed', p_ip_address, p_user_agent);
END;
$$;

-- ─── get_all_consent_forms ───────────────────────────────────
DROP FUNCTION IF EXISTS get_all_consent_forms();

CREATE FUNCTION get_all_consent_forms()
RETURNS TABLE (
  id             UUID,
  patient_id     UUID,
  patient_name   TEXT,
  title          TEXT,
  content        TEXT,
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
    pat.id                                       AS patient_id,
    pr.full_name                                 AS patient_name,
    cf.title,
    cf.content,
    cf.status                                    AS form_status,
    cf.created_at,
    cf.signed_at,
    cf.signature_data,
    cf.ip_address,
    cf.user_agent,
    EXTRACT(DAY FROM NOW() - cf.created_at)::INT AS days_waiting
  FROM consent_forms cf
  JOIN patients pat ON pat.id  = cf.patient_id
  JOIN profiles pr  ON pr.id   = pat.profile_id
  WHERE is_staff()
  ORDER BY
    CASE WHEN cf.status = 'pending' THEN 0 ELSE 1 END,
    cf.created_at DESC;
$$;

-- ─── get_pending_signatures ──────────────────────────────────
DROP FUNCTION IF EXISTS get_pending_signatures();

CREATE FUNCTION get_pending_signatures()
RETURNS TABLE (
  id           UUID,
  patient_id   UUID,
  patient_name TEXT,
  title        TEXT,
  created_at   TIMESTAMPTZ,
  days_waiting INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cf.id,
    pat.id                                       AS patient_id,
    pr.full_name                                 AS patient_name,
    cf.title,
    cf.created_at,
    EXTRACT(DAY FROM NOW() - cf.created_at)::INT AS days_waiting
  FROM consent_forms cf
  JOIN patients pat ON pat.id  = cf.patient_id
  JOIN profiles pr  ON pr.id   = pat.profile_id
  WHERE cf.status = 'pending' AND is_staff()
  ORDER BY cf.created_at ASC;
$$;

-- ─── admin_create_consent_form ───────────────────────────────
DROP FUNCTION IF EXISTS admin_create_consent_form(UUID, TEXT, TEXT);

CREATE FUNCTION admin_create_consent_form(
  p_patient_id UUID,
  p_title      TEXT,
  p_content    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO consent_forms (patient_id, title, content, status)
  VALUES (p_patient_id, p_title, p_content, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── log_document_access (for storage.js) ───────────────────
DROP FUNCTION IF EXISTS log_document_access(UUID, TEXT);

CREATE FUNCTION log_document_access(
  p_document_id UUID,
  p_action      TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO document_access_log (document_id, accessed_by, action)
  VALUES (p_document_id, auth.uid(), p_action);
END;
$$;