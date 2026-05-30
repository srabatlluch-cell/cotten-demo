-- ============================================================
-- 029_get_all_signed_forms.sql
-- Returns all signed consent forms for staff view,
-- including signature_data and document_path so staff can
-- view/download each signed document with the signature overlay.
-- ============================================================

CREATE OR REPLACE FUNCTION get_all_signed_forms()
RETURNS TABLE (
  id             UUID,
  title          TEXT,
  content        TEXT,
  document_path  TEXT,
  patient_id     UUID,
  patient_name   TEXT,
  patient_email  TEXT,
  signed_at      TIMESTAMPTZ,
  signature_data TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cf.id,
    cf.title,
    cf.content,
    cf.document_path,
    pat.id          AS patient_id,
    pr.full_name    AS patient_name,
    pr.email        AS patient_email,
    cf.signed_at,
    cf.signature_data
  FROM consent_forms cf
  JOIN patients  pat ON pat.id  = cf.patient_id
  JOIN profiles  pr  ON pr.id   = pat.profile_id
  WHERE cf.status = 'signed'
    AND is_staff()
  ORDER BY cf.signed_at DESC;
$$;