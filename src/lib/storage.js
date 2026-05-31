import { supabase } from './supabase'

const BUCKET    = 'medical-documents'
const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED   = ['application/pdf', 'image/jpeg', 'image/png']
const URL_TTL   = 3600   // signed URL valid 1 hour

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateFile(file) {
  if (file.size > MAX_BYTES) return 'El archivo supera el límite de 50 MB'
  if (!ALLOWED.includes(file.type.toLowerCase())) return 'Tipo no permitido. Use PDF, JPG o PNG'
  return null
}

// ─── Patient upload ───────────────────────────────────────────────────────────
// Storage path uses the auth user's UID so the file is scoped to the patient.
// The DB insert goes through insert_my_document() (SECURITY DEFINER) which
// resolves the patient_id server-side — the client never supplies it.

export async function uploadDocument(file, profileId, category = 'General') {
  const path = `${profileId}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`

  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })
  if (storageErr) throw storageErr

  const { data, error: dbErr } = await supabase.rpc('insert_my_document', {
    p_file_path: path,
    p_name:      file.name,
    p_category:  category,
    p_file_size: file.size,
    p_file_type: file.type,
  })
  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([path])
    throw dbErr
  }
  return Array.isArray(data) ? data[0] : data
}

// ─── Staff upload ─────────────────────────────────────────────────────────────
// Staff supplies the target patient UUID explicitly.
// The DB insert goes through staff_insert_document() (SECURITY DEFINER) which
// verifies the caller has a staff/admin/doctor role before inserting.

export async function staffUploadDocument(file, patientId, category = 'General') {
  const path = `${patientId}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`

  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })
  if (storageErr) throw storageErr

  const { data, error: dbErr } = await supabase.rpc('staff_insert_document', {
    p_patient_id: patientId,
    p_file_path:  path,
    p_name:       file.name,
    p_category:   category,
    p_file_size:  file.size,
    p_file_type:  file.type,
  })
  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([path])
    throw dbErr
  }
  return Array.isArray(data) ? data[0] : data
}

// ─── Signed URL (view / download) ────────────────────────────────────────────

export async function getDocumentUrl(filePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, URL_TTL)
  if (error) throw error
  return data.signedUrl
}

// ─── Audit log (view / download) ─────────────────────────────────────────────

export async function logAccess(documentId, action) {
  await supabase.rpc('log_document_access', {
    p_document_id: documentId,
    p_action:      action,
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteDocument(filePath, documentId) {
  if (documentId) {
    const { error: dbErr } = await supabase.rpc('staff_delete_document', { p_document_id: documentId })
    if (dbErr) throw dbErr
  }
  const { error: storageErr } = await supabase.storage.from(BUCKET).remove([filePath])
  if (storageErr) throw storageErr
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatFileSize(bytes) {
  if (!bytes) return '—'
  const mb = bytes / 1024 / 1024
  return mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

export function mimeToType(mime) {
  if (!mime) return 'Archivo'
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('image/')) return 'Imagen'
  return 'Archivo'
}