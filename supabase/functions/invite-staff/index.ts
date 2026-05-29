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

    return json({ ok: true, id: userId });

  } catch (err) {
    console.error("[invite-staff] unexpected error:", err);
    return json({ error: err.message ?? "Error interno" }, 500);
  }
});