import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type MagicLinkRequestPayload = {
  email?: string;
  password?: string;
  redirectTo?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ success: false, error: "Supabase server credentials are not configured." }, 500);
    }

    const payload = (await req.json()) as MagicLinkRequestPayload;
    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";
    const redirectTo = payload.redirectTo?.trim();

    if (!email || !password) {
      return jsonResponse({ success: false, error: "Email and password are required." }, 400);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: allowlistedAdmin, error: allowlistError } = await serviceClient
      .from("admin_allowlist")
      .select("email")
      .ilike("email", email)
      .maybeSingle();

    if (allowlistError) {
      console.error("Admin allowlist lookup failed:", allowlistError);
      return jsonResponse({ success: false, error: "Could not verify admin access." }, 500);
    }

    if (!allowlistedAdmin) {
      return jsonResponse({ success: false, error: "This email is not on the admin allowlist." }, 403);
    }

    const verificationClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: signInError } = await verificationClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return jsonResponse({ success: false, error: "Incorrect email or password." }, 401);
    }

    const deliveryClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: otpError } = await deliveryClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      console.error("Admin magic link delivery failed:", otpError);
      return jsonResponse({ success: false, error: otpError.message }, 502);
    }

    return jsonResponse({
      success: true,
      message: "Magic link sent.",
    });
  } catch (error) {
    console.error("Unexpected request-admin-magic-link error:", error);
    return jsonResponse({ success: false, error: "Internal server error." }, 500);
  }
});
