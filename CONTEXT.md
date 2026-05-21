# Cotten Demo — Project Context

Complete reference document for the Clínica Cotten patient portal.
Last updated: 2026-05-21.

---

## 1. Project Overview & Client Requirements

**Client:** Clínica Cotten — dental/aesthetic clinic in Barcelona.
**Product:** A private patient portal and internal staff panel.

### Patient-facing requirements
- Patients log in and see their own dashboard (next appointment, documents, pending payments, pending consent forms)
- View and upload medical documents (X-rays, budgets, consent forms)
- View appointment history and upcoming appointments
- View payment status
- Sign consent forms digitally
- Edit their own profile (phone, address, blood type, allergies, emergency contact)

### Staff/admin requirements
- Admin dashboard with KPI cards (total patients, today's appointments, pending payments, pending signatures)
- Full patient list with search and status filter
- Patient detail page with clinical notes, appointment history, documents, payments
- Create new patients directly from the admin panel (no external invite flow)
- Upload documents to any patient's file
- View/download all documents across all patients
- Manage appointments (agenda view)
- Manage payments
- Manage pending consent form signatures
- Manage clinical team (equipo)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| Routing | React Router v6 (nested routes) |
| Styling | Tailwind CSS + inline styles (brand palette) |
| Icons | lucide-react |
| Backend / DB | Supabase (PostgreSQL 15) |
| Authentication | Supabase Auth (email + password) |
| Storage | Supabase Storage (private bucket) |
| Hosting | Vercel (frontend) |
| Version control | GitHub |

### Brand palette
- Dark navy: `#1a2744`
- Gold accent: `#c9a96e`
- Background: `#f0ede8`
- Card border: `#e5e0d8`

---

## 3. All Files Created or Modified

### New files created
```
src/lib/supabase.js               — Supabase client initialisation
src/lib/auth.js                   — Auth helpers (signIn, signOut)
src/lib/storage.js                — Document upload/download/audit helpers
src/lib/adminSupabase.js          — (OBSOLETE) was service-role client, now unused
src/contexts/AuthContext.jsx      — Global auth state, RequirePatient/RequireStaff guards
src/pages/Landing.jsx             — Public landing page
src/pages/PatientLogin.jsx        — Patient login form
src/pages/StaffLogin.jsx          — Staff/admin login form
src/pages/patient/PatientDashboard.jsx   — Patient shell layout with sidebar
src/pages/patient/Inicio.jsx             — Patient dashboard (live data)
src/pages/patient/MiPerfil.jsx           — Patient profile view + edit
src/pages/patient/MisDocumentos.jsx      — Patient document list + self-upload
src/pages/patient/MisCitas.jsx           — Patient appointment list (mock shell)
src/pages/patient/MisPagos.jsx           — Patient payments list (mock shell)
src/pages/patient/FirmarDocumentos.jsx   — Consent form signing (mock shell)
src/pages/admin/AdminDashboard.jsx       — Admin shell layout with sidebar
src/pages/admin/Panel.jsx                — Admin KPI dashboard (live data)
src/pages/admin/Pacientes.jsx            — Patient list + create patient modal (live)
src/pages/admin/PacienteDetalle.jsx      — Patient detail page (live data)
src/pages/admin/Documentos.jsx           — All-documents view + staff upload (live)
src/pages/admin/Agenda.jsx               — Appointment calendar (mock shell)
src/pages/admin/Pagos.jsx                — Payments management (mock shell)
src/pages/admin/FirmasPendientes.jsx     — Pending signatures (mock shell)
src/pages/admin/Equipo.jsx               — Team management (mock shell)
src/components/AdminSidebar.jsx          — Admin navigation sidebar
src/components/PatientSidebar.jsx        — Patient navigation sidebar
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_patient_management.sql
supabase/migrations/003_admin_create_patient.sql
```

### Modified files
```
src/App.jsx        — Routes wired up with auth guards
src/main.jsx       — Entry point (unchanged from Vite scaffold)
src/index.css      — Tailwind directives
.env               — Supabase keys (see section 10)
```

---

## 4. Database Schema

### Tables

#### `profiles`
Mirrors `auth.users`. Created automatically on user signup via trigger (or manually for admin-created patients).
```
id               UUID PK  → references auth.users(id)
email            TEXT NOT NULL
full_name        TEXT
role             TEXT  DEFAULT 'patient'  CHECK IN ('patient','doctor','staff','admin')
phone            TEXT
address          TEXT
birth_date       DATE
dni              TEXT
blood_type       TEXT
allergies        TEXT
emergency_contact TEXT
created_at       TIMESTAMPTZ
```

#### `patients`
One row per patient. Separate from profiles to allow clinical fields.
```
id          UUID PK  DEFAULT gen_random_uuid()
profile_id  UUID  → profiles(id) CASCADE
doctor_id   UUID  → profiles(id) SET NULL
treatment   TEXT
status      TEXT  DEFAULT 'active'  CHECK IN ('active','inactive','discharged')
notes       TEXT
created_at  TIMESTAMPTZ
```

#### `appointments`
```
id          UUID PK
patient_id  UUID  → patients(id) CASCADE
doctor_id   UUID  → profiles(id) SET NULL
treatment   TEXT
date        DATE NOT NULL
time        TIME NOT NULL
room        TEXT
status      TEXT  DEFAULT 'scheduled'
            CHECK IN ('scheduled','confirmed','completed','cancelled','no_show')
created_at  TIMESTAMPTZ
```

#### `documents`
```
id           UUID PK
patient_id   UUID  → patients(id) CASCADE
name         TEXT NOT NULL
category     TEXT
file_path    TEXT NOT NULL   — storage path: {userId}/{timestamp}_{filename}
file_size    BIGINT
file_type    TEXT            — MIME type
uploaded_by  UUID  → profiles(id) SET NULL
created_at   TIMESTAMPTZ
```

#### `payments`
```
id          UUID PK
patient_id  UUID  → patients(id) CASCADE
concept     TEXT NOT NULL
amount      NUMERIC(10,2) NOT NULL
status      TEXT  DEFAULT 'pending'
            CHECK IN ('pending','paid','overdue','cancelled')
due_date    DATE
paid_at     TIMESTAMPTZ
created_at  TIMESTAMPTZ
```

#### `consent_forms`
```
id              UUID PK
patient_id      UUID  → patients(id) CASCADE
title           TEXT NOT NULL
content         TEXT
signed_at       TIMESTAMPTZ    — NULL = unsigned
signature_data  TEXT
created_at      TIMESTAMPTZ
```

### RLS Helper Functions

```sql
is_staff()  — returns TRUE if caller's role IN ('doctor','staff','admin','receptionist')
is_admin()  — returns TRUE if caller's role = 'admin'
```
Both are SECURITY DEFINER, STABLE, use `auth.uid()`.

### RLS Policies (all tables have RLS enabled)

| Table | Policy | Rule |
|---|---|---|
| profiles | select | own row OR is_staff() |
| profiles | insert | own row only |
| profiles | update | own row OR is_staff() |
| profiles | delete | is_admin() |
| patients | select | own profile_id OR is_staff() |
| patients | insert | is_staff() |
| patients | update | is_staff() |
| patients | delete | is_admin() |
| appointments | select | own patient record OR is_staff() |
| appointments | insert/update | is_staff() |
| appointments | delete | is_admin() |
| documents | select | own patient record OR is_staff() |
| documents | insert/update | is_staff() |
| documents | delete | is_admin() |
| payments | select | own patient record OR is_staff() |
| payments | insert/update | is_staff() |
| payments | delete | is_admin() |
| consent_forms | select | own patient record OR is_staff() |
| consent_forms | insert/update | is_staff() |
| consent_forms | delete | is_admin() |

### SECURITY DEFINER Functions (bypass RLS, run as postgres)

All defined in `002_patient_management.sql` unless noted.

| Function | Description |
|---|---|
| `get_all_patients()` | Full patient list with enriched data for admin panel |
| `get_all_documents()` | All documents with patient names for admin Documentos page |
| `get_patient_detail(p_patient_id)` | Single patient full info for detail page |
| `get_patient_appointments(p_patient_id)` | Patient's appointment history |
| `get_patient_payments(p_patient_id)` | Patient's payment history |
| `get_patient_documents(p_patient_id)` | Patient's document list |
| `get_panel_stats()` | KPI JSON for admin dashboard |
| `get_today_appointments()` | Today's appointments for dashboard widget |
| `get_recent_patients()` | 5 most recently registered patients |
| `get_my_dashboard()` | Patient's own dashboard summary JSON |
| `get_my_profile()` | Patient's own full profile JSON |
| `update_my_profile(...)` | Patient updates own editable fields |
| `admin_update_patient(...)` | Staff updates clinical fields (treatment, status, notes) |
| `admin_setup_patient(...)` | Creates profile + patient after external auth user creation |
| `admin_create_patient(...)` | Full patient creation in SQL (auth + profile + patient row) — `003_admin_create_patient.sql` |
| `get_my_appointments()` | Patient's own appointment list — `004_appointments.sql` |
| `get_all_appointments()` | All appointments with patient + doctor info for admin — `004_appointments.sql` |
| `get_doctors()` | List of doctor/admin profiles for dropdowns — `004_appointments.sql` |
| `request_appointment(p_date, p_time, p_treatment)` | Patient requests appointment (status=scheduled) — `004_appointments.sql` |
| `admin_create_appointment(...)` | Staff creates appointment for any patient — `004_appointments.sql` |
| `admin_update_appointment(...)` | Staff updates/cancels an appointment — `004_appointments.sql` |

**Important — `get_all_patients` ambiguity fix:**
The function uses an explicit alias `caller` for the inner profiles subquery to avoid "column reference id is ambiguous":
```sql
WHERE EXISTS (
  SELECT 1 FROM profiles caller
  WHERE caller.id = auth.uid()
    AND caller.role IN ('doctor','staff','admin','receptionist')
)
```
When re-running `CREATE OR REPLACE` doesn't clear the plan cache, use `DROP FUNCTION IF EXISTS` first.

---

## 5. Authentication System

### How it works
1. `supabase.auth.onAuthStateChange` fires on every session change (login, logout, page refresh).
2. Role is derived **immediately from the email domain** — no DB round-trip needed to unblock navigation.
   - `*@clinica-cotten.com` → role `'admin'` (staff portal)
   - Any other email → role `'patient'`
3. In the background, the real DB `profiles` row is fetched (with a 3-second timeout) and used to enrich `profile.full_name` and confirm the role.
4. `RequirePatient` / `RequireStaff` guards in `AuthContext.jsx` protect `/paciente/*` and `/admin/*` routes respectively.

### Key design decisions
- **No service role key in the browser.** Patient creation uses `admin_create_patient()` SECURITY DEFINER function instead.
- The `fetchProfileWithTimeout` has a 3s hard timeout so RLS errors or slow DB never block the UI indefinitely.
- `setTimeout(..., 0)` is used inside the auth callback to push the DB fetch outside Supabase's synchronous auth event handler (avoids internal deadlock).
- `useEffect` in pages that call RPCs must use `[user?.id]` as dependency (not `[]`) and guard with `if (!user?.id) return` — otherwise `auth.uid()` is NULL inside SQL when the effect fires before auth resolves.

### Auth user creation for patients
Staff calls `admin_create_patient()` which directly inserts into `auth.users` and `auth.identities`:
- Sets a random password (md5-based, no pgcrypto needed)
- Confirms email immediately (`email_confirmed_at = NOW()`)
- Patient must use "Forgot password" to set their own password
- No pgcrypto extension required — uses `substring(md5(random()::text || clock_timestamp()::text), 1, 32)`

---

## 6. Storage System

### Bucket
- Name: `medical-documents`
- Visibility: **private** (no public URLs)
- Max file size: 50 MB
- Allowed MIME types: `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`, `application/dicom`

### Storage RLS policies
- **SELECT**: staff OR patient accessing files under their own `{uid}/` prefix
- **INSERT**: staff only
- **UPDATE**: staff only
- **DELETE**: admin only

### File path convention
```
{patientUserId}/{timestamp}_{sanitized_filename}
```
Example: `a1b2c3d4-…/1716300000000_radiografia_panoramica.pdf`

The patient's `auth.uid()` is used as the folder — this is what the storage SELECT policy checks for patient self-access.

### Signed URLs
Generated via `supabase.storage.from('medical-documents').createSignedUrl(path, 3600)`.
Valid for **1 hour**. Never stored in the DB.

### `src/lib/storage.js` exports
| Function | Description |
|---|---|
| `validateFile(file)` | Returns error string or null. Checks size (50MB) and MIME type. |
| `uploadDocument(file, profileId, category)` | Patient self-upload. Calls `insert_my_document` RPC. |
| `staffUploadDocument(file, patientId, category)` | Staff upload. Calls `staff_insert_document` RPC. |
| `getDocumentUrl(filePath)` | Returns 1-hour signed URL. |
| `logAccess(documentId, action)` | Calls `log_document_access` RPC ('view' or 'download'). |
| `deleteDocument(filePath, documentId)` | Removes from storage + DB. |
| `formatFileSize(bytes)` | Human-readable size string. |
| `mimeToType(mime)` | Returns 'PDF', 'Imagen', or 'Archivo'. |

---

## 7. Completed Modules

### Admin portal (`/admin/*`)

#### Panel (`/admin/panel`)
- 4 KPI cards: total patients, today's appointments, pending payments (€), pending signatures
- Today's appointment list with time, patient, doctor, room, status
- 5 most recently registered patients
- All data from `get_panel_stats()`, `get_today_appointments()`, `get_recent_patients()` RPCs

#### Pacientes (`/admin/pacientes`)
- Full patient list from `get_all_patients()` RPC
- Search by name, email, DNI
- Status badges (Activo / Inactivo / Alta)
- "Nuevo paciente" modal — form submits to `admin_create_patient()` SQL function
- Each row links to patient detail page

#### PacienteDetalle (`/admin/pacientes/:id`)
- Full patient info from `get_patient_detail()`
- Tabs: Citas, Documentos, Pagos
- Citas tab: appointment history from `get_patient_appointments()`
- Documentos tab: document list from `get_patient_documents()`
- Pagos tab: payment history from `get_patient_payments()`
- Inline notes editing via `admin_update_patient()`

#### Documentos (`/admin/documentos`)
- All documents across all patients from `get_all_documents()` RPC
- Filter by patient name and file type
- Staff upload section: select patient + category + drag-drop/click upload
- View (signed URL in new tab) and download buttons with audit logging
- Upload via `staffUploadDocument()` → `staff_insert_document` RPC

### Patient portal (`/paciente/*`)

#### Inicio (`/paciente/inicio`)
- Welcome with patient's first name from profile
- 4 stat cards: next appointment, document count, pending payments, pending signatures
- Next appointment detail card (date, time, treatment, room, doctor)
- Links to other sections
- All data from `get_my_dashboard()` RPC

#### MiPerfil (`/paciente/perfil`)
- Read-only view of all profile fields + clinical info
- "Editar perfil" button opens edit mode
- Editable fields: full name, phone, address, birth date, blood type, allergies, emergency contact
- Save via `update_my_profile()` RPC
- Cancel discards changes

#### MisDocumentos (`/paciente/documentos`)
- Patient's own documents from `get_my_documents()` RPC
- View and download with signed URLs + audit trail
- Self-upload: drag-drop or click, category selector, progress bar
- Upload path uses patient's own `auth.uid()` as folder prefix

---

## 8. Pending Modules (mock shells only)

These pages exist as UI shells with placeholder content. They need to be wired to real data:

| Module | File | Status |
|---|---|---|
| MisCitas | `src/pages/patient/MisCitas.jsx` | **Done** — live data, request form |
| MisPagos | `src/pages/patient/MisPagos.jsx` | Mock UI only |
| FirmarDocumentos | `src/pages/patient/FirmarDocumentos.jsx` | Mock UI only |
| Agenda (admin) | `src/pages/admin/Agenda.jsx` | **Done** — live data, weekly calendar, create/edit modals |
| Pagos (admin) | `src/pages/admin/Pagos.jsx` | Mock UI only |
| FirmasPendientes (admin) | `src/pages/admin/FirmasPendientes.jsx` | Mock UI only |
| Equipo (admin) | `src/pages/admin/Equipo.jsx` | Mock UI only |

### Suggested next steps
1. **Agenda** — calendar view of all appointments; create/edit/cancel appointments
2. **MisCitas** — patient's upcoming and past appointments
3. **Pagos / MisPagos** — payment records, mark as paid, add payments
4. **FirmasPendientes / FirmarDocumentos** — digital signature with canvas or signature pad library
5. **Equipo** — staff profiles, role assignment

---

## 9. Known Issues & Things to Watch Out For

### `useEffect` auth timing (CRITICAL pattern)
Every page that calls a SECURITY DEFINER RPC must wait for `auth.uid()` to be set:
```js
// CORRECT
useEffect(() => {
  if (!user?.id) return;
  // ... fetch data
}, [user?.id]);

// WRONG — fires before auth resolves, auth.uid() is NULL in SQL
useEffect(() => {
  // ... fetch data
}, []);
```

### `CREATE OR REPLACE` plan cache
Postgres caches query plans inside functions. If you fix a SQL function body, `CREATE OR REPLACE` sometimes keeps the old plan in memory. Always use `DROP FUNCTION IF EXISTS` + `CREATE FUNCTION` when fixing ambiguity or type errors.

### `time` is a reserved keyword in PostgreSQL
Column aliases named `time` in RETURNS TABLE cause syntax errors. Use `appointment_time` instead with `a.time AS appointment_time` in the SELECT.

### `is_staff()` role check
The `profiles.role` column defaults to `'patient'`. If an admin user's profile row has `role = 'patient'` (e.g. due to a missing trigger or manual insert), all staff RPC calls will return empty or throw "Unauthorized". Fix with:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@clinica-cotten.com';
```

### Service role key
**The Supabase service role key (`sb_secret_yUVV4cF_...`) was briefly added to `.env` and committed to git.** It has since been removed from the file. **Rotate it immediately in Supabase Dashboard → Settings → API → Regenerate service_role key.**

### `adminSupabase.js`
`src/lib/adminSupabase.js` is now unused. The service role approach was replaced by the `admin_create_patient()` SQL function. This file can be deleted safely.

### `get_all_documents` function
This function was added during debugging (not in original migration plan). It is defined in `002_patient_management.sql` and must be run in Supabase SQL Editor if the DB was set up before 2026-05-21.

### No email sending for new patients
When staff creates a patient via `admin_create_patient()`, the auth user is created with a confirmed email but a random password. The patient must receive a "reset password" link manually. Consider wiring up Supabase's `auth.admin.generateLink('recovery', {email})` from an Edge Function to automate this.

---

## 10. Environment Variables

```env
# .env (at project root — not committed to git)
VITE_SUPABASE_URL=https://qjwpnfqevbjlzixjcaht.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_8BllvwISxm3NzOalwSnrzg_xCqim0H1
```

The anon key is safe to expose in the browser — RLS and SECURITY DEFINER functions enforce all access control server-side.

Do NOT add the service role key to `.env`. If you need it for a script, use it only in a server-side context (Edge Function or local migration script) and never commit it.

---

## 11. Test Users & Credentials

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin/Staff | `admin@clinica-cotten.com` | (set in Supabase Auth) | Must have `role = 'admin'` in profiles table |
| Patient | Any non-`@clinica-cotten.com` email | Set by patient via password reset | Created by admin via "Nuevo paciente" form |

To manually set a user's role:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@clinica-cotten.com';
```

To create a test patient directly in SQL (bypassing the UI):
```sql
SELECT admin_create_patient(
  'paciente@test.com',
  'María García',
  '+34 600 000 000',
  '12345678A',
  '1985-03-15',
  'Ortodoncia'
);
```

---

## 12. Supabase Project Details

| Field | Value |
|---|---|
| Project URL | `https://qjwpnfqevbjlzixjcaht.supabase.co` |
| Project ref | `qjwpnfqevbjlzixjcaht` |
| Region | (check Supabase dashboard) |
| Anon key | `sb_publishable_8BllvwISxm3NzOalwSnrzg_xCqim0H1` |
| Storage bucket | `medical-documents` (private) |
| Auth provider | Email (no OAuth configured) |

### SQL migrations (run in order in Supabase SQL Editor)
1. `supabase/migrations/001_initial_schema.sql` — tables, RLS, storage bucket
2. `supabase/migrations/002_patient_management.sql` — all SECURITY DEFINER RPCs
3. `supabase/migrations/003_admin_create_patient.sql` — `admin_create_patient()` function

---

## 13. GitHub & Vercel URLs

| Service | URL |
|---|---|
| GitHub repository | `https://github.com/srabatlluch-cell/cotten-demo` |
| Vercel deployment | (add once deployed to Vercel) |
| Local dev server | `http://localhost:5174` |

---

## 14. Important Decisions Made During Development

### No service role key in the browser
Using `supabase.auth.admin.createUser()` in the browser requires the service role key, which Supabase blocks (throws "Forbidden use of secret API key"). Instead, all patient creation logic was moved into the `admin_create_patient()` SECURITY DEFINER SQL function, which runs as postgres superuser and inserts directly into `auth.users` and `auth.identities`.

### Email domain as role signal
Rather than waiting for a DB profile fetch on every page load, the role is inferred instantly from the email domain (`@clinica-cotten.com` = staff). This unblocks routing immediately and the real DB row enriches the profile silently in the background.

### No pgcrypto dependency
The Supabase project does not have pgcrypto enabled. Password hashing uses `substring(md5(random()::text || clock_timestamp()::text), 1, 32)` — a random string that the patient will replace via password reset. This is acceptable because the password is never known to anyone.

### SECURITY DEFINER functions instead of direct table access
All cross-table queries that need to bypass RLS go through SECURITY DEFINER functions. This keeps the RLS policies simple (own rows only) while giving staff a clean API surface. It also prevents clients from constructing arbitrary queries against sensitive tables.

### `appointment_time` alias
PostgreSQL treats `time` as a reserved word in some contexts inside `RETURNS TABLE`. All appointment time columns are aliased to `appointment_time` in function signatures and `a.time AS appointment_time` in SELECT lists.

### `caller` alias in EXISTS subquery
When `get_all_patients()` uses profiles in both the outer join and an inner EXISTS check, the column `id` becomes ambiguous. The inner subquery uses an explicit alias `FROM profiles caller WHERE caller.id = auth.uid()` to resolve this.

### Document storage path uses patient's auth UID as folder
Storage RLS checks `name LIKE (auth.uid()::TEXT || '/%')` for patient self-access. Using the patient's auth UID (not the `patients.id` UUID) as the folder prefix means the storage policy matches without any DB lookup.