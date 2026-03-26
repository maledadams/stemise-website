import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const GITHUB_ACTIONS_TOKEN = Deno.env.get("GITHUB_ACTIONS_TOKEN");
const GITHUB_REPO_OWNER = Deno.env.get("GITHUB_REPO_OWNER");
const GITHUB_REPO_NAME = Deno.env.get("GITHUB_REPO_NAME");
const GITHUB_WORKFLOW_ID = Deno.env.get("GITHUB_WORKFLOW_ID") || "publish-site-content.yml";
const GITHUB_WORKFLOW_REF = Deno.env.get("GITHUB_WORKFLOW_REF") || "main";

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

    if (!GITHUB_ACTIONS_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME) {
      return jsonResponse({
        success: false,
        error: "GitHub workflow dispatch is not configured.",
      }, 500);
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
    const workflowDispatchUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`;
    const deployResponse = await fetch(workflowDispatchUrl, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${GITHUB_ACTIONS_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: GITHUB_WORKFLOW_REF,
        inputs: {
          source: "stemise-admin",
          requested_at: new Date().toISOString(),
          section: typeof requestBody?.section === "string" ? requestBody.section : "all",
        },
      }),
    });

    const responseText = await deployResponse.text();
    if (!deployResponse.ok) {
      console.error("GitHub workflow dispatch failed:", deployResponse.status, responseText);
      return jsonResponse(
        {
          success: false,
          error: "The GitHub workflow dispatch failed.",
          details: responseText || null,
        },
        502,
      );
    }

    return jsonResponse({
      success: true,
      message: "GitHub publish workflow triggered.",
      details: responseText || null,
    });
  } catch (error) {
    console.error("Unexpected trigger-redeploy error:", error);
    return jsonResponse({ success: false, error: "Internal server error." }, 500);
  }
});
