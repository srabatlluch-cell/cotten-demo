-- ============================================================
-- 032_fix_get_all_documents.sql
-- Recreates get_all_documents using is_staff() consistently
-- with the rest of the codebase. Also adds patient_id to the
-- return type so the admin UI can link back to the patient.
-- ============================================================

CREATE OR REPLACE FUNCTION get_all_documents()
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  category      TEXT,
  file_path     TEXT,
  file_size     BIGINT,
  file_type     TEXT,
  patient_id    UUID,
  patient_name  TEXT,
  patient_email TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.name,
    d.category,
    d.file_path,
    d.file_size,
    d.file_type,
    pat.id        AS patient_id,
    pr.full_name  AS patient_name,
    pr.email      AS patient_email,
    d.created_at
  FROM documents d
  JOIN patients  pat ON pat.id  = d.patient_id
  JOIN profiles  pr  ON pr.id   = pat.profile_id
  WHERE is_staff()
  ORDER BY d.created_at DESC;
$$;