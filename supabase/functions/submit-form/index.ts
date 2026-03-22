import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

interface FormSubmission {
  id: string;
  form_type: "contact" | "kit_request";
  email: string;
  name?: string;
  organization_name?: string | null;
  message?: string;
  created_at: string;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatMessage = (value: string) => escapeHtml(value).replaceAll("\n", "<br />");

const buildEmailShell = ({
  eyebrow,
  title,
  intro,
  accent,
  body,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  accent: string;
  body: string;
}) => `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#16203b;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:2px solid #16203b;border-radius:28px;overflow:hidden;">
      <div style="padding:32px 32px 20px;background:
        radial-gradient(circle at top right, #dfeeff 0, #dfeeff 88px, transparent 89px),
        radial-gradient(circle at bottom left, ${accent} 0, ${accent} 94px, transparent 95px),
        linear-gradient(180deg, #ffffff 0%, #fffef8 100%);">
        <div style="display:inline-block;padding:10px 16px;border:2px solid #16203b;border-radius:999px;background:#fff4a8;color:#16203b;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">
          ${eyebrow}
        </div>
        <div style="margin-top:20px;font-size:40px;line-height:1.02;font-weight:900;color:#16203b;">
          ${title}
        </div>
        <div style="margin-top:14px;font-size:17px;line-height:1.7;color:#4f5d7d;">
          ${intro}
        </div>
      </div>
      <div style="padding:0 32px 32px 32px;">
        ${body}
        <div style="margin-top:24px;padding-top:20px;border-top:2px solid #16203b;color:#5d6987;font-size:13px;line-height:1.7;">
          <div style="font-weight:800;color:#16203b;">STEMise</div>
          International youth-led nonprofit focused on hands-on kits, open curriculum, and practical STEM learning.
        </div>
      </div>
    </div>
  </body>
</html>`;

const detailRow = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 0;vertical-align:top;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#3f4e72;width:150px;">
      ${label}
    </td>
    <td style="padding:10px 0;font-size:16px;line-height:1.7;color:#16203b;">
      ${value}
    </td>
  </tr>
`;

const buildContactEmail = (record: FormSubmission) =>
  buildEmailShell({
    eyebrow: "Contact",
    title: "New contact message.",
    intro: "A visitor sent a message through the STEMise contact form.",
    accent: "#dff2b3",
    body: `
      <div style="margin-top:24px;border:2px solid #16203b;border-radius:24px;background:#eef5ff;padding:22px;">
        <table style="width:100%;border-collapse:collapse;">
          ${detailRow("Name", escapeHtml(record.name || "Unknown sender"))}
          ${detailRow("Email", `<a href="mailto:${escapeHtml(record.email)}" style="color:#2563eb;text-decoration:none;font-weight:700;">${escapeHtml(record.email)}</a>`)}
          ${detailRow("Submitted", escapeHtml(new Date(record.created_at).toLocaleString()))}
        </table>
      </div>
      <div style="margin-top:20px;border:2px solid #16203b;border-radius:24px;background:#ffffff;padding:22px;">
        <div style="font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#3f4e72;">Message</div>
        <div style="margin-top:12px;font-size:16px;line-height:1.8;color:#16203b;">
          ${formatMessage(record.message || "")}
        </div>
      </div>
    `,
  });

const buildKitRequestEmail = (record: FormSubmission) =>
  buildEmailShell({
    eyebrow: "Kit Request",
    title: "New STEM kit request.",
    intro: "A new kit request was submitted through the STEMise kits page.",
    accent: "#ffe0c7",
    body: `
      <div style="margin-top:24px;border:2px solid #16203b;border-radius:24px;background:#fff4ec;padding:22px;">
        <table style="width:100%;border-collapse:collapse;">
          ${detailRow("Name", escapeHtml(record.name || "Unknown requester"))}
          ${detailRow("Email", `<a href="mailto:${escapeHtml(record.email)}" style="color:#2563eb;text-decoration:none;font-weight:700;">${escapeHtml(record.email)}</a>`)}
          ${record.organization_name ? detailRow("Organization", escapeHtml(record.organization_name)) : ""}
          ${detailRow("Submitted", escapeHtml(new Date(record.created_at).toLocaleString()))}
        </table>
      </div>
      <div style="margin-top:20px;border:2px solid #16203b;border-radius:24px;background:#ffffff;padding:22px;">
        <div style="font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#3f4e72;">Request details</div>
        <div style="margin-top:12px;font-size:16px;line-height:1.8;color:#16203b;">
          ${formatMessage(record.message || "")}
        </div>
      </div>
    `,
  });

const buildEmailForSubmission = (record: FormSubmission) => {
  const subject =
    record.form_type === "contact"
      ? `New contact message from ${record.name || record.email}`
      : `New STEM kit request from ${record.name || record.email}`;

  const html =
    record.form_type === "contact"
      ? buildContactEmail(record)
      : buildKitRequestEmail(record);

  return { subject, html };
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TARGET_EMAIL = Deno.env.get("TARGET_EMAIL") || "officialstemise@gmail.com";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
const RESEND_FROM_NAME = Deno.env.get("RESEND_FROM_NAME") || "STEMise";
const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SubmitFormPayload = {
  form_type: "contact" | "kit_request";
  email: string;
  name: string;
  organization_name?: string | null;
  message: string;
  captcha_token: string;
};

const badRequest = (error: string, status = 400) =>
  new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getRemoteIp = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || undefined;
  }

  return req.headers.get("x-real-ip") || undefined;
};

const verifyTurnstile = async (token: string, remoteIp?: string) => {
  if (!TURNSTILE_SECRET_KEY) {
    return { success: false, error: "TURNSTILE_SECRET_KEY is not configured." };
  }

  const formData = new FormData();
  formData.set("secret", TURNSTILE_SECRET_KEY);
  formData.set("response", token);

  if (remoteIp) {
    formData.set("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    return {
      success: false,
      error: "Security check failed. Please try again.",
      details: result,
    };
  }

  return { success: true };
};

const sendResendEmail = async (record: FormSubmission) => {
  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY is not configured." };
  }

  const { subject, html } = buildEmailForSubmission(record);

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [TARGET_EMAIL],
      reply_to: record.email,
      subject,
      html,
    }),
  });

  const resendData = await resendResponse.json();
  if (!resendResponse.ok) {
    return {
      success: false,
      error: "Failed to send notification email.",
      details: resendData,
      status: resendResponse.status,
    };
  }

  return { success: true, data: resendData };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return badRequest("Supabase server credentials are not configured.", 500);
    }

    const payload = (await req.json()) as Partial<SubmitFormPayload>;
    const formType = payload.form_type;

    if (formType !== "contact" && formType !== "kit_request") {
      return badRequest("Unsupported form type.");
    }

    if (!payload.captcha_token) {
      return badRequest("Please complete the security check.");
    }

    const turnstileResult = await verifyTurnstile(payload.captcha_token, getRemoteIp(req));
    if (!turnstileResult.success) {
      console.error("Turnstile verification failed:", turnstileResult);
      return badRequest(turnstileResult.error, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: insertedRecord, error: submissionError } = await supabase.rpc(
      "submit_public_form_submission",
      {
        p_form_type: formType,
        p_email: payload.email ?? "",
        p_name: payload.name ?? "",
        p_organization_name: payload.organization_name ?? null,
        p_message: payload.message ?? "",
      },
    );

    if (submissionError) {
      console.error("Form submission RPC failed:", submissionError);
      return badRequest(submissionError.message, 400);
    }

    const record = insertedRecord as FormSubmission;
    const emailResult = await sendResendEmail(record);

    if (!emailResult.success) {
      console.error("Notification email failed:", emailResult);

      if (SUPABASE_SERVICE_ROLE_KEY) {
        const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        const { error: cleanupError } = await serviceClient
          .from("form_submissions")
          .delete()
          .eq("id", record.id);

        if (cleanupError) {
          console.error("Failed to remove queued submission after email failure:", cleanupError);
        }
      }

      return badRequest("We could not complete the submission. Please try again.", 502);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling form submission:", error);
    return badRequest("Internal server error.", 500);
  }
});
