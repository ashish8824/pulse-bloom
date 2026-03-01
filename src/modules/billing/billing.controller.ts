// src/modules/billing/billing.controller.ts

import { Request, Response, NextFunction } from "express";
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getBillingStatus,
  cancelSubscription,
} from "./billing.service";

// ─────────────────────────────────────────────────────────────────
// createOrderController
//
// POST /api/billing/order
//
// Step 1 of the Razorpay flow.
// Creates a Razorpay order and returns its details to the frontend.
// The frontend uses these to open the Razorpay checkout popup.
//
// Request body: { plan: "pro" | "enterprise" }
// Response:     { orderId, amount, currency, keyId, plan }
// ─────────────────────────────────────────────────────────────────
export async function createOrderController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { plan } = req.body;

    if (!plan || !["pro", "enterprise"].includes(plan)) {
      res.status(400).json({
        error: "Invalid plan",
        message: "plan must be 'pro' or 'enterprise'",
      });
      return;
    }

    const order = await createOrder(req.userId, plan as "pro" | "enterprise");

    res.status(200).json({
      ...order,
      // Include instructions for the frontend developer on how to use these fields
      _instructions: {
        step: "Open Razorpay popup with these details. See billing.routes.ts for frontend code snippet.",
      },
    });
  } catch (error: any) {
    if (error.message?.includes("already on the")) {
      res
        .status(400)
        .json({ error: "plan_already_active", message: error.message });
      return;
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────
// verifyPaymentController
//
// POST /api/billing/verify
//
// Step 2 of the Razorpay flow — CRITICAL.
// Called by the frontend after the user completes payment in the popup.
// Verifies the HMAC-SHA256 signature and upgrades the user's plan.
//
// Request body:
//   {
//     razorpayOrderId:   "order_...",   ← from createOrder response
//     razorpayPaymentId: "pay_...",     ← from Razorpay popup success handler
//     razorpaySignature: "abc123...",   ← from Razorpay popup success handler
//     plan: "pro" | "enterprise"        ← must match what was ordered
//   }
// ─────────────────────────────────────────────────────────────────
export async function verifyPaymentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } =
      req.body;

    // Validate all required fields are present
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !plan) {
      res.status(400).json({
        error: "Missing required fields",
        message:
          "razorpayOrderId, razorpayPaymentId, razorpaySignature, and plan are all required",
      });
      return;
    }

    if (!["pro", "enterprise"].includes(plan)) {
      res.status(400).json({ error: "Invalid plan value" });
      return;
    }

    const result = await verifyPayment(
      req.userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      plan as "pro" | "enterprise",
    );

    res.status(200).json({
      success: result.success,
      plan: result.plan,
      message: `🎉 Welcome to PulseBloom ${plan.charAt(0).toUpperCase() + plan.slice(1)}! Your plan has been upgraded.`,
    });
  } catch (error: any) {
    // Signature mismatch → 400, not 500
    if (error.message?.includes("verification failed")) {
      res.status(400).json({
        error: "payment_verification_failed",
        message: error.message,
      });
      return;
    }
    // Payment not captured → 400
    if (error.message?.includes("not captured")) {
      res.status(400).json({
        error: "payment_not_captured",
        message: error.message,
      });
      return;
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────
// webhookController
//
// POST /api/billing/webhook
//
// Receives Razorpay webhook events for subscription lifecycle.
// NOT the primary payment confirmation — verifyPayment handles that.
// This handles renewals, failures, and cancellations.
//
// IMPORTANT: req.body is the raw string body here (not parsed JSON).
// The route uses express.text() so we get the raw body for
// HMAC signature verification.
// ─────────────────────────────────────────────────────────────────
export async function webhookController(
  req: Request,
  res: Response,
): Promise<void> {
  const signature = req.headers["x-razorpay-signature"] as string;

  if (!signature) {
    res.status(400).json({ error: "Missing X-Razorpay-Signature header" });
    return;
  }

  try {
    // req.body is a raw string here (express.text() middleware on this route)
    await handleWebhook(req.body as string, signature);
  } catch (err: any) {
    if (err.message === "Invalid webhook signature") {
      console.error("[Billing] Invalid webhook signature");
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }
    // Log processing errors but still return 200 to stop Razorpay retries
    console.error("[Billing] Webhook processing error:", err);
  }

  res.status(200).json({ received: true });
}

// ─────────────────────────────────────────────────────────────────
// billingStatusController
//
// GET /api/billing/status
//
// Returns current plan, subscription status, renewal date, and
// a link to the billing management page.
// ─────────────────────────────────────────────────────────────────
export async function billingStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = await getBillingStatus(req.userId);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────
// cancelSubscriptionController
//
// DELETE /api/billing/subscription
//
// Cancels the user's subscription at end of current billing period.
// User retains access until currentPeriodEnd, then reverts to free.
// ─────────────────────────────────────────────────────────────────
export async function cancelSubscriptionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await cancelSubscription(req.userId);
    res.status(200).json({
      message:
        "Subscription cancelled. You will retain access until the end of your current billing period.",
    });
  } catch (error: any) {
    if (
      error.message?.includes("No active subscription") ||
      error.message?.includes("No subscription ID")
    ) {
      res
        .status(400)
        .json({ error: "no_active_subscription", message: error.message });
      return;
    }
    next(error);
  }
}
