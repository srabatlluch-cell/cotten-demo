-- ============================================================
-- 003_admin_create_patient.sql
-- Run this in the Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_create_patient(
  p_email       TEXT,
  p_full_name   TEXT,
  p_phone       TEXT DEFAULT NULL,
  p_dni         TEXT DEFAULT NULL,
  p_birth_date  DATE DEFAULT NULL,
  p_treatment   TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := gen_random_uuid();
  v_patient_id UUID;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: staff role required';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) THEN
    RAISE EXCEPTION 'Ya existe un usuario con ese correo electrónico';
  END IF;

  -- 1. Create auth user (confirmed — patient resets password via email)
  INSERT INTO auth.users (
    id, email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    aud, role
  ) VALUES (
    v_user_id,
    lower(p_email),
    substring(md5(random()::text || clock_timestamp()::text), 1, 32),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name),
    NOW(), NOW(),
    'authenticated', 'authenticated'
  );

  -- 2. Register email identity (provider_id = email, required by Supabase auth v2)
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider,
    identity_data,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, lower(p_email), 'email',
    jsonb_build_object('sub', v_user_id::TEXT, 'email', lower(p_email)),
    NOW(), NOW()
  );

  -- 3. Create profile row
  INSERT INTO profiles (id, email, full_name, phone, dni, birth_date, role)
  VALUES (
    v_user_id, lower(p_email), p_full_name,
    NULLIF(p_phone, ''), NULLIF(p_dni, ''), p_birth_date,
    'patient'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    phone      = EXCLUDED.phone,
    dni        = EXCLUDED.dni,
    birth_date = EXCLUDED.birth_date;

  -- 4. Create patient record
  INSERT INTO patients (profile_id, treatment, status)
  VALUES (v_user_id, NULLIF(p_treatment, ''), 'active')
  RETURNING id INTO v_patient_id;

  RETURN json_build_object(
    'user_id',    v_user_id,
    'patient_id', v_patient_id,
    'email',      lower(p_email),
    'full_name',  p_full_name
  );
END;
$$;