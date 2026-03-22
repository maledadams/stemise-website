export interface FormSubmission {
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

export const buildEmailForSubmission = (record: FormSubmission) => {
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
