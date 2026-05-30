// @ts-nocheck — Deno runtime types; not available in Node/VS Code type checker
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("RESEND_FROM") ?? "Clínica Cotten <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAFF_ROLES = ["admin", "doctor", "staff", "receptionist"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // ── Verify caller is authenticated staff ─────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !STAFF_ROLES.includes(profile.role)) return json({ error: "Forbidden" }, 403);

    if (!RESEND_API_KEY) {
      console.error("[send-email] RESEND_API_KEY secret is not set in Supabase");
      return json({ error: "RESEND_API_KEY not configured" }, 500);
    }

    let body: { to?: string; subject?: string; html?: string };
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("[send-email] failed to parse request body:", parseErr);
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { to, subject, html } = body;
    console.log("[send-email] to:", to, "| subject:", subject);

    if (!to || !subject || !html) {
      return json({ error: "Missing required fields: to, subject, html" }, 400);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    const data = await res.json();
    if (!res.ok) return json({ error: data }, res.status);
    return json(data);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-email] unhandled exception:", message);
    return json({ error: message }, 500);
  }
});