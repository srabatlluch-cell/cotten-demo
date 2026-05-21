-- ============================================================
-- 001_initial_schema.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  full_name        TEXT,
  role             TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'staff', 'admin')),
  phone            TEXT,
  address          TEXT,
  birth_date       DATE,
  dni              TEXT,
  blood_type       TEXT,
  allergies        TEXT,
  emergency_contact TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- PATIENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  treatment   TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discharged')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  treatment   TEXT,
  date        DATE NOT NULL,
  time        TIME NOT NULL,
  room        TEXT,
  status      TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- DOCUMENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT,
  file_path    TEXT NOT NULL,
  file_size    BIGINT,
  file_type    TEXT,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- PAYMENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  concept     TEXT NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date    DATE,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- CONSENT FORMS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_forms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT,
  signed_at       TIMESTAMPTZ,
  signature_data  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms  ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- Helper: is the calling user staff/admin/doctor?
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('doctor', 'staff', 'admin', 'receptionist')
  );
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- PROFILES policies
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_staff());

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_staff());

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  USING (is_admin());

-- ──────────────────────────────────────────────────────────────
-- PATIENTS policies
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "patients_select"
  ON patients FOR SELECT
  USING (
    profile_id = auth.uid()
    OR is_staff()
  );

CREATE POLICY "patients_insert_staff"
  ON patients FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "patients_update_staff"
  ON patients FOR UPDATE
  USING (is_staff());

CREATE POLICY "patients_delete_admin"
  ON patients FOR DELETE
  USING (is_admin());

-- ──────────────────────────────────────────────────────────────
-- APPOINTMENTS policies
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "appointments_select"
  ON appointments FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
    OR is_staff()
  );

CREATE POLICY "appointments_insert_staff"
  ON appointments FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "appointments_update_staff"
  ON appointments FOR UPDATE
  USING (is_staff());

CREATE POLICY "appointments_delete_admin"
  ON appointments FOR DELETE
  USING (is_admin());

-- ──────────────────────────────────────────────────────────────
-- DOCUMENTS policies
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "documents_select"
  ON documents FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
    OR is_staff()
  );

CREATE POLICY "documents_insert_staff"
  ON documents FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "documents_update_staff"
  ON documents FOR UPDATE
  USING (is_staff());

CREATE POLICY "documents_delete_admin"
  ON documents FOR DELETE
  USING (is_admin());

-- ──────────────────────────────────────────────────────────────
-- PAYMENTS policies
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "payments_select"
  ON payments FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
    OR is_staff()
  );

CREATE POLICY "payments_insert_staff"
  ON payments FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "payments_update_staff"
  ON payments FOR UPDATE
  USING (is_staff());

CREATE POLICY "payments_delete_admin"
  ON payments FOR DELETE
  USING (is_admin());

-- ──────────────────────────────────────────────────────────────
-- CONSENT FORMS policies
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "consent_forms_select"
  ON consent_forms FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
    OR is_staff()
  );

CREATE POLICY "consent_forms_insert_staff"
  ON consent_forms FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "consent_forms_update_staff"
  ON consent_forms FOR UPDATE
  USING (is_staff());

CREATE POLICY "consent_forms_delete_admin"
  ON consent_forms FOR DELETE
  USING (is_admin());

-- ============================================================
-- STORAGE BUCKET: medical-documents
-- Run this separately in the Supabase SQL editor or via the
-- Storage API, as the storage schema is managed by Supabase.
-- ============================================================

-- Create the bucket (private, 50 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  FALSE,
  52428800,   -- 50 MB in bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/dicom'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: staff can upload/read; patients can only read their own files
CREATE POLICY "storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medical-documents'
    AND (
      is_staff()
      OR (
        auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::TEXT || '/%')
      )
    )
  );

CREATE POLICY "storage_insert_staff"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'medical-documents'
    AND is_staff()
  );

CREATE POLICY "storage_update_staff"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'medical-documents'
    AND is_staff()
  );

CREATE POLICY "storage_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'medical-documents'
    AND is_admin()
  );