import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
const RESEND_FROM_NAME = Deno.env.get("RESEND_FROM_NAME") || "STEMise";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildEmail = ({
  email,
  signedInAt,
  userAgent,
}: {
  email: string;
  signedInAt: string;
  userAgent: string;
}) => `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#16203b;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:2px solid #16203b;border-radius:28px;overflow:hidden;">
      <div style="padding:32px;background:
        radial-gradient(circle at top right, #dfeeff 0, #dfeeff 88px, transparent 89px),
        radial-gradient(circle at bottom left, #dff2b3 0, #dff2b3 94px, transparent 95px),
        linear-gradient(180deg, #ffffff 0%, #fffef8 100%);">
        <div style="display:inline-block;padding:10px 16px;border:2px solid #16203b;border-radius:999px;background:#fff4a8;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">
          Admin
        </div>
        <div style="margin-top:20px;font-size:36px;line-height:1.05;font-weight:900;color:#16203b;">
          Admin sign-in confirmed.
        </div>
        <div style="margin-top:14px;font-size:17px;line-height:1.7;color:#4f5d7d;">
          A successful sign-in was just completed for the STEMise admin panel.
        </div>
      </div>
      <div style="padding:0 32px 32px 32px;">
        <div style="margin-top:24px;border:2px solid #16203b;border-radius:24px;background:#eef5ff;padding:22px;">
          <div style="font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#3f4e72;">Email</div>
          <div style="margin-top:8px;font-size:16px;line-height:1.7;color:#16203b;">${escapeHtml(email)}</div>
          <div style="margin-top:18px;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#3f4e72;">Signed in at</div>
          <div style="margin-top:8px;font-size:16px;line-height:1.7;color:#16203b;">${escapeHtml(signedInAt)}</div>
          <div style="margin-top:18px;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#3f4e72;">Browser</div>
          <div style="margin-top:8px;font-size:16px;line-height:1.7;color:#16203b;">${escapeHtml(userAgent || "Unavailable")}</div>
        </div>
        <div style="margin-top:20px;font-size:15px;line-height:1.8;color:#4f5d7d;">
          If this was not you, change the admin password immediately and review the allowlist in Supabase.
        </div>
      </div>
    </div>
  </body>
</html>`;

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

    if (!RESEND_API_KEY) {
      return jsonResponse({ success: false, error: "RESEND_API_KEY is not configured." }, 500);
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

    const [{ data: userData, error: userError }, { data: isAdmin, error: adminError }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("current_user_is_admin"),
    ]);

    if (userError || !userData.user?.email) {
      return jsonResponse({ success: false, error: "Could not resolve the signed-in user." }, 401);
    }

    if (adminError || !isAdmin) {
      return jsonResponse({ success: false, error: "This account is not authorized for admin email confirmation." }, 403);
    }

    const email = userData.user.email.trim().toLowerCase();
    const signedInAt = new Date().toISOString();
    const userAgent = req.headers.get("user-agent") || "";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
        to: [email],
        subject: "STEMise admin sign-in confirmation",
        html: buildEmail({
          email,
          signedInAt,
          userAgent,
        }),
      }),
    });

    const resendText = await resendResponse.text();
    const resendData = resendText ? JSON.parse(resendText) : null;

    if (!resendResponse.ok) {
      console.error("Resend admin login confirmation error:", resendData);
      return jsonResponse(
        {
          success: false,
          error: "Failed to send admin login confirmation email.",
          details: resendData,
        },
        resendResponse.status,
      );
    }

    return jsonResponse({
      success: true,
      message: "Admin login confirmation email sent.",
      data: resendData,
    });
  } catch (error) {
    console.error("Unexpected send-admin-login-confirmation error:", error);
    return jsonResponse({ success: false, error: "Internal server error." }, 500);
  }
});
