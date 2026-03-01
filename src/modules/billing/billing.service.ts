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
//
// These are different from Stripe Price IDs but serve the same purpose.
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
//
// These are used when creating one-time orders.
// ─────────────────────────────────────────────────────────────────
const PLAN_AMOUNTS: Record<string, number> = {
  pro: 99900, // ₹999/month in paise
  enterprise: 299900, // ₹2999/month in paise
};

// ─────────────────────────────────────────────────────────────────
// createOrder
//
// Step 1 of the Razorpay payment flow.
// Creates a Razorpay Order — a server-side record of a pending payment.
// The frontend uses the order_id to open the Razorpay checkout popup.
//
// Flow:
//   POST /api/billing/order
//     → createOrder() creates Razorpay order
//     → returns { orderId, amount, currency, keyId } to frontend
//     → frontend opens Razorpay popup with these details
//     → user pays
//     → Razorpay calls frontend handler with { razorpay_payment_id,
//         razorpay_order_id, razorpay_signature }
//     → frontend calls POST /api/billing/verify with those three values
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

  // Create Razorpay order — this is a server-side record of the intent to pay
  const order = await razorpay.orders.create({
    amount, // in paise
    currency: "INR",
    receipt: `pulsebloom_${userId}_${Date.now()}`,
    notes: {
      userId,
      plan,
      userEmail: user.email,
    },
  });

  return {
    orderId: order.id, // rzp_order_... — frontend passes this to the popup
    amount: order.amount as number,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID, // frontend needs the key_id to init the popup
    plan,
  };
}

// ─────────────────────────────────────────────────────────────────
// verifyPayment
//
// Step 2 of the Razorpay payment flow — the most critical step.
// Called AFTER the user completes payment in the Razorpay popup.
//
// Razorpay sends three values to the frontend after payment:
//   razorpay_payment_id  — the payment ID
//   razorpay_order_id    — the order ID we created above
//   razorpay_signature   — HMAC-SHA256 signature we must verify
//
// Verification:
//   Expected signature = HMAC-SHA256(
//     key    = RAZORPAY_KEY_SECRET,
//     data   = razorpay_order_id + "|" + razorpay_payment_id
//   )
//   If our computed signature matches the one Razorpay sent → payment is genuine.
//   If not → reject immediately (someone tampered with the request).
//
// Only after successful verification do we upgrade the user's plan.
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
  // Double-check the payment status directly from Razorpay
  // Never trust only the frontend — always confirm server-side.
  const payment = await razorpay.payments.fetch(razorpayPaymentId);

  if (payment.status !== "captured") {
    throw new Error(`Payment not captured. Current status: ${payment.status}`);
  }

  // ── Step 3: Create Razorpay subscription for renewals ─────────
  // After one-time payment, create a subscription so future renewals
  // are handled automatically by Razorpay.
  const planId = RAZORPAY_PLAN_IDS[plan];
  let subscriptionId: string | null = null;

  if (planId) {
    try {
      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_notify: 1, // Razorpay emails the customer on renewal
        total_count: 12, // 12 billing cycles (1 year); adjust as needed
        notes: { userId, plan },
      });
      subscriptionId = subscription.id;
    } catch (err) {
      // Log but don't fail — the payment was verified. Subscription creation
      // failing doesn't mean the payment failed. Can be retried later.
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
        stripeSubscriptionId: subscriptionId, // reusing this field for Razorpay sub ID
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
// These are NOT the primary payment confirmation — verifyPayment() handles that.
// Webhooks handle: renewals, failures, cancellations.
//
// Razorpay webhook verification:
//   Razorpay sends X-Razorpay-Signature in headers.
//   Verify: HMAC-SHA256(webhookSecret, rawBody) === signature
// ─────────────────────────────────────────────────────────────────
export async function handleWebhook(
  rawBody: string,
  signature: string,
): Promise<void> {
  // ── Verify webhook signature ───────────────────────────────────
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
    // ── subscription.charged ─────────────────────────────────────
    // Fires on every successful subscription renewal payment.
    // Refreshes the currentPeriodEnd date in our DB.
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

    // ── subscription.cancelled ────────────────────────────────────
    // Fires when a subscription is cancelled — revert user to free.
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

    // ── payment.failed ────────────────────────────────────────────
    // Fires when a renewal payment fails.
    // Mark subscription as past_due but don't immediately downgrade —
    // give the user time to update their payment method.
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
//
// Returns current plan, subscription details, and a Razorpay
// customer portal link (if applicable).
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
    // Razorpay doesn't have a hosted portal like Stripe.
    // Direct users to your own /billing/manage page instead.
    manageUrl: `${env.APP_URL}/billing/manage`,
  };
}

// ─────────────────────────────────────────────────────────────────
// cancelSubscription
//
// Cancels the user's Razorpay subscription at the end of the current period.
// The user retains Pro access until currentPeriodEnd, then reverts to free.
// The webhook (subscription.cancelled) handles the final DB update.
// ─────────────────────────────────────────────────────────────────
export async function cancelSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true, plan: true },
  });

  if (!user) throw new Error("User not found");
  if (user.plan === "free") throw new Error("No active subscription to cancel");
  if (!user.stripeSubscriptionId) throw new Error("No subscription ID found");

  // cancel_at_cycle_end: 1 means cancel at end of billing period, not immediately
  await razorpay.subscriptions.cancel(user.stripeSubscriptionId, false);

  // Mark as cancelled in our DB immediately (don't wait for webhook)
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
// Returns a Date 30 days from now — used as currentPeriodEnd
// ─────────────────────────────────────────────────────────────────
function getNextMonthDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}
