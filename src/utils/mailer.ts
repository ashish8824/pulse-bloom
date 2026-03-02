// src/utils/mailer.ts

import nodemailer from "nodemailer";
import { env } from "../config/env";

// ─────────────────────────────────────────────────────────────────
// TRANSPORT
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
    rejectUnauthorized: false,
  },
});

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
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

// ─────────────────────────────────────────────────────────────────
// SHARED HTML HELPERS
// Keeps all email templates visually consistent with zero duplication.
// ─────────────────────────────────────────────────────────────────

/** Wraps any body content in the standard PulseBloom email shell */
const emailShell = (bodyContent: string): string => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
                ${bodyContent}
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

/** A coloured stat card used in the weekly digest */
const statCard = (label: string, value: string, color: string): string => `
  <td style="text-align:center;padding:16px 12px;background:#F7FAFC;
             border-radius:10px;width:33%;">
    <div style="font-size:28px;font-weight:800;color:${color};line-height:1.1;">
      ${value}
    </div>
    <div style="font-size:12px;color:#718096;margin-top:4px;font-weight:600;
               text-transform:uppercase;letter-spacing:0.5px;">
      ${label}
    </div>
  </td>
`;

// ─────────────────────────────────────────────────────────────────
// 1. EMAIL VERIFICATION OTP
// ─────────────────────────────────────────────────────────────────
export const sendVerificationEmail = async (
  to: string,
  name: string,
  otp: string,
): Promise<void> => {
  const body = `
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
  `;

  await sendMail({
    to,
    subject: "🌸 PulseBloom — Verify your email address",
    html: emailShell(body),
  });
};

// ─────────────────────────────────────────────────────────────────
// 2. PASSWORD RESET EMAIL
// ─────────────────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetToken: string,
): Promise<void> => {
  const resetUrl = `${env.APP_URL}/reset-password?token=${resetToken}`;

  const body = `
    <p style="margin:0 0 16px;color:#1A1A2E;font-size:16px;">
      Hi <strong>${name}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#4A5568;font-size:15px;line-height:1.6;">
      We received a request to reset your PulseBloom password.
      Click the button below to choose a new password.
    </p>

    <div style="text-align:center;margin:0 0 28px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2E86AB);
                color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;
                padding:16px 40px;border-radius:8px;
                box-shadow:0 4px 12px rgba(46,134,171,0.35);">
        Reset My Password
      </a>
    </div>

    <div style="background:#FFF8E7;border-left:4px solid #E67E22;
                border-radius:4px;padding:14px 16px;margin:0 0 24px;">
      <p style="margin:0;color:#7D5A00;font-size:13px;">
        ⏱ This link expires in <strong>1 hour</strong>.
      </p>
    </div>

    <p style="margin:0 0 8px;color:#718096;font-size:13px;">
      If the button doesn't work, copy and paste this link:
    </p>
    <p style="margin:0 0 24px;word-break:break-all;">
      <a href="${resetUrl}" style="color:#2E86AB;font-size:13px;">${resetUrl}</a>
    </p>
    <p style="margin:0;color:#A0AEC0;font-size:13px;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `;

  await sendMail({
    to,
    subject: "🔐 PulseBloom — Reset your password",
    html: emailShell(body),
  });
};

// ─────────────────────────────────────────────────────────────────
// 3. HABIT REMINDER EMAIL
//
// Called by reminder.cron.ts once per habit that hasn't been
// completed yet for the current period.
// ─────────────────────────────────────────────────────────────────
export const sendReminderEmail = async ({
  to,
  userName,
  habitTitle,
  reminderTime,
}: {
  to: string;
  userName: string;
  habitTitle: string;
  reminderTime: string;
}): Promise<boolean> => {
  try {
    const body = `
      <p style="color:#1A1A2E;font-size:16px;margin:0 0 16px;">
        Hi <strong>${userName}</strong>,
      </p>
      <p style="color:#4A5568;font-size:15px;line-height:1.6;margin:0 0 24px;">
        This is your scheduled reminder to complete your habit:
      </p>

      <div style="background:#EBF4FA;border-radius:10px;padding:24px;
                  text-align:center;margin:0 0 24px;border-left:4px solid #2E86AB;">
        <span style="font-size:22px;font-weight:700;color:#1E3A5F;">
          ${habitTitle}
        </span>
      </div>

      <p style="color:#718096;font-size:14px;margin:0 0 8px;">
        🔥 Keep the streak alive! Every completion counts.
      </p>
      <p style="color:#A0AEC0;font-size:13px;margin:0;">
        You set this reminder for <strong>${reminderTime}</strong>.
        You can update or turn it off in your habit settings.
      </p>
    `;

    await sendMail({
      to,
      subject: `⏰ PulseBloom Reminder — ${habitTitle}`,
      html: emailShell(body),
    });

    console.log(`[Mailer] ✅ Habit reminder sent`, { to, habit: habitTitle });
    return true;
  } catch (err) {
    console.error("[Mailer] ❌ Habit reminder failed", {
      to,
      habit: habitTitle,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────
// 4. MOOD CHECK-IN REMINDER EMAIL  ← NEW
//
// Sent when the user hasn't logged their mood yet today
// and their moodReminderTime matches the current HH:MM.
// ─────────────────────────────────────────────────────────────────
export const sendMoodReminderEmail = async ({
  to,
  userName,
  reminderTime,
}: {
  to: string;
  userName: string;
  reminderTime: string;
}): Promise<boolean> => {
  try {
    const body = `
      <p style="color:#1A1A2E;font-size:16px;margin:0 0 16px;">
        Hi <strong>${userName}</strong>,
      </p>
      <p style="color:#4A5568;font-size:15px;line-height:1.6;margin:0 0 24px;">
        You haven't logged your mood yet today. Take 10 seconds to check in —
        it takes less time than making a cup of tea. ☕
      </p>

      <!-- Mood Scale Visual -->
      <div style="background:#F7FAFC;border-radius:10px;padding:20px;
                  text-align:center;margin:0 0 24px;">
        <p style="margin:0 0 12px;color:#2D3748;font-size:13px;font-weight:600;
                   text-transform:uppercase;letter-spacing:0.5px;">
          How are you feeling right now?
        </p>
        <div style="font-size:28px;letter-spacing:8px;">😞 😐 😊 😄 🤩</div>
        <p style="margin:10px 0 0;color:#A0AEC0;font-size:12px;">1 — Very Low &nbsp;&nbsp; 5 — Excellent</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${env.APP_URL}/mood/log"
           style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2E86AB);
                  color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;
                  padding:14px 36px;border-radius:8px;">
          Log My Mood
        </a>
      </div>

      <p style="color:#A0AEC0;font-size:13px;margin:0;">
        You set this reminder for <strong>${reminderTime}</strong>.
        You can update or turn it off in your account preferences.
      </p>
    `;

    await sendMail({
      to,
      subject: "🌸 PulseBloom — How are you feeling today?",
      html: emailShell(body),
    });

    console.log(`[Mailer] ✅ Mood reminder sent`, { to });
    return true;
  } catch (err) {
    console.error("[Mailer] ❌ Mood reminder failed", {
      to,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────
// 5. WEEKLY DIGEST EMAIL  ← NEW
//
// Sent every Saturday at 8am to users with weeklyDigestOn=true.
// Summarises the past 7 days: avg mood, habits completed, streaks, burnout risk.
//
// Data is pre-computed in the cron job and passed in here.
// This function is ONLY responsible for rendering and sending the email.
// ─────────────────────────────────────────────────────────────────
export interface WeeklyDigestData {
  userName: string;
  weekLabel: string; // e.g. "Feb 24 – Mar 2, 2026"
  averageMood: number | null; // null = no entries logged this week
  moodEntries: number;
  habitsCompleted: number;
  totalHabitTargets: number; // sum of targetPerWeek across all active habits
  longestActiveStreak: number; // highest current streak across all habits
  burnoutRiskLevel: "Low" | "Moderate" | "High" | null;
  topHabit: string | null; // habit with highest completion % this week
}

export const sendWeeklyDigestEmail = async ({
  to,
  data,
}: {
  to: string;
  data: WeeklyDigestData;
}): Promise<boolean> => {
  try {
    // ── Mood section ────────────────────────────────────────────
    const moodDisplay =
      data.averageMood !== null ? data.averageMood.toFixed(1) : "—";

    const moodEmoji =
      data.averageMood === null
        ? "😶"
        : data.averageMood >= 4.5
          ? "🤩"
          : data.averageMood >= 3.5
            ? "😊"
            : data.averageMood >= 2.5
              ? "😐"
              : "😞";

    // ── Burnout badge ────────────────────────────────────────────
    const burnoutColor =
      data.burnoutRiskLevel === "High"
        ? "#E53E3E"
        : data.burnoutRiskLevel === "Moderate"
          ? "#DD6B20"
          : data.burnoutRiskLevel === "Low"
            ? "#38A169"
            : "#A0AEC0";

    const burnoutBadge = data.burnoutRiskLevel
      ? `<span style="display:inline-block;background:${burnoutColor};color:#fff;
                      font-size:11px;font-weight:700;padding:3px 10px;
                      border-radius:20px;letter-spacing:0.5px;">
           ${data.burnoutRiskLevel} Risk
         </span>`
      : `<span style="color:#A0AEC0;font-size:13px;">Not enough data yet</span>`;

    // ── Habit completion rate ─────────────────────────────────────
    const completionPct =
      data.totalHabitTargets > 0
        ? Math.round((data.habitsCompleted / data.totalHabitTargets) * 100)
        : null;

    const completionDisplay =
      completionPct !== null ? `${completionPct}%` : "—";
    const completionColor =
      completionPct === null
        ? "#718096"
        : completionPct >= 80
          ? "#38A169"
          : completionPct >= 50
            ? "#D69E2E"
            : "#E53E3E";

    const body = `
      <p style="color:#1A1A2E;font-size:16px;margin:0 0 4px;">
        Hi <strong>${data.userName}</strong>,
      </p>
      <p style="color:#718096;font-size:14px;margin:0 0 28px;">
        Here's your behavioral summary for <strong>${data.weekLabel}</strong>.
      </p>

      <!-- ── STAT CARDS ── -->
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-collapse:separate;border-spacing:10px;margin:0 0 28px;">
        <tr>
          ${statCard("Avg Mood", `${moodEmoji} ${moodDisplay}`, "#2E86AB")}
          ${statCard("Habits Done", completionDisplay, completionColor)}
          ${statCard("Best Streak", `${data.longestActiveStreak}d`, "#805AD5")}
        </tr>
      </table>

      <!-- ── MOOD ENTRIES ── -->
      <div style="background:#F7FAFC;border-radius:10px;padding:16px 20px;
                  margin:0 0 16px;display:flex;align-items:center;">
        <p style="margin:0;color:#4A5568;font-size:14px;">
          📝 You logged your mood <strong>${data.moodEntries} time${data.moodEntries !== 1 ? "s" : ""}</strong> this week.
          ${
            data.moodEntries === 0
              ? `<span style="color:#E53E3E;"> Don't break the chain — try logging today!</span>`
              : data.moodEntries >= 6
                ? `<span style="color:#38A169;"> Great consistency! 🔥</span>`
                : ""
          }
        </p>
      </div>

      <!-- ── TOP HABIT ── -->
      ${
        data.topHabit
          ? `
      <div style="background:#F0FFF4;border-left:4px solid #38A169;border-radius:4px;
                  padding:14px 16px;margin:0 0 16px;">
        <p style="margin:0;color:#276749;font-size:14px;">
          🏆 Your top habit this week: <strong>${data.topHabit}</strong>
        </p>
      </div>`
          : ""
      }

      <!-- ── BURNOUT SECTION ── -->
      <div style="background:#F7FAFC;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
        <p style="margin:0 0 8px;color:#4A5568;font-size:14px;font-weight:600;">
          Burnout Risk
        </p>
        <p style="margin:0;font-size:14px;">
          ${burnoutBadge}
        </p>
      </div>

      <!-- ── CTA ── -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${env.APP_URL}/dashboard"
           style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2E86AB);
                  color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;
                  padding:14px 36px;border-radius:8px;">
          View Full Dashboard
        </a>
      </div>

      <p style="color:#A0AEC0;font-size:12px;margin:0;text-align:center;">
        To unsubscribe from weekly digests, go to
        <a href="${env.APP_URL}/settings/preferences" style="color:#2E86AB;">
          account preferences
        </a>.
      </p>
    `;

    await sendMail({
      to,
      subject: `🌸 Your PulseBloom Weekly Summary — ${data.weekLabel}`,
      html: emailShell(body),
    });

    console.log(`[Mailer] ✅ Weekly digest sent`, { to });
    return true;
  } catch (err) {
    console.error("[Mailer] ❌ Weekly digest failed", {
      to,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
};
