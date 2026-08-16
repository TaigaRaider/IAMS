const BRAND_BG = "#0d0a14";
const BRAND_ACCENT = "#7c5cff";
const CARD_BG = "#ffffff";
const TEXT = "#1c1726";
const MUTED = "#6b6478";
const BORDER = "#e6e1ef";

const shell = ({ title, preheader, heading, intro, bodyHtml, actionUrl, actionLabel, footer }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${CARD_BG};border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(13,10,20,0.35);">
            <tr>
              <td style="background:${BRAND_BG};padding:24px 32px;" align="left">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:34px;height:34px;background:${BRAND_ACCENT};border-radius:9px;text-align:center;font-size:18px;font-weight:800;color:#ffffff;line-height:34px;">I</td>
                    <td style="padding-left:10px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.5px;">IAMS&nbsp;<span style="color:#a89bff;font-weight:400;">Internship</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <h1 style="margin:0 0 8px;font-size:22px;color:${TEXT};line-height:1.3;">${heading}</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${MUTED};">${intro}</p>
                ${bodyHtml}
                ${actionUrl ? `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                  <tr>
                    <td style="background:${BRAND_ACCENT};border-radius:10px;">
                      <a href="${actionUrl}" style="display:block;padding:13px 26px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${actionLabel}</a>
                    </td>
                  </tr>
                </table>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};border-top:1px solid ${BORDER};padding-top:16px;">${footer}</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:11px;color:#8d86a0;text-align:center;">You received this email because of an action on your IAMS Internship account.<br />If you didn't request it, you can safely ignore this message.</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const codeBlock = (code) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border:1px dashed #c9c1dd;border-radius:12px;background:#f7f4ff;padding:18px 0;width:100%;">
  <tr><td align="center" style="font-size:34px;font-weight:800;letter-spacing:10px;color:${BRAND_ACCENT};font-family:Menlo,Consolas,monospace;padding:0 8px;">${code}</td></tr>
</table>
<p style="margin:10px 0 0;font-size:13px;color:${MUTED};text-align:center;">This code expires in <strong style="color:${TEXT};">30 minutes</strong>.</p>`;

export const verificationEmail = ({ name, code }) =>
  shell({
    title: "Verify your IAMS account",
    preheader: "Your 6-digit verification code is here",
    heading: `Welcome, ${name}!`,
    intro: "Thanks for creating your IAMS Internship account. Enter the code below to verify your email and start applying.",
    bodyHtml: codeBlock(code),
    actionUrl: `${process.env.ORIGIN}/login`,
    actionLabel: "Go to IAMS",
    footer: `This verification code is for ${process.env.ORIGIN ?? "your IAMS Internship account"}. If you didn't create an account, you can ignore this email.`,
  });

export const resetEmail = ({ name, code }) =>
  shell({
    title: "Reset your IAMS password",
    preheader: "Your 6-digit password reset code is here",
    heading: `Reset your password, ${name}`,
    intro: "We received a request to reset the password for your IAMS Internship account. Enter the code below to choose a new password.",
    bodyHtml: codeBlock(code),
    actionUrl: `${process.env.ORIGIN}/reset-password`,
    actionLabel: "Reset password",
    footer: "If you didn't request a password reset, you can safely ignore this email — your password won't change until you use this code.",
  });

const detailRow = (label, value) => `
<tr>
  <td style="padding:6px 0;font-size:14px;color:${MUTED};width:130px;vertical-align:top;">${label}</td>
  <td style="padding:6px 0;font-size:14px;color:${TEXT};font-weight:600;">${value}</td>
</tr>`;

const detailsTable = (rows) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border:1px solid ${BORDER};border-radius:12px;padding:12px 18px;width:100%;">${rows.join("")}</table>`;

export const applicationStatusEmail = ({ name, roleTitle, status }) =>
  shell({
    title: `Application ${status} — ${roleTitle}`,
    preheader: `Your IAMS application for ${roleTitle} is now ${status}`,
    heading: `Application update: ${roleTitle}`,
    intro: `Hi ${name}, the status of your application for ${roleTitle} has changed.`,
    bodyHtml: detailsTable([detailRow("Role", roleTitle), detailRow("Status", status)]),
    actionUrl: `${process.env.ORIGIN}/applicant`,
    actionLabel: "View my applications",
    footer: "This is an automated update about your IAMS Internship application.",
  });

export const offerEmail = ({ name, roleTitle, status, positionTitle }) =>
  shell({
    title: status === "Extended" ? "An offer has been extended to you!" : `Offer: ${roleTitle}`,
    preheader: `Your IAMS offer for ${roleTitle} — ${status}`,
    heading: status === "Extended" ? `You have a new offer, ${name}! 🎉` : `Offer update: ${roleTitle}`,
    intro:
      status === "Extended"
        ? `Great news, ${name}! An offer has been extended to you for ${roleTitle}. Review the terms to accept, decline, or request changes.`
        : `Hi ${name}, there's an update on your offer for ${roleTitle}.`,
    bodyHtml: detailsTable([
      detailRow("Role", roleTitle),
      detailRow("Position", positionTitle ?? roleTitle),
      detailRow("Status", status),
    ]),
    actionUrl: `${process.env.ORIGIN}/applicant`,
    actionLabel: "Review the offer",
    footer: "Offers are visible from the Applicant dashboard. This is an automated update about your IAMS Internship offer.",
  });

export const interviewEmail = ({ name, roleTitle, scheduledAt, status }) =>
  shell({
    title: `Interview ${status}${scheduledAt ? ` — ${scheduledAt}` : ""}`,
    preheader: `Interview for ${roleTitle} — ${status}`,
    heading: `Interview update: ${roleTitle}`,
    intro: scheduledAt
      ? `Hi ${name}, here are the details of your interview for ${roleTitle}.`
      : `Hi ${name}, your interview for ${roleTitle} is now ${status}.`,
    bodyHtml: detailsTable([
      detailRow("Role", roleTitle),
      detailRow("Scheduled", scheduledAt ?? "—"),
      detailRow("Status", status),
    ]),
    actionUrl: `${process.env.ORIGIN}/applicant`,
    actionLabel: "View my interviews",
    footer: "This is an automated update about your IAMS Internship interview.",
  });

export const taskEmail = ({ name, title, dueDate }) =>
  shell({
    title: "New task assigned to you",
    preheader: "You have a new IAMS internship task",
    heading: `New task: ${title}`,
    intro: `Hi ${name}, an internship task has been assigned to you on IAMS.`,
    bodyHtml: detailsTable([
      detailRow("Task", title),
      detailRow("Due", dueDate ?? "No due date"),
    ]),
    actionUrl: `${process.env.ORIGIN}/intern`,
    actionLabel: "View my tasks",
    footer: "This is an automated update about your IAMS Internship account.",
  });
