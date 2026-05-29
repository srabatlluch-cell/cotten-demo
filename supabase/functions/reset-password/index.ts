// @ts-nocheck — Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PORTAL_URL = "https://cotten-demo.vercel.app";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey      = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromAddr       = Deno.env.get("RESEND_FROM") ?? "Clínica Cotten <onboarding@resend.dev>";

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let body: { email?: string };
    try {
      body = await req.json();
    } catch {
      return respond({ error: "Cuerpo de solicitud inválido." }, 400);
    }

    const { email } = body;
    if (!email) return respond({ error: "email es obligatorio" }, 400);
    const normalizedEmail = email.toLowerCase().trim();

    // ── Verify user exists in auth ─────────────────────────────────────────
    const { data: userId, error: findErr } = await adminClient.rpc(
      "admin_find_auth_user_by_email",
      { p_email: normalizedEmail }
    );

    if (findErr) {
      console.error("[reset-password] admin_find_auth_user_by_email error:", findErr.message);
    }

    if (!userId) {
      console.log("[reset-password] user not found, returning ok silently");
      return respond({ ok: true }); // Don't reveal whether account exists
    }

    // ── Verify staff profile ───────────────────────────────────────────────
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .single();

    if (profileErr) {
      console.error("[reset-password] profile fetch error:", profileErr.message);
    }

    const staffRoles = ["admin", "doctor", "staff", "receptionist"];
    if (!profile || !staffRoles.includes(profile.role)) {
      console.log("[reset-password] no staff profile found, returning ok silently");
      return respond({ ok: true }); // Don't reveal whether account exists
    }

    // ── Ensure email is confirmed so generateLink works ────────────────────
    const { error: confirmErr } = await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (confirmErr) {
      console.warn("[reset-password] email confirm warning:", confirmErr.message);
    }

    // ── Generate recovery link via SDK ─────────────────────────────────────
    // No custom redirectTo — use the Supabase site URL to avoid the
    // "Redirect URL not allowed" error. The app detects PASSWORD_RECOVERY
    // events globally and navigates to /nueva-contrasena automatically.
    let { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
    });

    // If generateLink failed, the user's auth.identities record was likely
    // created via direct SQL (admin_create_patient) and is missing fields
    // GoTrue requires. Fix the identity in-place and retry.
    if (linkErr || !linkData?.properties?.action_link) {
      console.warn("[reset-password] generateLink failed, attempting identity repair:", linkErr?.message ?? "no action_link");

      const { error: fixErr } = await adminClient.rpc("admin_fix_auth_identity", {
        p_user_id: userId,
        p_email:   normalizedEmail,
      });

      if (fixErr) {
        console.error("[reset-password] identity repair failed:", fixErr.message);
        return respond({ error: "No se pudo preparar la cuenta. Contacta con el administrador." }, 500);
      }

      const retry = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
      });
      linkData = retry.data;
      linkErr  = retry.error;
    }

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("[reset-password] generateLink still failing after repair:", linkErr?.message ?? "no action_link");
      return respond({ error: "No se pudo generar el enlace de recuperación. Contacta con el administrador." }, 500);
    }

    const recoveryLink = linkData.properties.action_link;
    console.log("[reset-password] recovery link generated for:", normalizedEmail);

    // ── Send via Resend ────────────────────────────────────────────────────
    if (!resendKey) {
      console.error("[reset-password] RESEND_API_KEY missing");
      return respond({ error: "Configuración de email incompleta." }, 500);
    }

    const emailHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e0d8;">
  <tr><td style="background:linear-gradient(135deg,#1a2744,#243256);padding:32px 40px;">
    <p style="color:#c9a96e;font-size:13px;letter-spacing:2px;margin:0 0 8px;">CLÍNICA COTTEN</p>
    <h1 style="color:#fff;font-size:22px;margin:0;font-weight:normal;">Restablecer contraseña</h1>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hola <strong>${profile.full_name ?? normalizedEmail}</strong>,
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el portal de Clínica Cotten.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${recoveryLink}" style="display:inline-block;background:linear-gradient(135deg,#1a2744,#243256);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Restablecer contraseña →
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;">
      Este enlace es válido durante 1 hora y es de un solo uso. Si no solicitaste este cambio, ignora este correo.
    </p>
  </td></tr>
  <tr><td style="background:#faf9f7;padding:20px 40px;text-align:center;border-top:1px solid #f3f0ea;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">Clínica Cotten · Portal de Gestión</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    fromAddr,
        to:      normalizedEmail,
        subject: "Restablecer contraseña — Clínica Cotten",
        html:    emailHtml,
      }),
    });

    const resendBody = await resendRes.json();
    console.log("[reset-password] Resend response:", resendRes.status, JSON.stringify(resendBody));

    if (!resendRes.ok) {
      return respond({ error: `Error enviando email: ${resendBody?.message ?? resendRes.status}` }, 500);
    }

    return respond({ ok: true });

  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
    return respond({ error: String(err?.message ?? err) }, 500);
  }
});