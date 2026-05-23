-- ============================================================
-- 009_consent_pdf.sql
-- Adds PDF attachment support to consent forms.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- ─── Add document_path column ────────────────────────────────
ALTER TABLE consent_forms
  ADD COLUMN IF NOT EXISTS document_path TEXT;

-- ─── Storage bucket ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('consent-forms', 'consent-forms', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop first so this script is re-runnable)
DROP POLICY IF EXISTS "consent_forms_staff_insert"  ON storage.objects;
DROP POLICY IF EXISTS "consent_forms_staff_select"  ON storage.objects;
DROP POLICY IF EXISTS "consent_forms_patient_select" ON storage.objects;
DROP POLICY IF EXISTS "consent_forms_staff_delete"  ON storage.objects;

-- Staff can upload
CREATE POLICY "consent_forms_staff_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'consent-forms'
    AND is_staff()
  );

-- Staff can read any file in the bucket
CREATE POLICY "consent_forms_staff_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consent-forms'
    AND is_staff()
  );

-- Patient can read files in their own folder (path starts with their patient UUID)
CREATE POLICY "consent_forms_patient_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consent-forms'
    AND (string_to_array(name, '/'))[1] IN (
      SELECT id::text FROM public.patients WHERE profile_id = auth.uid()
    )
  );

-- Staff can delete
CREATE POLICY "consent_forms_staff_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'consent-forms'
    AND is_staff()
  );

-- ─── Update get_my_consent_forms ─────────────────────────────
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

-- ─── Update get_all_consent_forms ────────────────────────────
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
    pat.id                                       AS patient_id,
    pr.full_name                                 AS patient_name,
    cf.title,
    cf.content,
    cf.document_path,
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

-- ─── Update admin_create_consent_form ────────────────────────
DROP FUNCTION IF EXISTS admin_create_consent_form(UUID, TEXT, TEXT);

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