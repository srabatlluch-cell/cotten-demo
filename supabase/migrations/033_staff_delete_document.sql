-- ============================================================
-- 033_staff_delete_document.sql
-- Allows staff to delete documents:
--   1. Extends storage DELETE policy to all staff (was admin-only)
--   2. Creates staff_delete_document() RPC for DB-level deletion
-- ============================================================

-- 1. Storage: allow all staff to delete files in medical-documents
DROP POLICY IF EXISTS "storage_delete_admin" ON storage.objects;

CREATE POLICY "storage_delete_staff"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'medical-documents'
    AND is_staff()
  );

-- 2. DB function: delete the document record
CREATE OR REPLACE FUNCTION staff_delete_document(p_document_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Access denied: staff only';
  END IF;
  DELETE FROM documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;
END;
$$;