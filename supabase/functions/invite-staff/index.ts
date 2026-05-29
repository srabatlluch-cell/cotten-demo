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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { email, full_name, role, phone, specialty } = await req.json();
    if (!email || !full_name || !role) return json({ error: "email, full_name y role son obligatorios" }, 400);

    const normalizedEmail = email.toLowerCase().trim();

    // ── Step 1: check auth.users directly via SQL (bypasses GoTrue quirks) ──
    const { data: existingId, error: findErr } = await adminClient.rpc(
      "admin_find_auth_user_by_email",
      { p_email: normalizedEmail }
    );

    if (findErr) {
      console.error("[invite-staff] admin_find_auth_user_by_email error:", findErr.message);
      return json({ error: findErr.message }, 500);
    }

    let userId: string;

    if (existingId) {
      // ── User already exists in auth.users — reuse their account ──
      console.log("[invite-staff] existing auth user found:", existingId);
      userId = existingId;
    } else {
      // ── User does not exist — clean up any orphaned data then invite ──
      console.log("[invite-staff] no existing auth user, cleaning up and inviting:", normalizedEmail);

      // Remove any stale profile row by email that would block a trigger
      await adminClient.from("profiles").delete().eq("email", normalizedEmail);

      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        normalizedEmail,
        { redirectTo: `${PORTAL_URL}/acceso-personal` }
      );

      if (inviteErr) {
        // Invite still failed — force-delete any zombie auth record and retry once
        console.error("[invite-staff] invite failed:", inviteErr.message, "— force-deleting and retrying");
        await adminClient.rpc("admin_force_delete_auth_by_email", { p_email: normalizedEmail });

        const { data: retryData, error: retryErr } = await adminClient.auth.admin.inviteUserByEmail(
          normalizedEmail,
          { redirectTo: `${PORTAL_URL}/acceso-personal` }
        );
        if (retryErr) {
          console.error("[invite-staff] retry also failed:", retryErr.message);
          return json({ error: retryErr.message }, 400);
        }
        userId = retryData.user.id;
      } else {
        userId = inviteData.user.id;
      }
    }

    // ── Step 2: upsert profile via SECURITY DEFINER function (postgres perms) ──
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

    // ── Step 3: generate access link and send via Resend ──
    let emailWarning: string | null = null;

    // Ensure the user is email-confirmed so GoTrue can generate any link type
    await adminClient.auth.admin.updateUserById(userId, { email_confirm: true });

    // Try generating the link via the GoTrue REST API directly (more compatible than SDK)
    // Try magiclink first (no password needed), then recovery as fallback
    let accessLink: string | null = null;
    for (const linkType of ["magiclink", "recovery", "invite"] as const) {
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate-link`, {
          method: "POST",
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: linkType,
            email: normalizedEmail,
            redirect_to: `${PORTAL_URL}/acceso-personal`,
          }),
        });
        const resJson = await res.json();
        console.log(`[invite-staff] generateLink(${linkType}) status:`, res.status, "action_link:", resJson.action_link?.slice(0, 60) ?? resJson.error ?? resJson);
        if (res.ok && resJson.action_link) {
          accessLink = resJson.action_link;
          break;
        }
      } catch (e) {
        console.warn(`[invite-staff] generateLink(${linkType}) threw:`, e);
      }
    }

    if (accessLink) {
      const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
      const fromAddr  = Deno.env.get("RESEND_FROM") ?? "Clínica Cotten <onboarding@resend.dev>";
      console.log("[invite-staff] resendKey present:", !!resendKey, "from:", fromAddr, "to:", normalizedEmail);

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
        body: JSON.stringify({
          from:    fromAddr,
          to:      normalizedEmail,
          subject: "Acceso al Portal de Clínica Cotten",
          html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e0d8;">
  <tr><td style="background:linear-gradient(135deg,#1a2744,#243256);padding:32px 40px;">
    <p style="color:#c9a96e;font-size:13px;margin:0 0 4px;">CLÍNICA COTTEN</p>
    <h1 style="color:#fff;font-size:22px;margin:0;">Bienvenido al equipo</h1>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hola <strong>${full_name}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Has sido añadido como miembro del equipo de Clínica Cotten con el rol de <strong>${role}</strong>.
      Haz clic en el botón para acceder al portal y establecer tu contraseña.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${accessLink}"
         style="display:inline-block;background:linear-gradient(135deg,#1a2744,#243256);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Acceder al portal
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;">
      Este enlace es válido durante 24 horas. Si no esperabas este email, puedes ignorarlo.
    </p>
  </td></tr>
  <tr><td style="background:#faf9f7;padding:20px 40px;text-align:center;border-top:1px solid #f3f0ea;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">Clínica Cotten · Portal de Gestión</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
        }),
      });
      const resendBody = await resendRes.json();
      console.log("[invite-staff] Resend status:", resendRes.status, "body:", JSON.stringify(resendBody));
      if (!resendRes.ok) {
        emailWarning = `Email no enviado: ${JSON.stringify(resendBody)}`;
      }
    } else {
      emailWarning = "No se pudo generar el enlace de acceso.";
      console.warn("[invite-staff] could not generate any link for:", normalizedEmail);
    }

    return json({ ok: true, id: userId, emailWarning });

  } catch (err) {
    console.error("[invite-staff] unexpected error:", err);
    return json({ error: err.message ?? "Error interno" }, 500);
  }
});