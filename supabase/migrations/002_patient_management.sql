-- ============================================================
-- 002_patient_management.sql
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── get_all_documents ───────────────────────────────────────────
-- All documents with patient info (staff only)
CREATE OR REPLACE FUNCTION get_all_documents()
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  category      TEXT,
  file_path     TEXT,
  file_size     BIGINT,
  file_type     TEXT,
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
    pr.full_name  AS patient_name,
    pr.email      AS patient_email,
    d.created_at
  FROM documents d
  JOIN patients  pat ON pat.id  = d.patient_id
  JOIN profiles  pr  ON pr.id   = pat.profile_id
  WHERE EXISTS (
    SELECT 1 FROM profiles caller
    WHERE caller.id = auth.uid()
      AND caller.role IN ('doctor', 'staff', 'admin', 'receptionist')
  )
  ORDER BY d.created_at DESC;
$$;

-- ─── get_all_patients ────────────────────────────────────────────
-- Flat list of all patients with enriched info (admin only)
CREATE OR REPLACE FUNCTION get_all_patients()
RETURNS TABLE (
  patient_id          UUID,
  profile_id          UUID,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  dni                 TEXT,
  birth_date          DATE,
  treatment           TEXT,
  patient_status      TEXT,
  notes               TEXT,
  doctor_name         TEXT,
  next_appointment    DATE,
  pending_amount      NUMERIC,
  doc_count           BIGINT,
  created_at          TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pat.id,
    pat.profile_id,
    pr.full_name,
    pr.email,
    pr.phone,
    pr.dni,
    pr.birth_date,
    pat.treatment,
    pat.status,
    pat.notes,
    doc_pr.full_name,
    (SELECT a.date FROM appointments a
     WHERE a.patient_id = pat.id AND a.date >= CURRENT_DATE
     ORDER BY a.date, a.time LIMIT 1),
    COALESCE((SELECT SUM(p.amount) FROM payments p
              WHERE p.patient_id = pat.id AND p.status = 'pending'), 0),
    COALESCE((SELECT COUNT(*) FROM documents d WHERE d.patient_id = pat.id), 0),
    pat.created_at
  FROM patients pat
  JOIN profiles pr ON pr.id = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = pat.doctor_id
  WHERE EXISTS (
    SELECT 1 FROM profiles caller
    WHERE caller.id = auth.uid()
      AND caller.role IN ('doctor', 'staff', 'admin', 'receptionist')
  )
  ORDER BY pat.created_at DESC;
$$;

-- ─── get_patient_detail ──────────────────────────────────────────
-- Full patient info for detail page (admin only)
CREATE OR REPLACE FUNCTION get_patient_detail(p_patient_id UUID)
RETURNS TABLE (
  patient_id          UUID,
  profile_id          UUID,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  dni                 TEXT,
  birth_date          DATE,
  blood_type          TEXT,
  allergies           TEXT,
  emergency_contact   TEXT,
  address             TEXT,
  treatment           TEXT,
  patient_status      TEXT,
  notes               TEXT,
  doctor_id           UUID,
  doctor_name         TEXT,
  created_at          TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pat.id, pat.profile_id,
    pr.full_name, pr.email, pr.phone, pr.dni, pr.birth_date,
    pr.blood_type, pr.allergies, pr.emergency_contact, pr.address,
    pat.treatment, pat.status, pat.notes,
    pat.doctor_id, doc_pr.full_name,
    pat.created_at
  FROM patients pat
  JOIN profiles pr ON pr.id = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = pat.doctor_id
  WHERE pat.id = p_patient_id AND is_staff();
$$;

-- ─── get_patient_appointments ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_patient_appointments(p_patient_id UUID)
RETURNS TABLE (
  id               UUID,
  date             DATE,
  appointment_time TIME,
  treatment        TEXT,
  doctor_name      TEXT,
  room             TEXT,
  appt_status      TEXT,
  created_at       TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.date, a.time AS appointment_time, a.treatment,
         pr.full_name, a.room, a.status, a.created_at
  FROM appointments a
  LEFT JOIN profiles pr ON pr.id = a.doctor_id
  WHERE a.patient_id = p_patient_id AND is_staff()
  ORDER BY a.date DESC, a.time DESC;
$$;

-- ─── get_patient_payments ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_patient_payments(p_patient_id UUID)
RETURNS TABLE (
  id           UUID,
  concept      TEXT,
  amount       NUMERIC,
  pay_status   TEXT,
  due_date     DATE,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, concept, amount, status, due_date, paid_at, created_at
  FROM payments
  WHERE patient_id = p_patient_id AND is_staff()
  ORDER BY created_at DESC;
$$;

-- ─── get_patient_documents ───────────────────────────────────────
CREATE OR REPLACE FUNCTION get_patient_documents(p_patient_id UUID)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  category    TEXT,
  file_path   TEXT,
  file_size   BIGINT,
  file_type   TEXT,
  created_at  TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, category, file_path, file_size, file_type, created_at
  FROM documents
  WHERE patient_id = p_patient_id AND is_staff()
  ORDER BY created_at DESC;
$$;

-- ─── get_panel_stats ─────────────────────────────────────────────
-- Aggregate stats for admin dashboard (admin only)
CREATE OR REPLACE FUNCTION get_panel_stats()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patients   BIGINT;
  v_today      BIGINT;
  v_pending    NUMERIC;
  v_signatures BIGINT;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT COUNT(*)                      INTO v_patients   FROM patients;
  SELECT COUNT(*)                      INTO v_today      FROM appointments WHERE date = CURRENT_DATE AND status NOT IN ('cancelled','no_show');
  SELECT COALESCE(SUM(amount), 0)      INTO v_pending    FROM payments WHERE status = 'pending';
  SELECT COUNT(*)                      INTO v_signatures FROM consent_forms WHERE signed_at IS NULL;
  RETURN json_build_object(
    'patient_count',      v_patients,
    'today_appt_count',   v_today,
    'pending_amount',     v_pending,
    'pending_signatures', v_signatures
  );
END;
$$;

-- ─── get_today_appointments ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_today_appointments()
RETURNS TABLE (
  id               UUID,
  appointment_time TIME,
  treatment        TEXT,
  patient_name     TEXT,
  doctor_name      TEXT,
  room             TEXT,
  appt_status      TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.time AS appointment_time, a.treatment,
         pat_pr.full_name, doc_pr.full_name,
         a.room, a.status
  FROM appointments a
  JOIN patients pat      ON pat.id = a.patient_id
  JOIN profiles pat_pr   ON pat_pr.id = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = a.doctor_id
  WHERE a.date = CURRENT_DATE
    AND a.status NOT IN ('cancelled','no_show')
    AND is_staff()
  ORDER BY a.time ASC;
$$;

-- ─── get_recent_patients ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_recent_patients()
RETURNS TABLE (
  patient_id      UUID,
  full_name       TEXT,
  treatment       TEXT,
  patient_status  TEXT,
  created_at      TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pat.id, pr.full_name, pat.treatment, pat.status, pat.created_at
  FROM patients pat
  JOIN profiles pr ON pr.id = pat.profile_id
  WHERE is_staff()
  ORDER BY pat.created_at DESC
  LIMIT 5;
$$;

-- ─── get_my_dashboard ────────────────────────────────────────────
-- Patient's own dashboard data
CREATE OR REPLACE FUNCTION get_my_dashboard()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_appt       RECORD;
  v_docs       BIGINT;
  v_pending    NUMERIC;
  v_sigs       BIGINT;
BEGIN
  SELECT id INTO v_patient_id FROM patients WHERE profile_id = auth.uid() LIMIT 1;
  IF v_patient_id IS NULL THEN
    RETURN json_build_object('error', 'patient_not_found');
  END IF;

  SELECT a.date, a.time, a.treatment, a.room, pr.full_name AS doctor_name
  INTO v_appt
  FROM appointments a
  LEFT JOIN profiles pr ON pr.id = a.doctor_id
  WHERE a.patient_id = v_patient_id
    AND a.date >= CURRENT_DATE
    AND a.status NOT IN ('cancelled','no_show')
  ORDER BY a.date, a.time LIMIT 1;

  SELECT COUNT(*)                 INTO v_docs    FROM documents WHERE patient_id = v_patient_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_pending FROM payments  WHERE patient_id = v_patient_id AND status = 'pending';
  SELECT COUNT(*)                 INTO v_sigs    FROM consent_forms WHERE patient_id = v_patient_id AND signed_at IS NULL;

  RETURN json_build_object(
    'next_date',      v_appt.date,
    'next_time',      v_appt.time,
    'next_treatment', v_appt.treatment,
    'next_room',      v_appt.room,
    'next_doctor',    v_appt.doctor_name,
    'doc_count',      v_docs,
    'pending_amount', v_pending,
    'pending_sigs',   v_sigs
  );
END;
$$;

-- ─── get_my_profile ──────────────────────────────────────────────
-- Current patient's full profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'patient_id',        pat.id,
    'full_name',         pr.full_name,
    'email',             pr.email,
    'phone',             pr.phone,
    'dni',               pr.dni,
    'birth_date',        pr.birth_date,
    'address',           pr.address,
    'blood_type',        pr.blood_type,
    'allergies',         pr.allergies,
    'emergency_contact', pr.emergency_contact,
    'treatment',         pat.treatment,
    'patient_status',    pat.status,
    'doctor_name',       doc_pr.full_name
  ) INTO v_result
  FROM patients pat
  JOIN profiles pr ON pr.id = pat.profile_id
  LEFT JOIN profiles doc_pr ON doc_pr.id = pat.doctor_id
  WHERE pr.id = auth.uid()
  LIMIT 1;
  RETURN v_result;
END;
$$;

-- ─── update_my_profile ───────────────────────────────────────────
-- Patient updates their own editable fields
CREATE OR REPLACE FUNCTION update_my_profile(
  p_full_name         TEXT,
  p_phone             TEXT,
  p_address           TEXT,
  p_birth_date        DATE,
  p_blood_type        TEXT,
  p_allergies         TEXT,
  p_emergency_contact TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET
    full_name         = p_full_name,
    phone             = NULLIF(p_phone, ''),
    address           = NULLIF(p_address, ''),
    birth_date        = p_birth_date,
    blood_type        = NULLIF(p_blood_type, ''),
    allergies         = NULLIF(p_allergies, ''),
    emergency_contact = NULLIF(p_emergency_contact, '')
  WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

-- ─── admin_update_patient ────────────────────────────────────────
-- Staff updates patient clinical fields
CREATE OR REPLACE FUNCTION admin_update_patient(
  p_patient_id UUID,
  p_treatment  TEXT,
  p_status     TEXT,
  p_notes      TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE patients SET
    treatment = NULLIF(p_treatment, ''),
    status    = p_status,
    notes     = NULLIF(p_notes, '')
  WHERE id = p_patient_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found'; END IF;
END;
$$;

-- ─── admin_setup_patient ─────────────────────────────────────────
-- Creates profile + patient record after auth user is created externally.
-- Called after supabase.auth.admin.createUser() on the frontend admin client.
CREATE OR REPLACE FUNCTION admin_setup_patient(
  p_user_id    UUID,
  p_email      TEXT,
  p_full_name  TEXT,
  p_phone      TEXT DEFAULT NULL,
  p_dni        TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_treatment  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_patient_id UUID;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Unauthorized: staff role required'; END IF;

  INSERT INTO profiles (id, email, full_name, phone, dni, birth_date, role)
  VALUES (p_user_id, p_email, p_full_name, p_phone, p_dni, p_birth_date, 'patient')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    phone      = EXCLUDED.phone,
    dni        = EXCLUDED.dni,
    birth_date = EXCLUDED.birth_date;

  INSERT INTO patients (profile_id, treatment, status)
  VALUES (p_user_id, NULLIF(p_treatment, ''), 'active')
  RETURNING id INTO v_patient_id;

  RETURN v_patient_id;
END;
$$;