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

    // Find an existing auth user by email via GoTrue REST API
    async function findAuthUserId(em: string): Promise<string | null> {
      const res = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
        { headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` } }
      );
      const data = await res.json();
      console.log("[invite-staff] listUsers status:", res.status, "total:", data.users?.length ?? 0);
      const found = (data.users ?? []).find((u: any) => u.email?.toLowerCase() === em.toLowerCase());
      console.log("[invite-staff] found existing user:", found?.id ?? "none");
      return found?.id ?? null;
    }

    let userId: string;

    // Check first if user already exists to avoid trigger errors
    const existingId = await findAuthUserId(email);

    if (existingId) {
      // User already in auth — just update their profile, no invite needed
      userId = existingId;
      console.log("[invite-staff] user already exists, updating profile:", userId);
    } else {
      // Clean up any stale profile row that could block the auth trigger
      await adminClient.from("profiles").delete().eq("email", email);

      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        { redirectTo: `${PORTAL_URL}/acceso-personal` }
      );
      if (inviteErr) {
        console.error("[invite-staff] inviteUserByEmail error:", inviteErr.message);
        return json({ error: inviteErr.message }, 400);
      }
      userId = inviteData.user.id;
      console.log("[invite-staff] invited new user:", userId);
    }

    // Upsert the profile with name, role, phone, specialty
    const { error: profileErr } = await adminClient
      .from("profiles")
      .upsert({
        id:        userId,
        full_name,
        email,
        role,
        phone:     phone     || null,
        specialty: specialty || null,
      });
    if (profileErr) {
      console.error("[invite-staff] profile upsert error:", profileErr.message);
      return json({ error: profileErr.message }, 500);
    }

    return json({ ok: true, id: userId });

  } catch (err) {
    console.error("[invite-staff] error:", err);
    return json({ error: err.message ?? "Error interno" }, 500);
  }
});