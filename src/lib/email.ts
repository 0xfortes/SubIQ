import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * The single email egress point (magic links, renewal reminders).
 * Development/test: logs to the server console — no real email leaves the
 * machine. Production: Resend HTTP API via fetch (deliberately no SDK).
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (env.NODE_ENV !== "production") {
    console.log(
      `\n━━━ Email (dev) ━━━\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n━━━━━━━━━━━━━━━━━━━\n`,
    );
    return;
  }

  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required to send email in production");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
  });

  if (!response.ok) {
    // Log status only — never the recipient or body (PII).
    throw new Error(`Email send failed with status ${response.status}`);
  }
}
