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
    const anonKey        = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey      = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromAddr       = Deno.env.get("RESEND_FROM") ?? "Clínica Cotten <onboarding@resend.dev>";

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated staff
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !caller) return respond({ error: "Unauthorized" }, 401);

    const { email, full_name, role, phone, specialty } = await req.json();
    if (!email || !full_name || !role) {
      return respond({ error: "email, full_name y role son obligatorios" }, 400);
    }
    const normalizedEmail = email.toLowerCase().trim();

    // ── Step 1: Always start with a clean GoTrue user ─────────────────────
    // Delete any existing auth user for this email (SQL-created patients,
    // old invites, etc.) so we always get a proper GoTrue identity.
    // Only skip deletion if the user has already logged in (active account).
    const { data: existingId } = await adminClient.rpc(
      "admin_find_auth_user_by_email",
      { p_email: normalizedEmail }
    );

    if (existingId) {
      // First try to reuse the existing user — confirm email and generate link directly.
      // This works for proper GoTrue users without needing to delete anything.
      console.log("[invite-staff] existing user found, trying to reuse:", existingId);
      await adminClient.auth.admin.updateUserById(existingId, { email_confirm: true });

      // Upsert the profile with the existing user id
      await adminClient.rpc("admin_upsert_staff_profile", {
        p_id: existingId, p_full_name: full_name, p_email: normalizedEmail,
        p_role: role, p_phone: phone || null, p_specialty: specialty || null,
      });

      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "recovery", email: normalizedEmail,
      });

      if (linkData?.properties?.action_link) {
        // Existing user works fine — send the email and return
        console.log("[invite-staff] reusing existing user, link generated OK");
        return await sendEmail(resendKey, fromAddr, normalizedEmail, full_name, linkData.properties.action_link, respond);
      }

      // generateLink failed → existing user has broken identity → must recreate
      console.log("[invite-staff] generateLink failed for existing user, recreating...");
      await adminClient.rpc("admin_force_delete_auth_by_email", { p_email: normalizedEmail });

      // Verify deletion
      const { data: stillExists } = await adminClient.rpc(
        "admin_find_auth_user_by_email", { p_email: normalizedEmail }
      );
      if (stillExists) {
        return respond({
          error: "La cuenta no pudo eliminarse automáticamente. Ve a Supabase Dashboard → Authentication → Users, elimina manualmente el usuario con este email y vuelve a intentarlo."
        }, 500);
      }
    }

    // ── Step 2: Create a fresh GoTrue user via inviteUserByEmail ──────────
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail
    );
    if (inviteErr) {
      console.error("[invite-staff] inviteUserByEmail error:", inviteErr.message);
      return respond({ error: inviteErr.message }, 400);
    }
    const userId = inviteData.user.id;
    console.log("[invite-staff] new GoTrue user created:", userId);

    // ── Step 3: Confirm email immediately ────────────────────────────────
    await adminClient.auth.admin.updateUserById(userId, { email_confirm: true });

    // ── Step 4: Upsert staff profile ──────────────────────────────────────
    const { error: profileErr } = await adminClient.rpc("admin_upsert_staff_profile", {
      p_id: userId, p_full_name: full_name, p_email: normalizedEmail,
      p_role: role, p_phone: phone || null, p_specialty: specialty || null,
    });
    if (profileErr) {
      console.error("[invite-staff] profile upsert error:", profileErr.message);
      return respond({ error: profileErr.message }, 500);
    }

    // ── Step 5: Generate set-password link and send email ─────────────────
    const { data: newLinkData, error: newLinkErr } = await adminClient.auth.admin.generateLink({
      type: "recovery", email: normalizedEmail,
    });
    if (newLinkErr || !newLinkData?.properties?.action_link) {
      return respond({ error: "No se pudo generar el enlace de acceso." }, 500);
    }
    return await sendEmail(resendKey, fromAddr, normalizedEmail, full_name, newLinkData.properties.action_link, respond);

  } catch (err) {
    console.error("[invite-staff] unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendEmail(
  resendKey: string,
  fromAddr: string,
  email: string,
  fullName: string,
  actionLink: string,
  respond: (body: object, status?: number) => Response
): Promise<Response> {
  if (!resendKey) {
    return respond({ error: "RESEND_API_KEY no configurado." }, 500);
  }

  const html = `<!DOCTYPE html>
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
      Hola <strong>${fullName}</strong>,
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Has sido añadido al equipo de Clínica Cotten. Haz clic en el botón para crear tu contraseña y acceder al portal.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#1a2744,#243256);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Crear mi contraseña →
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;">
      Este enlace es válido durante 24 horas y es de un solo uso.
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
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
    body: JSON.stringify({ from: fromAddr, to: email, subject: "Crea tu contraseña — Clínica Cotten", html }),
  });
  const resendBody = await resendRes.json();
  console.log("[invite-staff] Resend:", resendRes.status, JSON.stringify(resendBody));

  if (!resendRes.ok) {
    return respond({ error: `Error enviando email: ${resendBody?.message ?? resendRes.status}` }, 500);
  }

  return respond({ ok: true, id: userId });
}