# Análisis Crítico del Proyecto — Clínica Cotten Portal

**Fecha del análisis:** Mayo 2026  
**Proyecto:** Portal de Pacientes · Clínica Cotten Barcelona  
**Repositorio:** cotten-demo (Vercel + Supabase)  
**Analista:** Claude Sonnet 4.6

---

## 1. STACK TECNOLÓGICO

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 19.2.6 | Framework UI |
| React Router DOM | 7.15.1 | Enrutamiento SPA |
| Vite | 8.0.12 | Bundler / Dev server |
| Tailwind CSS | 4.3.0 | Estilos utilitarios |
| Lucide React | 1.16.0 | Iconografía |
| pdf-lib | 1.17.1 | Generación/edición de PDFs firmados |

### Backend / Infraestructura
| Tecnología | Rol |
|---|---|
| Supabase (PostgreSQL) | Base de datos relacional + Auth + Storage |
| Supabase RPC (SECURITY DEFINER) | API segura server-side en SQL |
| Supabase Edge Functions (Deno) | Proxy de email server-side |
| Supabase Storage | Almacenamiento privado de documentos médicos |
| Resend API | Envío de emails transaccionales |
| Vercel | Hosting del frontend SPA |

### Arquitectura general
```
Browser (React SPA)
    │
    ├── Supabase JS SDK ──► Supabase Auth (JWT)
    │                   ──► PostgreSQL (RLS + RPC functions)
    │                   ──► Storage (bucket privado)
    │                   ──► Edge Function: send-email (Deno)
    │                                         │
    │                                         └──► Resend API ──► Email
    │
    └── Vercel CDN (dist estática)
```

La arquitectura es **serverless pura**: no hay backend Express/Node propio. Toda la lógica de negocio sensible vive en funciones SQL `SECURITY DEFINER` que se ejecutan con permisos elevados en el servidor de Supabase, nunca en el navegador.

---

## 2. ANÁLISIS DE SEGURIDAD

### ✅ Lo que está bien implementado

**Row Level Security (RLS)**  
Todas las tablas (`profiles`, `patients`, `appointments`, `documents`, `payments`, `consent_forms`) tienen RLS habilitado. Las políticas están correctamente separadas:
- Pacientes solo ven sus propios datos
- Staff ve todos los datos
- Solo `admin` puede borrar

**Funciones SECURITY DEFINER**  
Toda la lógica crítica (crear paciente, archivar, firmar consentimiento, etc.) se ejecuta con `SECURITY DEFINER` en PostgreSQL. El cliente JS solo llama `.rpc()` y nunca ejecuta SQL directo ni tiene permisos de escritura directa en tablas sensibles.

**Storage privado**  
El bucket `medical-documents` está configurado como `public: FALSE`. Los archivos solo son accesibles mediante `createSignedUrl()` con tokens temporales (1 hora). Los pacientes solo pueden acceder a sus propios ficheros por path.

**Email a través de Edge Function**  
La API key de Resend nunca llega al navegador. Las llamadas a Resend se hacen exclusivamente desde la Edge Function server-side, evitando la exposición en el bundle JS.

**Registro de auditoría de firmas**  
La tabla `document_access_log` registra cada firma con: `form_id`, `accessed_by` (UUID), `action`, `ip_address`, `user_agent`. Esto es un requisito para la validez probatoria de la firma.

---

### ⚠️ Problemas de seguridad — Nivel MEDIO

**[CRITICO] Detección de rol por dominio de email**  
```js
// AuthContext.jsx:9
function roleFromEmail(email) {
  return email.endsWith('@clinica-cotten.com') ? 'admin' : 'patient'
}
```
Cualquier persona que registre o tenga una cuenta con email `@clinica-cotten.com` obtendría acceso de administrador al portal. Si el dominio `clinica-cotten.com` no está correctamente protegido (SPF/DKIM/registro privado), esto es un vector de ataque real.

**Solución recomendada:** El rol debe leerse siempre desde `profiles.role` en la base de datos, nunca inferirse del email en el cliente. El enriquecimiento del perfil desde BD ya ocurre (línea 62 de AuthContext), pero la guardia de rutas (`RequireStaff`) puede actuar antes de que llegue el perfil real de la BD si hay lentitud en la red.

---

**[MEDIO] Edge Function sin autenticación JWT**  
```bash
supabase functions deploy send-email --no-verify-jwt
```
La Edge Function `send-email` no verifica el JWT de Supabase. Cualquier petición HTTP puede llamarla directamente con un body `{to, subject, html}` arbitrario y enviar emails desde el dominio de la clínica. Esto puede ser abusado para spam o phishing.

**Solución recomendada:** Reactivar la verificación JWT (`--no-verify-jwt` eliminar). Los errores 403 originales eran porque el frontend no enviaba el header correcto, no porque el JWT fuera inválido.

---

**[MEDIO] CORS abierto en Edge Function**  
```ts
"Access-Control-Allow-Origin": "*"
```
Cualquier dominio web puede llamar a la Edge Function con un JWT válido de Supabase. Debería restringirse a `https://cotten-demo.vercel.app` y el dominio definitivo de la clínica.

---

**[MEDIO] `receptionist` en `is_staff()` pero no en el CHECK de la tabla**  
```sql
-- is_staff() verifica:
AND role IN ('doctor', 'staff', 'admin', 'receptionist')

-- Pero profiles.role solo permite:
CHECK (role IN ('patient', 'doctor', 'staff', 'admin'))
```
El rol `receptionist` nunca puede existir en la base de datos pero `is_staff()` lo acepta. Inconsistencia que puede llevar a confusión. Menor impacto directo, pero señal de deuda técnica.

---

**[BAJO] `VITE_RESEND_API_KEY` en `.env`**  
Aunque actualmente no se usa en el código del navegador (el email va por Edge Function), la clave está en `.env` y podría accidentalmente importarse en algún componente futuro. Recomendable eliminarla del `.env` del frontend.

---

**[BAJO] IP del paciente obtenida desde servicio de terceros**  
```js
const res = await fetch("https://api.ipify.org?format=json");
```
Durante el proceso de firma se hace una petición a `api.ipify.org` (servicio americano) para obtener la IP. Esto tiene implicaciones RGPD (ver sección 3) y un punto de fallo: si ipify está caído, la firma continúa con `ip_address = null`.

---

**[BAJO] Sin Content Security Policy (CSP)**  
No hay cabeceras de seguridad configuradas en `vercel.json`. Sin CSP, XSS tiene más superficie de ataque.

**Solución:** Añadir a `vercel.json`:
```json
"headers": [{
  "source": "/(.*)",
  "headers": [
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "Content-Security-Policy", "value": "default-src 'self' *.supabase.co; script-src 'self' 'unsafe-inline'" }
  ]
}]
```

---

**[BAJO] Posible XSS en templates de email**  
Los templates HTML de email construyen HTML con interpolación directa:
```js
${heading(`Bienvenido/a, ${patientName}`)}
```
Si `patientName` contiene HTML (ej. `<img onerror="...">`), se inyecta en el email. El riesgo es bajo (un staff malicioso podría enviar HTML en el nombre), pero debería sanitizarse con una función `escapeHtml()`.

---

### Resumen de Seguridad

| Área | Estado |
|---|---|
| RLS en base de datos | ✅ Correcto |
| Funciones SECURITY DEFINER | ✅ Correcto |
| Storage privado con signed URLs | ✅ Correcto |
| Email server-side (no API key en browser) | ✅ Correcto |
| Detección de rol por email (fragil) | ❌ Crítico |
| Edge Function sin JWT verification | ⚠️ Medio |
| CORS abierto | ⚠️ Medio |
| Sin CSP headers | ⚠️ Bajo |
| Sin rate limiting en email | ⚠️ Bajo |

---

## 3. CUMPLIMIENTO LEGAL Y RGPD

### Marco legal aplicable
- **RGPD** (Reglamento UE 2016/679) — Protección de datos personales
- **LOPDGDD** (Ley Orgánica 3/2018) — Adaptación española del RGPD
- **Ley 41/2002** — Autonomía del paciente y documentación clínica
- **Reglamento eIDAS** (UE 910/2014) — Firma electrónica
- **Real Decreto 1720/2007** — Medidas de seguridad para datos de salud (nivel ALTO)

---

### ✅ Lo que está bien

**Retención de datos (art. 5 RGPD + Ley 41/2002)**  
Se implementa soft-archive en lugar de borrado. Los datos médicos de pacientes no se eliminan nunca, lo cual cumple el requisito de conservación mínima de 5 años de la Ley 41/2002 y los plazos autonómicos catalanes (hasta 10 años para historia clínica completa).

**Trazabilidad de firma electrónica**  
Cada firma almacena: `signed_at`, `signature_data` (imagen PNG), `ip_address`, `user_agent`. Esto aporta evidencia forense básica.

**Referencia a eIDAS en los documentos**  
El PDF firmado incluye la mención `"Validez legal conforme al Reglamento (UE) 910/2014 (eIDAS)"`. Correcto como declaración, aunque ver limitaciones abajo.

---

### ❌ Problemas legales graves — Sin estos elementos no se puede lanzar con pacientes reales

**[CRITICO] Sin Política de Privacidad**  
El portal recoge datos personales de salud (categoría especial, Art. 9 RGPD) sin mostrar ninguna política de privacidad. Esto es una infracción directa del Art. 13 RGPD (información al interesado). Las multas de la AEPD pueden llegar a 20 millones de euros o el 4% de la facturación global.

**Debe incluir obligatoriamente:**
- Identidad y datos del responsable del tratamiento
- Finalidad y base jurídica del tratamiento
- Destinatarios de los datos (Supabase/Vercel como encargados)
- Derechos del interesado (acceso, rectificación, supresión, portabilidad, oposición)
- Plazo de conservación de los datos

---

**[CRITICO] Sin banner de cookies**  
Si el portal usa cookies (Supabase Auth las utiliza para persistir sesión), se requiere información y en algunos casos consentimiento bajo la LSSI y las directrices de la AEPD.

---

**[CRITICO] Sin mecanismo de ejercicio de derechos RGPD**  
El RGPD exige atender solicitudes de:
- **Art. 15** — Derecho de acceso (obtener copia de todos sus datos)
- **Art. 17** — Derecho al olvido (solicitar borrado cuando proceda legalmente)
- **Art. 20** — Portabilidad de datos (exportar en formato legible por máquina)

El portal actualmente no tiene ninguna vía para que el paciente ejerza estos derechos. El soft-archive da cumplimiento interno a la retención, pero no facilita al paciente obtener sus datos ni solicitar su eliminación cuando la ley lo permita.

---

**[CRITICO] Firma electrónica: tipo "simple", no "avanzada"**  
La firma del portal es un **trazo de canvas** (imagen PNG) almacenada como base64. Según eIDAS, esto clasifica como **Firma Electrónica Simple (FES)**, el nivel más bajo.

Para consentimientos informados médicos en España, la AEPD y el Consejo de Colegios de Médicos recomiendan al menos **Firma Electrónica Avanzada (FEA)**, que requiere:
1. Estar vinculada inequívocamente al firmante
2. Permitir identificar al firmante
3. Haber sido creada con datos que el firmante puede usar bajo su control exclusivo
4. Ser detectable cualquier modificación posterior

El trazo PNG no cumple los puntos 3 y 4. En caso de litigio, su valor probatorio puede ser impugnado. Se recomienda integrar un servicio de firma avanzada (DocuSign, Signaturit, o Viafirma —este último español y reconocido por hospitales—).

---

**[ALTO] Transferencia de datos a terceros sin DPA**  
Los datos de pacientes se procesan en:
- **Supabase** (infraestructura en AWS us-east-1 por defecto)
- **Vercel** (CDN global)
- **Resend** (email, servidores en EE.UU.)
- **api.ipify.org** (servicio americano, IP del paciente enviada durante firma)

Para las transferencias fuera del EEE se requieren **Cláusulas Contractuales Tipo (SCCs)** o verificar que el proveedor cuenta con mecanismos adecuados. Supabase y Vercel tienen DPAs disponibles, pero deben firmarse explícitamente. `api.ipify.org` no tiene DPA publicado y debe eliminarse.

---

**[ALTO] Sin registro de actividades de tratamiento (Art. 30 RGPD)**  
Las organizaciones que tratan datos de salud deben mantener un registro formal de las operaciones de tratamiento. Este es un documento interno (no en el software), pero es obligatorio.

---

**[MEDIO] Consentimiento para comunicaciones comerciales/recordatorios**  
Los emails de recordatorio de citas, pagos y firmas se envían sin que el paciente haya dado consentimiento explícito para comunicaciones electrónicas (LSSI Art. 21). Aunque los emails transaccionales relacionados con el servicio pueden ampararse en la ejecución del contrato, debe documentarse la base jurídica de cada tipo de comunicación.

---

**[MEDIO] Sin registro de acceso a historia clínica**  
La Ley 41/2002 y las normativas autonómicas catalanas exigen registrar quién accede a la historia clínica de un paciente. La tabla `document_access_log` registra accesos a documentos firmados, pero no registra quién consultó el expediente completo del paciente (página PacienteDetalle).

---

### Resumen Legal

| Requisito | Estado |
|---|---|
| Retención datos (Ley 41/2002) | ✅ Soft-archive implementado |
| Trazabilidad de firma | ✅ IP + UA + timestamp almacenados |
| Política de Privacidad (Art. 13 RGPD) | ❌ No existe |
| Banner de cookies (LSSI) | ❌ No existe |
| Ejercicio de derechos RGPD | ❌ No implementado |
| Nivel firma electrónica (eIDAS) | ⚠️ Simple, no Avanzada |
| DPA con Supabase/Vercel/Resend | ⚠️ Pendiente de firmar |
| Transferencia datos fuera EEE | ⚠️ Sin SCCs documentadas |
| Registro actividades tratamiento | ❌ No existe (doc. interna) |
| Acceso historia clínica auditado | ⚠️ Parcial (solo firmas) |

---

## 4. ANÁLISIS FUNCIONAL

### ✅ Funcionalidades reales y operativas

| Módulo | Estado | Notas |
|---|---|---|
| Autenticación (login/logout) | ✅ Funciona | Supabase Auth JWT |
| Gestión de pacientes (CRUD) | ✅ Funciona | Crear, editar, archivar |
| Portal paciente — Mis Citas | ✅ Funciona | Ver, confirmar, cancelar |
| Portal paciente — Firmar documentos | ✅ Funciona | Canvas + PDF overlay |
| Portal paciente — Mis Pagos | ✅ Funciona | Solo lectura |
| Portal paciente — Mis Documentos | ✅ Funciona | Descarga con signed URL |
| Agenda de citas (admin) | ✅ Funciona | Vista semanal + cambio de estado |
| Gestión de pagos (admin) | ✅ Funciona | Crear, marcar como pagado |
| Firmas pendientes (admin) | ✅ Funciona | Crear, enviar recordatorio, ver PDF |
| Panel de control (admin) | ✅ Funciona | Datos reales de Supabase |
| Emails automáticos (7 tipos) | ✅ Funciona | Via Edge Function + Resend |
| Archivar paciente | ✅ Funciona | Soft-archive con restauración |
| Dashboard con alertas | ✅ Funciona | Pagos vencidos, citas sin confirmar |

---

### ⚠️ Solo visual / No conectado a datos reales

| Módulo | Estado | Problema |
|---|---|---|
| **Página Equipo** | ❌ Mock | Carga desde `mockData.js`, no desde BD. Los datos del equipo son estáticos y hardcodeados |
| **Recordatorios automáticos de cita** | ❌ No automatizado | `sendAppointmentReminder()` existe en `email.js` pero nada lo llama automáticamente 24h antes. Solo existe si alguien lo invoca manualmente |
| **Solicitud de cita por paciente** | ❌ No implementado | Desde MisCitas el paciente puede confirmar/cancelar pero NO puede solicitar una nueva cita por sí mismo |
| **Procesamiento de pagos** | ❌ No implementado | Solo tracking de estado. No hay integración con pasarela de pago (Stripe, Redsys, etc.) |
| **Mi Perfil (paciente)** | ⚠️ Verificar | Carga datos de perfil pero no está claro si el paciente puede editar sus datos |

---

### ❌ Funcionalidades faltantes para uso con pacientes reales

**Alta prioridad:**

1. **Política de Privacidad** — Página obligatoria antes de recoger ningún dato
2. **Consentimiento de cookies** — Banner RGPD/LSSI en el primer acceso
3. **Recordatorios automáticos de cita** — Actualmente la función existe pero requiere un cron job o trigger de Supabase para ejecutarse 24h antes
4. **Solicitud de cita por paciente** — El flujo básico de una clínica
5. **Gestión de contraseña del paciente** — El welcome email dice "use olvido de contraseña" pero el flujo debe estar validado
6. **Página Equipo conectada a BD** — Actualmente usa datos ficticios (`mockData.js`)

**Media prioridad:**

7. **Paginación** — La lista de pacientes y pagos cargará toda la tabla sin límite. Con 500+ pacientes habrá problemas de rendimiento
8. **Exportación de datos del paciente** (derecho RGPD de portabilidad)
9. **Confirmación de email** — Al crear paciente, verificar que el email existe antes de dar acceso
10. **Notificación cuando se añade un documento** — El paciente no sabe que tiene un PDF nuevo para revisar hasta que entra al portal
11. **Log de acceso a expediente** — Registrar en `document_access_log` cuando staff accede a PacienteDetalle

---

### Recomendaciones de mejora funcional

- **Eliminar mockData.js** y conectar la página Equipo a la tabla `profiles` con `role IN ('doctor', 'staff', 'admin')`
- **Añadir Supabase scheduled function** (pg_cron) para enviar recordatorios de cita automáticamente a las 9:00 del día anterior
- **Añadir paginación** con `LIMIT / OFFSET` en `get_all_patients()` y `get_all_payments()`
- **Integrar pasarela de pago** — Redsys (bancos españoles) o Stripe (más sencillo de integrar)
- **Añadir `react-error-boundary`** — Actualmente un error en un componente puede dejar la pantalla en blanco sin mensaje de error visible

---

## 5. PUNTUACIÓN GLOBAL

### Calificaciones por área

| Área | Puntuación | Justificación |
|---|---|---|
| **Seguridad** | **6 / 10** | RLS y SECURITY DEFINER son excelentes. Lastra: rol por email (crítico), Edge Function sin JWT, sin CSP |
| **Legal / RGPD** | **3 / 10** | Soft-delete y trazabilidad de firma son lo único correcto. Faltan: privacidad, cookies, derechos, firma avanzada |
| **Funcionalidad** | **7 / 10** | El core funciona bien. Faltan: recordatorios automáticos, solicitud de cita, pagos reales, equipo mock |
| **Calidad de código** | **7 / 10** | Arquitectura limpia, SQL bien organizado. Lastra: sin TypeScript, sin tests, bundle de 1MB sin code-splitting |

### Puntuación global: **5.75 / 10** — No apto para producción con pacientes reales

---

## 6. ISSUES CRÍTICOS A RESOLVER ANTES DEL LANZAMIENTO

Por orden de prioridad:

### Nivel 1 — BLOQUEANTE (ilegal sin esto)

| # | Issue | Acción |
|---|---|---|
| C1 | Sin Política de Privacidad | Crear página `/privacidad` con texto legal. Contratar asesor RGPD para redacción |
| C2 | Sin banner de cookies | Implementar CookieConsent antes del primer render |
| C3 | Sin mecanismo de derechos RGPD | Añadir formulario de solicitud (acceso, borrado, portabilidad) |
| C4 | Firma electrónica tipo Simple | Evaluar Signaturit o Viafirma para firma Avanzada |
| C5 | Datos enviados a api.ipify.org sin DPA | Eliminar llamada a ipify; usar cabecera `X-Forwarded-For` en Edge Function |

### Nivel 2 — SEGURIDAD ALTA

| # | Issue | Acción |
|---|---|---|
| S1 | Rol derivado de email en cliente | Leer rol siempre desde BD; `RequireStaff` debe esperar al perfil enriquecido |
| S2 | Edge Function sin JWT | Reactivar `--verify-jwt`; pasar token en cabecera desde el cliente |
| S3 | CORS `*` en Edge Function | Restringir a dominio de producción |
| S4 | Sin Content-Security-Policy | Añadir headers en `vercel.json` |

### Nivel 3 — FUNCIONALIDAD IMPORTANTE

| # | Issue | Acción |
|---|---|---|
| F1 | Página Equipo con datos mock | Conectar a `profiles` de Supabase |
| F2 | Sin recordatorios automáticos | Implementar pg_cron o Supabase Edge Function schedulada |
| F3 | Sin solicitud de cita por paciente | Implementar formulario de solicitud |
| F4 | Sin paginación | Añadir LIMIT/OFFSET a funciones SQL y UI de paginación |
| F5 | Sin pasarela de pago | Integrar Stripe o Redsys |

### Nivel 4 — CALIDAD DE CÓDIGO

| # | Issue | Acción |
|---|---|---|
| Q1 | Sin TypeScript | Migrar a `.tsx` progresivamente |
| Q2 | Sin tests | Añadir Vitest + Testing Library para lógica crítica |
| Q3 | Bundle 1MB sin code-splitting | Añadir `React.lazy()` por ruta |
| Q4 | Sin error boundaries | Añadir `react-error-boundary` |

---

## 7. CONCLUSIÓN

El proyecto tiene una **base técnica sólida**: la arquitectura Supabase con RLS + SECURITY DEFINER es la elección correcta para datos médicos, el diseño visual es profesional, y el conjunto de funcionalidades core (citas, pagos, consentimientos, emails) funciona correctamente.

Sin embargo, **no puede lanzarse con pacientes reales en su estado actual** por dos razones fundamentales:

1. **Ilegalidad**: Operar un portal médico sin Política de Privacidad, banner de cookies y mecanismo de ejercicio de derechos RGPD es una infracción directa sancionable por la AEPD con multas de hasta 20M€.

2. **Seguridad media-alta**: El rol de administrador puede obtenerse por cualquiera con un email `@clinica-cotten.com`, y la Edge Function de email no requiere autenticación, permitiendo abuso.

**Tiempo estimado para alcanzar producción legal y segura:** 3-4 semanas de desarrollo adicional, más 1-2 semanas para revisión legal con asesor especializado en RGPD sanitario.

---

*Análisis generado con Claude Sonnet 4.6 · Clínica Cotten Barcelona · Mayo 2026*