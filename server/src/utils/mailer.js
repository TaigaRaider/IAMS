import nodemailer from "nodemailer";

let transport = null;

function getTransport() {
  if (transport) return transport;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transport;
}

/**
 * Send an email over SMTP. In development the full message is also logged to
 * the console so flows can be tested without a real inbox.
 * Returns { delivered, error } — never throws.
 */
export async function sendMail({ to, subject, html }) {
  const enabled = process.env.MAIL_ENABLED !== "false";
  if (!enabled || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[mailer] disabled — would send "${subject}" to ${to}`);
    return { delivered: false, error: null };
  }

  const from = process.env.MAIL_FROM ?? `IAMS Internship <${process.env.SMTP_USER}>`;
  try {
    const info = await getTransport().sendMail({ from, to, subject, html });
    console.log(`[mailer] sent "${subject}" to ${to} (${info.messageId})`);
    return { delivered: true, error: null };
  } catch (err) {
    console.error(`[mailer] FAILED to send "${subject}" to ${to}:`, err.message);
    return { delivered: false, error: err };
  }
}
