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

  try {
    // Service role client — bypasses RLS for auth checks
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated (valid Supabase JWT)
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { email, full_name, role, phone, specialty } = await req.json();
    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: "email, full_name y role son obligatorios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Helper: find an existing auth user by email via the GoTrue REST API
    async function findUserByEmail(em: string): Promise<string | null> {
      const res = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(em)}&page=1&per_page=100`,
        { headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` } }
      );
      const json = await res.json();
      const found = (json.users ?? []).find((u: any) => u.email?.toLowerCase() === em.toLowerCase());
      return found?.id ?? null;
    }

    // Try to invite; if the email already exists, reuse the existing auth user
    let userId: string;
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${PORTAL_URL}/acceso-personal` }
    );

    if (inviteErr) {
      const existingId = await findUserByEmail(email);
      if (!existingId) {
        return new Response(JSON.stringify({ error: inviteErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = existingId;
    } else {
      userId = inviteData.user.id;
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
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[invite-staff] error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});