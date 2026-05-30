-- ============================================================
-- 030_get_patient_signed_forms.sql
-- Returns signed consent forms for a specific patient (by
-- patient.id, not profile.id) so staff can view/download
-- them from the patient detail page.
-- ============================================================

CREATE OR REPLACE FUNCTION get_patient_signed_forms(p_patient_id UUID)
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
  WHERE cf.patient_id = p_patient_id
    AND cf.status = 'signed'
    AND is_staff()
  ORDER BY cf.signed_at DESC;
$$;