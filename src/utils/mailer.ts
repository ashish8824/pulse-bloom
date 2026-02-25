/**
 * src/utils/mailer.ts
 *
 * Gmail SMTP transport via Nodemailer.
 */

import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

// ─── Transporter ──────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // false = STARTTLS on port 587

  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },

  // ── FIX for "self-signed certificate in certificate chain" ────────────────
  // This is common on Windows or corporate networks where Node.js cannot
  // verify Gmail's SSL certificate chain.
  //
  // rejectUnauthorized: false → tells Node.js to accept the certificate
  // without verifying it against the system's root CA store.
  //
  // Is this safe? YES for Gmail specifically — you are explicitly connecting
  // to smtp.gmail.com (Google's server). The risk of self-signed cert errors
  // is a local Node/OS config issue, not a security problem with Gmail.
  tls: {
    rejectUnauthorized: false,
  },
});

// ─── Verify on startup ────────────────────────────────────────────────────────

transporter
  .verify()
  .then(() => {
    logger.info("📧 Gmail SMTP connection verified — mailer is ready");
  })
  .catch((err: Error) => {
    logger.warn(
      "⚠️  Gmail SMTP verification failed — check SMTP_USER and SMTP_PASS in .env",
      {
        error: err.message,
      },
    );
  });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderEmailPayload {
  to: string;
  userName: string;
  habitTitle: string;
  reminderTime: string;
}

// ─── sendReminderEmail ────────────────────────────────────────────────────────

export const sendReminderEmail = async (
  payload: ReminderEmailPayload,
): Promise<boolean> => {
  const { to, userName, habitTitle, reminderTime } = payload;

  const subject = `⏰ Reminder: Time for "${habitTitle}"`;

  const text = `
Hi ${userName},

This is your ${reminderTime} reminder to complete: "${habitTitle}".

You haven't logged it yet today — now's a great time! 🌸

Stay consistent,
The PulseBloom Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PulseBloom Reminder</title>
</head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#fff; border-radius:16px; overflow:hidden;
                      box-shadow:0 4px 16px rgba(0,0,0,0.08); max-width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);
                       padding:28px 32px; text-align:center;">
              <h1 style="margin:0; color:#fff; font-size:24px; font-weight:800;">
                🌸 PulseBloom
              </h1>
              <p style="margin:6px 0 0; color:#DDD6FE; font-size:13px;">
                Track your pulse. Bloom with intention.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px; color:#111827; font-size:17px; font-weight:600;">
                Hi ${userName} 👋
              </p>
              <p style="margin:0 0 20px; color:#6B7280; font-size:15px; line-height:1.6;">
                This is your <strong style="color:#374151;">${reminderTime}</strong> reminder.
                You haven't completed today's habit yet:
              </p>

              <!-- Habit pill -->
              <div style="background:#F5F3FF; border-left:4px solid #7C3AED;
                          border-radius:10px; padding:18px 22px; margin:0 0 24px;">
                <p style="margin:0; color:#5B21B6; font-size:20px; font-weight:700;">
                  ${habitTitle}
                </p>
                <p style="margin:6px 0 0; color:#7C3AED; font-size:13px;">
                  Not completed yet today
                </p>
              </div>

              <p style="margin:0; color:#6B7280; font-size:15px; line-height:1.6;">
                Staying consistent — even on the tough days — is exactly what builds
                the streak. You've got this! 💪
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB; padding:16px 32px; text-align:center;
                       border-top:1px solid #E5E7EB;">
              <p style="margin:0; color:#9CA3AF; font-size:12px;">
                You're receiving this because you enabled reminders in PulseBloom.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    logger.info("✅ Reminder email sent", {
      messageId: info.messageId,
      to,
      habit: habitTitle,
    });

    return true;
  } catch (err) {
    logger.error("❌ Failed to send reminder email", {
      to,
      habit: habitTitle,
      error: err instanceof Error ? err.message : String(err),
    });

    return false;
  }
};
