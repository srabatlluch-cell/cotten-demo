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
    const anonKey        = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { email, full_name, role, phone, specialty } = await req.json();
    if (!email || !full_name || !role) return json({ error: "email, full_name y role son obligatorios" }, 400);

    const normalizedEmail = email.toLowerCase().trim();

    // ── Step 1: find or create the auth user ──────────────────────────────────
    const { data: existingId } = await adminClient.rpc(
      "admin_find_auth_user_by_email",
      { p_email: normalizedEmail }
    );

    let userId: string;

    if (existingId) {
      console.log("[invite-staff] reusing existing auth user:", existingId);
      // Confirm email so the account is usable
      await adminClient.auth.admin.updateUserById(existingId, { email_confirm: true });
      userId = existingId;
    } else {
      // Clean up any stale orphaned data first
      await adminClient.rpc("admin_force_delete_auth_by_email", { p_email: normalizedEmail });

      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        normalizedEmail,
        { redirectTo: `${PORTAL_URL}/acceso-personal` }
      );
      if (inviteErr) {
        console.error("[invite-staff] inviteUserByEmail error:", inviteErr.message);
        return json({ error: inviteErr.message }, 400);
      }
      userId = inviteData.user.id;
      console.log("[invite-staff] new user invited:", userId);
    }

    // ── Step 2: upsert profile ────────────────────────────────────────────────
    const { error: profileErr } = await adminClient.rpc("admin_upsert_staff_profile", {
      p_id:        userId,
      p_full_name: full_name,
      p_email:     normalizedEmail,
      p_role:      role,
      p_phone:     phone     || null,
      p_specialty: specialty || null,
    });
    if (profileErr) {
      console.error("[invite-staff] profile upsert error:", profileErr.message);
      return json({ error: profileErr.message }, 500);
    }

    // ── Step 3: send access email via Resend ──────────────────────────────────
    // Try to get a one-click magic link via GoTrue REST. If that fails,
    // fall back to a "forgot password" flow email — this always works.
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromAddr  = Deno.env.get("RESEND_FROM") ?? "Clínica Cotten <onboarding@resend.dev>";
    let emailWarning: string | null = null;

    // Attempt magic link generation (non-fatal if it fails)
    let magicLink: string | null = null;
    try {
      const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate-link`, {
        method: "POST",
        headers: {
          "apikey":        serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          type:        "magiclink",
          email:       normalizedEmail,
          redirect_to: `${PORTAL_URL}/acceso-personal`,
        }),
      });
      const linkJson = await linkRes.json();
      console.log("[invite-staff] generate-link status:", linkRes.status, "link:", linkJson.action_link?.slice(0, 80) ?? JSON.stringify(linkJson).slice(0, 120));
      if (linkRes.ok && linkJson.action_link) magicLink = linkJson.action_link;
    } catch (e) {
      console.warn("[invite-staff] generate-link threw:", e);
    }

    // Build email: one-click button if magic link available, otherwise "set password" instructions
    const ctaHtml = magicLink
      ? `<div style="text-align:center;margin:32px 0;">
          <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#1a2744,#243256);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
            Acceder al portal →
          </a>
         </div>
         <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;">
           Este enlace es válido durante 24 horas y es de un solo uso.
         </p>`
      : `<div style="text-align:center;margin:32px 0;">
          <a href="${PORTAL_URL}/acceso-personal" style="display:inline-block;background:linear-gradient(135deg,#1a2744,#243256);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
            Ir al portal →
          </a>
         </div>
         <p style="color:#374151;font-size:14px;line-height:1.7;margin:16px 0 0;">
           En la página de acceso, haz clic en <strong>"¿Olvidaste tu contraseña?"</strong>
           e introduce tu email <strong>${normalizedEmail}</strong> para establecer tu contraseña.
         </p>`;

    if (!resendKey) {
      emailWarning = "RESEND_API_KEY no configurado en la función.";
      console.error("[invite-staff] RESEND_API_KEY missing");
    } else {
      const emailHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e0d8;">
  <tr><td style="background:linear-gradient(135deg,#1a2744,#243256);padding:32px 40px;">
    <p style="color:#c9a96e;font-size:13px;letter-spacing:2px;margin:0 0 8px;">CLÍNICA COTTEN</p>
    <h1 style="color:#fff;font-size:22px;margin:0;font-weight:normal;">Bienvenido al equipo</h1>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hola <strong>${full_name}</strong>,
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px;">
      Has sido añadido al equipo de Clínica Cotten como <strong>${role}</strong>.
      Ya puedes acceder al portal de gestión.
    </p>
    ${ctaHtml}
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
        body: JSON.stringify({ from: fromAddr, to: normalizedEmail, subject: "Acceso al Portal — Clínica Cotten", html: emailHtml }),
      });
      const resendBody = await resendRes.json();
      console.log("[invite-staff] Resend response:", resendRes.status, JSON.stringify(resendBody));
      if (!resendRes.ok) {
        emailWarning = `Resend error ${resendRes.status}: ${JSON.stringify(resendBody)}`;
      }
    }

    return json({ ok: true, id: userId, emailWarning, magicLinkGenerated: !!magicLink });

  } catch (err) {
    console.error("[invite-staff] unexpected error:", err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});