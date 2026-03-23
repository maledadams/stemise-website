import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const DEPLOY_HOOK_URL = Deno.env.get("DEPLOY_HOOK_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return jsonResponse({ success: false, error: "Supabase server credentials are not configured." }, 500);
    }

    if (!DEPLOY_HOOK_URL) {
      return jsonResponse({ success: false, error: "DEPLOY_HOOK_URL is not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Missing authorization header." }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: isAdmin, error: adminError } = await supabase.rpc("current_user_is_admin");
    if (adminError) {
      console.error("Admin verification failed before redeploy:", adminError);
      return jsonResponse({ success: false, error: "Could not verify admin access." }, 403);
    }

    if (!isAdmin) {
      return jsonResponse({ success: false, error: "This account is not authorized to trigger redeploys." }, 403);
    }

    const requestBody = await req.json().catch(() => ({}));
    const deployResponse = await fetch(DEPLOY_HOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "stemise-admin",
        requested_at: new Date().toISOString(),
        ...requestBody,
      }),
    });

    const responseText = await deployResponse.text();
    if (!deployResponse.ok) {
      console.error("Deploy hook failed:", deployResponse.status, responseText);
      return jsonResponse(
        {
          success: false,
          error: "The deploy hook request failed.",
          details: responseText || null,
        },
        502,
      );
    }

    return jsonResponse({
      success: true,
      message: "Redeploy triggered.",
      details: responseText || null,
    });
  } catch (error) {
    console.error("Unexpected trigger-redeploy error:", error);
    return jsonResponse({ success: false, error: "Internal server error." }, 500);
  }
});
