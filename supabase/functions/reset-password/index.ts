// @ts-nocheck — Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    try { body = await req.json(); } catch { return respond({ error: "Cuerpo inválido." }, 400); }

    const { email } = body;
    if (!email) return respond({ error: "email es obligatorio" }, 400);
    const normalizedEmail = email.toLowerCase().trim();

    // ── Find user ─────────────────────────────────────────────────────────
    const { data: userId } = await adminClient.rpc(
      "admin_find_auth_user_by_email", { p_email: normalizedEmail }
    );
    if (!userId) {
      // Don't reveal whether account exists
      return respond({ ok: true });
    }

    // ── Verify staff profile ───────────────────────────────────────────────
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .single();

    const staffRoles = ["admin", "doctor", "staff", "receptionist"];
    if (!profile || !staffRoles.includes(profile.role)) {
      return respond({ ok: true }); // Silently ignore non-staff
    }

    // ── Try to generate recovery link ─────────────────────────────────────
    // Confirm email first so generateLink works even for unactivated users
    await adminClient.auth.admin.updateUserById(userId, { email_confirm: true });

    let { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
    });

    // If generateLink fails (SQL-created user with broken identity),
    // recreate the auth user cleanly and retry.
    if (linkErr || !linkData?.properties?.action_link) {
      console.warn("[reset-password] generateLink failed, recreating user:", linkErr?.message);

      // Save profile data before deletion
      const savedProfile = { ...profile };

      // Delete via admin API so GoTrue cleans up ALL internal tables
      const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delErr) {
        console.warn("[reset-password] admin.deleteUser failed, trying SQL fallback:", delErr.message);
        await adminClient.rpc("admin_force_delete_auth_by_email", { p_email: normalizedEmail });
      }

      // Create fresh GoTrue user
      const { data: newUserData, error: createErr } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
      });
      if (createErr) {
        console.error("[reset-password] createUser error:", createErr.message);
        return respond({ error: "Error recreando la cuenta." }, 500);
      }
      const newUserId = newUserData.user.id;

      // Restore staff profile with new UUID
      await adminClient.rpc("admin_upsert_staff_profile", {
        p_id:        newUserId,
        p_full_name: savedProfile.full_name,
        p_email:     normalizedEmail,
        p_role:      savedProfile.role,
        p_phone:     null,
        p_specialty: null,
      });

      // Retry generateLink with the fresh user
      const retry = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
      });
      linkData = retry.data;
      linkErr  = retry.error;
    }

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("[reset-password] generateLink still failing:", linkErr?.message);
      return respond({ error: "No se pudo generar el enlace. Contacta con el administrador." }, 500);
    }

    const actionLink = linkData.properties.action_link;

    // ── Send via Resend ────────────────────────────────────────────────────
    if (!resendKey) return respond({ error: "RESEND_API_KEY no configurado." }, 500);

    const html = `<!DOCTYPE html>
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
      Haz clic en el botón para establecer tu nueva contraseña.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#1a2744,#243256);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Establecer contraseña →
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;">
      Este enlace es válido durante 1 hora y es de un solo uso.
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
      body: JSON.stringify({ from: fromAddr, to: normalizedEmail, subject: "Restablecer contraseña — Clínica Cotten", html }),
    });
    const resendBody = await resendRes.json();
    console.log("[reset-password] Resend:", resendRes.status, JSON.stringify(resendBody));

    if (!resendRes.ok) {
      return respond({ error: `Error enviando email: ${resendBody?.message ?? resendRes.status}` }, 500);
    }

    return respond({ ok: true });

  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});