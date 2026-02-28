// src/utils/mailer.ts

import nodemailer from "nodemailer";
import { env } from "../config/env";

// ─────────────────────────────────────────────────────────────────
// TRANSPORT
//
// Gmail SMTP with App Password (not your Gmail login password).
// Setup:
//   1. myaccount.google.com/security → enable 2-Step Verification
//   2. myaccount.google.com/apppasswords → create App Password "PulseBloom"
//   3. Add to .env: SMTP_USER=you@gmail.com  SMTP_PASS=xxxx-xxxx-xxxx-xxxx
//
// secure: true → port 465 (SSL from the start)
// If you use port 587, set secure: false and add tls: { ciphers: 'SSLv3' }
// ─────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // ← add this line
  },
});

// Verify SMTP connection on startup (logs to console, does not crash the server)
transporter.verify((error) => {
  if (error) {
    console.error("[Mailer] SMTP connection failed:", error.message);
  } else {
    console.log("📧 Gmail SMTP connection verified — mailer is ready");
  }
});

// ─────────────────────────────────────────────────────────────────
// SHARED EMAIL WRAPPER
// ─────────────────────────────────────────────────────────────────
interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

const sendMail = async ({
  to,
  subject,
  html,
}: SendMailOptions): Promise<void> => {
  await transporter.sendMail({
    from: env.EMAIL_FROM, // e.g. "PulseBloom 🌸 <no-reply@gmail.com>"
    to,
    subject,
    html,
  });
};

// ─────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION OTP
//
// Sent immediately after registration and on resend-verification request.
// OTP expires in 15 minutes — this is clearly stated in the email.
// ─────────────────────────────────────────────────────────────────
export const sendVerificationEmail = async (
  to: string,
  name: string,
  otp: string,
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Verify your email — PulseBloom</title>
    </head>
    <body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0"
              style="background:#FFFFFF;border-radius:12px;overflow:hidden;
                     box-shadow:0 4px 20px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1E3A5F,#2E86AB);
                           padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:700;
                             letter-spacing:-0.5px;">🌸 PulseBloom</h1>
                  <p style="margin:8px 0 0;color:#B8D8EA;font-size:14px;">
                    Track your pulse. Bloom with intention.
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;color:#1A1A2E;font-size:16px;">
                    Hi <strong>${name}</strong>,
                  </p>
                  <p style="margin:0 0 24px;color:#4A5568;font-size:15px;line-height:1.6;">
                    Welcome to PulseBloom! Use the verification code below to confirm your
                    email address and activate your account.
                  </p>

                  <!-- OTP Box -->
                  <div style="background:#EBF4FA;border:2px dashed #2E86AB;border-radius:12px;
                              padding:28px;text-align:center;margin:0 0 24px;">
                    <p style="margin:0 0 8px;color:#2E86AB;font-size:13px;font-weight:600;
                               letter-spacing:1px;text-transform:uppercase;">
                      Your verification code
                    </p>
                    <span style="font-size:48px;font-weight:800;color:#1E3A5F;
                                 letter-spacing:12px;display:block;line-height:1.2;">
                      ${otp}
                    </span>
                    <p style="margin:12px 0 0;color:#718096;font-size:13px;">
                      ⏱ Expires in <strong>15 minutes</strong>
                    </p>
                  </div>

                  <p style="margin:0 0 8px;color:#4A5568;font-size:14px;line-height:1.6;">
                    Enter this code on the verification screen to complete your registration.
                  </p>
                  <p style="margin:0;color:#A0AEC0;font-size:13px;">
                    If you didn't create a PulseBloom account, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#F7FAFC;padding:20px 40px;border-top:1px solid #E2E8F0;">
                  <p style="margin:0;color:#A0AEC0;font-size:12px;text-align:center;">
                    © ${new Date().getFullYear()} PulseBloom. All rights reserved.<br/>
                    This is an automated email — please do not reply.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendMail({
    to,
    subject: "🌸 PulseBloom — Verify your email address",
    html,
  });
};

// ─────────────────────────────────────────────────────────────────
// PASSWORD RESET EMAIL
//
// Contains a clickable link with the reset token.
// The frontend reads the token from the URL query string and sends it
// to POST /api/auth/reset-password in the request body.
//
// Link format: https://yourapp.com/reset-password?token=<64-char-hex>
// Link expires in 1 hour — clearly stated in the email.
// ─────────────────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetToken: string,
): Promise<void> => {
  // In production, APP_URL should be your frontend URL (e.g. https://pulsebloom.app)
  const resetUrl = `${env.APP_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset your password — PulseBloom</title>
    </head>
    <body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0"
              style="background:#FFFFFF;border-radius:12px;overflow:hidden;
                     box-shadow:0 4px 20px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1E3A5F,#2E86AB);
                           padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:700;
                             letter-spacing:-0.5px;">🌸 PulseBloom</h1>
                  <p style="margin:8px 0 0;color:#B8D8EA;font-size:14px;">
                    Track your pulse. Bloom with intention.
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;color:#1A1A2E;font-size:16px;">
                    Hi <strong>${name}</strong>,
                  </p>
                  <p style="margin:0 0 24px;color:#4A5568;font-size:15px;line-height:1.6;">
                    We received a request to reset your PulseBloom password.
                    Click the button below to choose a new password.
                  </p>

                  <!-- CTA Button -->
                  <div style="text-align:center;margin:0 0 28px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2E86AB);
                              color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;
                              padding:16px 40px;border-radius:8px;
                              box-shadow:0 4px 12px rgba(46,134,171,0.35);">
                      Reset My Password
                    </a>
                  </div>

                  <!-- Expiry notice -->
                  <div style="background:#FFF8E7;border-left:4px solid #E67E22;
                              border-radius:4px;padding:14px 16px;margin:0 0 24px;">
                    <p style="margin:0;color:#7D5A00;font-size:13px;">
                      ⏱ This link expires in <strong>1 hour</strong>.
                      After that, you'll need to request a new one.
                    </p>
                  </div>

                  <!-- Fallback URL -->
                  <p style="margin:0 0 8px;color:#718096;font-size:13px;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="margin:0 0 24px;word-break:break-all;">
                    <a href="${resetUrl}" style="color:#2E86AB;font-size:13px;">${resetUrl}</a>
                  </p>

                  <p style="margin:0;color:#A0AEC0;font-size:13px;">
                    If you didn't request a password reset, you can safely ignore this email.
                    Your password will remain unchanged.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#F7FAFC;padding:20px 40px;border-top:1px solid #E2E8F0;">
                  <p style="margin:0;color:#A0AEC0;font-size:12px;text-align:center;">
                    © ${new Date().getFullYear()} PulseBloom. All rights reserved.<br/>
                    This is an automated email — please do not reply.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendMail({
    to,
    subject: "🔐 PulseBloom — Reset your password",
    html,
  });
};

// ─────────────────────────────────────────────────────────────────
// HABIT REMINDER (existing — preserved from original mailer.ts)
// ─────────────────────────────────────────────────────────────────
export const sendReminderEmail = async (
  to: string,
  name: string,
  habitTitle: string,
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
            style="background:#FFFFFF;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#1E3A5F,#2E86AB);
                         padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#FFFFFF;font-size:24px;">🌸 PulseBloom</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;">
                <p style="color:#1A1A2E;font-size:16px;">Hi <strong>${name}</strong>,</p>
                <p style="color:#4A5568;font-size:15px;line-height:1.6;">
                  This is your reminder to complete your habit:
                </p>
                <div style="background:#EBF4FA;border-radius:8px;padding:20px;
                            text-align:center;margin:20px 0;">
                  <span style="font-size:22px;font-weight:700;color:#1E3A5F;">
                    ${habitTitle}
                  </span>
                </div>
                <p style="color:#718096;font-size:14px;">Keep the streak alive! 🔥</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  await sendMail({
    to,
    subject: `⏰ PulseBloom Reminder — ${habitTitle}`,
    html,
  });
};
