// src/modules/billing/billing.service.ts
//
// ─────────────────────────────────────────────────────────────────
// Razorpay Billing Service
//
// Razorpay flow is different from Stripe:
//
//   Stripe:  backend creates session → user pays on Stripe's page → webhook fires
//   Razorpay: backend creates "order" → frontend opens Razorpay popup → user pays →
//             frontend gets payment_id → frontend calls our /verify endpoint →
//             backend verifies signature → backend upgrades plan
//
// This means Razorpay does NOT use webhooks for the primary payment confirmation.
// The signature verification on /verify is the source of truth.
// Webhooks are used only for subscription renewals and cancellations.
// ─────────────────────────────────────────────────────────────────

import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../../config/db";
import { env } from "../../config/env";

// ─────────────────────────────────────────────────────────────────
// RAZORPAY CLIENT
// Instantiated once, reused across all service functions.
// ─────────────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────────
// PLAN → RAZORPAY PLAN ID MAP
//
// Razorpay Plan IDs are created in the Razorpay Dashboard under
// Subscriptions → Plans. Each plan maps to a billing amount + interval.
// ─────────────────────────────────────────────────────────────────
const RAZORPAY_PLAN_IDS: Record<string, string> = {
  pro: env.RAZORPAY_PLAN_PRO,
  enterprise: env.RAZORPAY_PLAN_ENTERPRISE,
};

// ─────────────────────────────────────────────────────────────────
// AMOUNT MAP (in paise — Razorpay uses smallest currency unit)
//
// ₹999/month = 99900 paise
// ₹2999/month = 299900 paise
// ─────────────────────────────────────────────────────────────────
const PLAN_AMOUNTS: Record<string, number> = {
  pro: 29900, // ₹999/month in paise
  enterprise: 79900, // ₹2999/month in paise
};

// ─────────────────────────────────────────────────────────────────
// HELPER — buildReceipt
//
// Razorpay enforces a 40-character max on the receipt field.
// A raw UUID (36 chars) + prefix + timestamp easily exceeds this.
// We truncate the UUID and use only the last 6 digits of the timestamp.
//
// Example output: "pb_550e8400e29b41d4_483647"  (25 chars)
// ─────────────────────────────────────────────────────────────────
function buildReceipt(userId: string): string {
  const shortId = userId.replace(/-/g, "").slice(0, 16);
  const shortTs = Date.now().toString().slice(-6);
  return `pb_${shortId}_${shortTs}`; // max ~26 chars, well under 40
}

// ─────────────────────────────────────────────────────────────────
// createOrder
//
// Step 1 of the Razorpay payment flow.
// Creates a Razorpay Order — a server-side record of a pending payment.
// The frontend uses the order_id to open the Razorpay checkout popup.
// ─────────────────────────────────────────────────────────────────
export async function createOrder(
  userId: string,
  plan: "pro" | "enterprise",
): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, plan: true },
  });

  if (!user) throw new Error("User not found");
  if (user.plan === plan) {
    throw new Error(`You are already on the ${plan} plan`);
  }

  const amount = PLAN_AMOUNTS[plan];
  if (!amount) throw new Error(`No amount configured for plan: ${plan}`);

  // FIX: receipt must be ≤40 chars — use buildReceipt() helper
  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: buildReceipt(userId),
    notes: {
      userId,
      plan,
      userEmail: user.email,
    },
  });

  return {
    orderId: order.id,
    // FIX: order.amount is typed as string | number — coerce to number
    amount: Number(order.amount),
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
    plan,
  };
}

// ─────────────────────────────────────────────────────────────────
// verifyPayment
//
// Step 2 of the Razorpay payment flow — the most critical step.
// Called AFTER the user completes payment in the Razorpay popup.
//
// Verification:
//   Expected signature = HMAC-SHA256(
//     key    = RAZORPAY_KEY_SECRET,
//     data   = razorpay_order_id + "|" + razorpay_payment_id
//   )
//   If our computed signature matches → payment is genuine.
//   If not → reject immediately (tampered request).
// ─────────────────────────────────────────────────────────────────
export async function verifyPayment(
  userId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  plan: "pro" | "enterprise",
): Promise<{ success: boolean; plan: string }> {
  // ── Step 1: Verify the signature ──────────────────────────────
  const body = razorpayOrderId + "|" + razorpayPaymentId;

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  const isValid = expectedSignature === razorpaySignature;

  if (!isValid) {
    throw new Error("Payment verification failed — invalid signature");
  }

  // ── Step 2: Fetch payment details from Razorpay API ───────────
  const payment = await razorpay.payments.fetch(razorpayPaymentId);

  if (payment.status !== "captured") {
    throw new Error(`Payment not captured. Current status: ${payment.status}`);
  }

  // ── Step 3: Create Razorpay subscription for renewals ─────────
  const planId = RAZORPAY_PLAN_IDS[plan];
  let subscriptionId: string | null = null;

  if (planId) {
    try {
      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_notify: 1,
        total_count: 12,
        notes: { userId, plan },
      });
      subscriptionId = subscription.id;
    } catch (err) {
      console.error(
        "[Billing] Subscription creation failed after payment:",
        err,
      );
    }
  }

  // ── Step 4: Update DB — upgrade user plan ─────────────────────
  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status: "active",
        stripeSubscriptionId: subscriptionId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: getNextMonthDate(),
      },
      update: {
        plan,
        status: "active",
        stripeSubscriptionId: subscriptionId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: getNextMonthDate(),
        cancelledAt: null,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        stripeSubscriptionId: subscriptionId,
      },
    }),
  ]);

  console.log(
    `[Billing] ✅ Payment verified — user ${userId} upgraded to ${plan}`,
  );

  return { success: true, plan };
}

// ─────────────────────────────────────────────────────────────────
// handleWebhook
//
// Processes Razorpay webhook events for subscription lifecycle.
// Handles: renewals, failures, cancellations.
// ─────────────────────────────────────────────────────────────────
export async function handleWebhook(
  rawBody: string,
  signature: string,
): Promise<void> {
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new Error("Invalid webhook signature");
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.event;

  console.log(`[Billing] Webhook received: ${eventType}`);

  switch (eventType) {
    case "subscription.charged": {
      const subscription = event.payload?.subscription?.entity;
      if (!subscription) break;

      const existingSub = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (existingSub) {
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: "active",
              currentPeriodStart: new Date(subscription.current_start * 1000),
              currentPeriodEnd: new Date(subscription.current_end * 1000),
            },
          }),
          prisma.user.update({
            where: { id: existingSub.userId },
            data: { plan: existingSub.plan },
          }),
        ]);
        console.log(
          `[Billing] ✅ Renewal confirmed for sub ${subscription.id}`,
        );
      }
      break;
    }

    case "subscription.cancelled": {
      const subscription = event.payload?.subscription?.entity;
      if (!subscription) break;

      const existingSub = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (existingSub) {
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: "cancelled",
              cancelledAt: new Date(),
            },
          }),
          prisma.user.update({
            where: { id: existingSub.userId },
            data: {
              plan: "free",
              stripeSubscriptionId: null,
            },
          }),
        ]);
        console.log(
          `[Billing] ⚠️  Subscription cancelled — user ${existingSub.userId} → free`,
        );
      }
      break;
    }

    case "payment.failed": {
      const payment = event.payload?.payment?.entity;
      if (!payment?.subscription_id) break;

      const existingSub = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: payment.subscription_id },
      });

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: { status: "past_due" },
        });
        console.log(
          `[Billing] ⚠️  Payment failed for sub ${payment.subscription_id}`,
        );
      }
      break;
    }

    default:
      console.log(`[Billing] Unhandled webhook event: ${eventType}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// getBillingStatus
// ─────────────────────────────────────────────────────────────────
export async function getBillingStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      stripeSubscriptionId: true,
      subscription: true,
    },
  });

  if (!user) throw new Error("User not found");

  return {
    currentPlan: user.plan,
    subscription: user.subscription
      ? {
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
          cancelledAt: user.subscription.cancelledAt,
        }
      : null,
    manageUrl: `${env.APP_URL}/billing/manage`,
  };
}

// ─────────────────────────────────────────────────────────────────
// cancelSubscription
//
// Cancels the user's Razorpay subscription at end of current period.
// FIX: pass `true` (cancel_at_cycle_end) so the user retains access
// until currentPeriodEnd instead of being cut off immediately.
// ─────────────────────────────────────────────────────────────────
export async function cancelSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true, plan: true },
  });

  if (!user) throw new Error("User not found");
  if (user.plan === "free") throw new Error("No active subscription to cancel");
  if (!user.stripeSubscriptionId) throw new Error("No subscription ID found");

  // FIX: was `false` (immediate cancel) — must be `true` to cancel at cycle end
  await razorpay.subscriptions.cancel(user.stripeSubscriptionId, true);

  await prisma.subscription.update({
    where: { userId },
    data: { status: "cancelled", cancelledAt: new Date() },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: "free", stripeSubscriptionId: null },
  });

  console.log(`[Billing] Subscription cancelled for user ${userId}`);
}

// ─────────────────────────────────────────────────────────────────
// HELPER — getNextMonthDate
// ─────────────────────────────────────────────────────────────────
function getNextMonthDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}
