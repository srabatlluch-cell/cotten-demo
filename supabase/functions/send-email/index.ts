// @ts-nocheck — Deno runtime types; not available in Node/VS Code type checker
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("RESEND_FROM") ?? "Clínica Cotten <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[send-email] request received:", req.method, req.url);

  try {
    if (!RESEND_API_KEY) {
      console.error("[send-email] RESEND_API_KEY secret is not set in Supabase");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { to?: string; subject?: string; html?: string };
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("[send-email] failed to parse request body:", parseErr);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, html } = body;
    console.log("[send-email] to:", to, "| subject:", subject);

    if (!to || !subject || !html) {
      console.error("[send-email] missing fields — to:", to, "subject:", subject, "html length:", html?.length);
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[send-email] calling Resend API, from:", FROM);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    const data = await res.json();
    console.log("[send-email] Resend response status:", res.status, "| data:", JSON.stringify(data));

    if (!res.ok) {
      console.error("[send-email] Resend API error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-email] unhandled exception:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});