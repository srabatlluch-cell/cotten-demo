import { supabase } from "./supabase";

const PORTAL_URL = "https://cotten-demo.vercel.app";

// ─── base send (via Supabase Edge Function to avoid CORS) ─────────────────────

async function send({ to, subject, html }) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, html },
  });
  if (error) throw error;
  return data;
}

// ─── shared template ──────────────────────────────────────────────────────────

function layout({ preheader = "", body }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Clínica Cotten</title>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:48px;height:48px;background:#1a2744;border-radius:12px;text-align:center;vertical-align:middle;">
                    <span style="color:#c9a96e;font-size:20px;font-weight:700;letter-spacing:1px;line-height:48px;">CC</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:18px;font-weight:700;color:#1a2744;letter-spacing:0.5px;">Clínica Cotten</span><br/>
                    <span style="font-size:12px;color:#9ca3af;">Barcelona · Odontología Avanzada</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e0d8;overflow:hidden;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 8px;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
                Clínica Cotten · Passeig de Gràcia · Barcelona
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${PORTAL_URL}" style="color:#c9a96e;text-decoration:none;">Portal del Paciente</a>
                &nbsp;·&nbsp;
                <a href="${PORTAL_URL}" style="color:#9ca3af;text-decoration:none;">Darse de baja</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function accentBar() {
  return `<tr><td style="height:4px;background:linear-gradient(90deg,#1a2744,#c9a96e);"></td></tr>`;
}

function heading(text) {
  return `<tr><td style="padding:32px 36px 8px;">
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#1a2744;">${text}</h1>
  </td></tr>`;
}

function intro(html) {
  return `<tr><td style="padding:8px 36px 24px;font-size:15px;line-height:1.6;color:#374151;">${html}</td></tr>`;
}

function infoBox(rows) {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f0ea;font-size:13px;color:#9ca3af;width:140px;">${label}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f0ea;font-size:13px;color:#1a2744;font-weight:600;">${value}</td>
        </tr>`
    )
    .join("");
  return `<tr><td style="padding:0 36px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f3f0ea;">${cells}</table>
  </td></tr>`;
}

function ctaButton(label, href) {
  return `<tr><td style="padding:0 36px 32px;text-align:center;">
    <a href="${href}" style="display:inline-block;background:#1a2744;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">${label}</a>
  </td></tr>`;
}

function divider() {
  return `<tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #f3f0ea;margin:0 0 24px;"/></td></tr>`;
}

function note(html) {
  return `<tr><td style="padding:0 36px 28px;font-size:12px;color:#9ca3af;line-height:1.6;">${html}</td></tr>`;
}

// ─── 1. Welcome email ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ to, patientName }) {
  const html = layout({
    preheader: "Bienvenido/a a su portal de paciente de Clínica Cotten.",
    body: `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${accentBar()}
        ${heading(`Bienvenido/a, ${patientName}`)}
        ${intro(`Nos complace darle acceso a su <strong>portal de paciente</strong> de Clínica Cotten. Desde aquí podrá consultar sus citas, documentos y pagos de forma segura.`)}
        ${infoBox([
          ["Correo electrónico", to],
        ])}
        <tr><td style="padding:0 36px 24px;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;line-height:1.6;">
            Para acceder por primera vez, haga clic en el botón de abajo y utilice la opción <strong>"¿Olvidó su contraseña?"</strong> para crear su contraseña personal.
          </div>
        </td></tr>
        ${ctaButton("Crear mi contraseña y acceder", PORTAL_URL)}
        ${divider()}
        ${note("Si no ha solicitado esta cuenta, puede ignorar este mensaje.")}
      </table>`,
  });
  return send({ to, subject: "Bienvenido/a a Clínica Cotten", html });
}

// ─── 2. Appointment reminder (24 h before) ───────────────────────────────────

export async function sendAppointmentReminder({
  to,
  patientName,
  date,
  time,
  doctor,
  treatment,
  room,
}) {
  const html = layout({
    preheader: `Recordatorio: tiene una cita mañana a las ${time}.`,
    body: `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${accentBar()}
        ${heading("Recordatorio de cita")}
        ${intro(`Estimado/a <strong>${patientName}</strong>, le recordamos que mañana tiene una cita en Clínica Cotten.`)}
        ${infoBox([
          ["Fecha", date],
          ["Hora", time],
          ["Doctor/a", doctor],
          ["Tratamiento", treatment],
          ...(room ? [["Consulta", room]] : []),
        ])}
        ${ctaButton("Ver mis citas", `${PORTAL_URL}/mis-citas`)}
        ${divider()}
        ${note("Si necesita cancelar o cambiar su cita, contacte con nosotros con al menos 24 horas de antelación.")}
      </table>`,
  });
  return send({ to, subject: "Recordatorio de cita - Clínica Cotten", html });
}

// ─── 3. Appointment confirmation ─────────────────────────────────────────────

export async function sendAppointmentConfirmation({
  to,
  patientName,
  date,
  time,
  doctor,
  treatment,
}) {
  const html = layout({
    preheader: `Su cita del ${date} a las ${time} ha sido confirmada.`,
    body: `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${accentBar()}
        ${heading("Cita confirmada")}
        ${intro(`Estimado/a <strong>${patientName}</strong>, su cita en Clínica Cotten ha sido <strong style="color:#15803d;">confirmada</strong>.`)}
        ${infoBox([
          ["Fecha", date],
          ["Hora", time],
          ["Doctor/a", doctor],
          ["Tratamiento", treatment],
        ])}
        ${ctaButton("Ver mis citas", `${PORTAL_URL}/mis-citas`)}
        ${divider()}
        ${note("Le recordaremos la cita 24 horas antes. Si necesita hacer cambios, contáctenos con antelación.")}
      </table>`,
  });
  return send({ to, subject: "Cita confirmada - Clínica Cotten", html });
}

// ─── 4. Appointment cancellation ─────────────────────────────────────────────

export async function sendAppointmentCancellation({
  to,
  patientName,
  date,
  time,
  treatment,
}) {
  const html = layout({
    preheader: `Su cita del ${date} a las ${time} ha sido cancelada.`,
    body: `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${accentBar()}
        ${heading("Cita cancelada")}
        ${intro(`Estimado/a <strong>${patientName}</strong>, le informamos de que su cita en Clínica Cotten ha sido <strong style="color:#dc2626;">cancelada</strong>.`)}
        ${infoBox([
          ["Fecha", date],
          ["Hora", time],
          ["Tratamiento", treatment],
        ])}
        ${ctaButton("Solicitar nueva cita", `${PORTAL_URL}/mis-citas`)}
        ${divider()}
        ${note("Si desea concertar una nueva cita, puede hacerlo desde su portal de paciente o llamándonos directamente.")}
      </table>`,
  });
  return send({ to, subject: "Cita cancelada - Clínica Cotten", html });
}

// ─── 5. Visit thank-you ───────────────────────────────────────────────────────

export async function sendVisitThankYou({ to, patientName, treatment, doctor }) {
  const html = layout({
    preheader: "Gracias por su visita a Clínica Cotten.",
    body: `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${accentBar()}
        ${heading(`Gracias por su visita, ${patientName}`)}
        ${intro(`Ha sido un placer atenderle hoy en Clínica Cotten. Esperamos que su experiencia haya sido satisfactoria.`)}
        ${infoBox([
          ["Tratamiento", treatment],
          ...(doctor ? [["Atendido por", doctor]] : []),
        ])}
        <tr><td style="padding:0 36px 24px;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#92400e;">&#11088; ¿Le ha gustado su visita?</p>
            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
              Su opinión nos ayuda a mejorar. Si tiene un momento, agradecemos mucho que comparta su experiencia con nosotros.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:0 36px 24px;font-size:13px;color:#374151;line-height:1.6;">
          Recuerde que es recomendable realizar una revisión de rutina cada 6 meses. Puede solicitar su próxima cita cuando lo desee desde su portal de paciente.
        </td></tr>
        ${ctaButton("Solicitar próxima cita", `${PORTAL_URL}/mis-citas`)}
        ${divider()}
        ${note("Ante cualquier duda o molestia tras la visita, no dude en contactarnos. Estamos a su disposición.")}
      </table>`,
  });
  return send({ to, subject: "Gracias por su visita - Clínica Cotten", html });
}

// ─── 6. Signature reminder ────────────────────────────────────────────────────

export async function sendSignatureReminder({ to, patientName, documentTitle }) {
  const html = layout({
    preheader: `Tiene un documento pendiente de firma: ${documentTitle}.`,
    body: `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${accentBar()}
        ${heading("Documento pendiente de firma")}
        ${intro(`Estimado/a <strong>${patientName}</strong>, tiene un documento en su portal que requiere su firma electrónica antes de continuar con su tratamiento.`)}
        ${infoBox([["Documento", documentTitle]])}
        <tr>
          <td style="padding:0 36px 12px;">
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;line-height:1.6;">
              &#9888;&#65039; Este documento requiere su firma para poder continuar con el tratamiento planificado.
            </div>
          </td>
        </tr>
        ${ctaButton("Firmar documento ahora", `${PORTAL_URL}/firmar-documentos`)}
        ${divider()}
        ${note("La firma es completamente electrónica y segura. Solo le llevará un momento desde cualquier dispositivo.")}
      </table>`,
  });
  return send({ to, subject: "Documento pendiente de firma - Clínica Cotten", html });
}

// ─── 7. Payment reminder ──────────────────────────────────────────────────────

export async function sendPaymentReminder({
  to,
  patientName,
  concept,
  amount,
  dueDate,
}) {
  const formattedAmount =
    typeof amount === "number"
      ? amount.toLocaleString("es-ES", { minimumFractionDigits: 2 }) + " €"
      : amount;
  const html = layout({
    preheader: `Recordatorio de pago pendiente: ${concept} — ${formattedAmount}.`,
    body: `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${accentBar()}
        ${heading("Recordatorio de pago")}
        ${intro(`Estimado/a <strong>${patientName}</strong>, le recordamos que tiene un pago pendiente en Clínica Cotten.`)}
        ${infoBox([
          ["Concepto", concept],
          ["Importe", `<span style="color:#c9a96e;font-size:15px;">${formattedAmount}</span>`],
          ["Vencimiento", dueDate],
        ])}
        ${ctaButton("Ver mis pagos", `${PORTAL_URL}/mis-pagos`)}
        ${divider()}
        ${note("Si ya ha realizado el pago, ignore este mensaje. Para cualquier consulta sobre facturación, no dude en contactarnos.")}
      </table>`,
  });
  return send({ to, subject: "Pago pendiente - Clínica Cotten", html });
}