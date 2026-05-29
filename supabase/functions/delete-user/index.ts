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

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { user_id } = await req.json();
    if (!user_id) return json({ error: "user_id es obligatorio" }, 400);

    // Prevent self-deletion
    if (user_id === user.id) return json({ error: "No puedes eliminarte a ti mismo" }, 400);

    // 1. Delete from patients table (best-effort — may fail if appointments exist)
    await adminClient.from("patients").delete().eq("profile_id", user_id);

    // 2. Delete from profiles table (best-effort — may already cascade from auth)
    await adminClient.from("profiles").delete().eq("id", user_id);

    // 3. Delete auth user — this is the critical step (blocks login)
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user_id);
    if (deleteErr) return json({ error: deleteErr.message }, 400);

    return json({ ok: true });

  } catch (err) {
    console.error("[delete-user] error:", err);
    return json({ error: err.message ?? "Error interno" }, 500);
  }
});