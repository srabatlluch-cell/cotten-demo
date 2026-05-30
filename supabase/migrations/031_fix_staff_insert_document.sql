-- ============================================================
-- 031_fix_staff_insert_document.sql
-- Recreates staff_insert_document using is_staff() so that
-- the 'receptionist' role is included alongside admin/doctor/staff.
-- ============================================================

DROP FUNCTION IF EXISTS staff_insert_document(uuid,text,text,text,bigint,text);

CREATE OR REPLACE FUNCTION staff_insert_document(
  p_patient_id UUID,
  p_file_path  TEXT,
  p_name       TEXT,
  p_category   TEXT,
  p_file_size  BIGINT,
  p_file_type  TEXT
)
RETURNS TABLE (
  id         UUID,
  name       TEXT,
  category   TEXT,
  file_path  TEXT,
  file_size  BIGINT,
  file_type  TEXT,
  patient_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Access denied: staff only';
  END IF;

  RETURN QUERY
  INSERT INTO documents AS d (patient_id, file_path, name, category, file_size, file_type)
  VALUES (p_patient_id, p_file_path, p_name, p_category, p_file_size, p_file_type)
  RETURNING
    d.id, d.name, d.category, d.file_path, d.file_size, d.file_type, d.patient_id, d.created_at;
END;
$$;