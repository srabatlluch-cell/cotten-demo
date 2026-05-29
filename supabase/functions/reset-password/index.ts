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

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey      = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromAddr       = Deno.env.get("RESEND_FROM") ?? "Clínica Cotten <onboarding@resend.dev>";

    const { email } = await req.json();
    if (!email) return json({ error: "email es obligatorio" }, 400);
    const normalizedEmail = email.toLowerCase().trim();

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify the user exists and has a staff profile
    const { data: userId } = await adminClient.rpc("admin_find_auth_user_by_email", { p_email: normalizedEmail });
    if (!userId) {
      // Return ok anyway to avoid email enumeration
      return json({ ok: true });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .single();

    const staffRoles = ["admin", "doctor", "staff", "receptionist"];
    if (!profile || !staffRoles.includes(profile.role)) {
      return json({ ok: true }); // Don't reveal whether account exists
    }

    // Generate a recovery link via GoTrue admin API
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate-link`, {
      method: "POST",
      headers: {
        "apikey":        serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        type:        "recovery",
        email:       normalizedEmail,
        redirect_to: `${PORTAL_URL}/nueva-contrasena`,
      }),
    });

    const linkJson = await linkRes.json();
    console.log("[reset-password] generate-link status:", linkRes.status, JSON.stringify(linkJson).slice(0, 120));

    if (!linkRes.ok || !linkJson.action_link) {
      console.error("[reset-password] could not generate recovery link:", JSON.stringify(linkJson));
      return json({ error: "No se pudo generar el enlace de recuperación." }, 500);
    }

    const recoveryLink = linkJson.action_link;

    if (!resendKey) {
      console.error("[reset-password] RESEND_API_KEY missing");
      return json({ error: "Configuración de email incompleta." }, 500);
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
      Este enlace es válido durante 1 hora y es de un solo uso. Si no solicitaste este cambio, puedes ignorar este correo.
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
      return json({ error: `Error enviando email: ${JSON.stringify(resendBody)}` }, 500);
    }

    return json({ ok: true });

  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});