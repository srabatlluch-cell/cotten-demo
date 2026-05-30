-- ============================================================
-- 028_get_my_signed_forms.sql
-- Returns signed consent forms for the current patient,
-- including signature_data and document_path so the patient
-- can re-download their signed documents from Mis Documentos.
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_signed_forms()
RETURNS TABLE (
  id             UUID,
  title          TEXT,
  content        TEXT,
  document_path  TEXT,
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
    cf.signed_at,
    cf.signature_data
  FROM consent_forms cf
  JOIN patients pat ON pat.id = cf.patient_id
  WHERE pat.profile_id = auth.uid()
    AND cf.status = 'signed'
  ORDER BY cf.signed_at DESC;
$$;