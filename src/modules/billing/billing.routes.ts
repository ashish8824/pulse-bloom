// src/modules/billing/billing.routes.ts

import { Router } from "express";
import express from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  createOrderController,
  verifyPaymentController,
  webhookController,
  billingStatusController,
  cancelSubscriptionController,
} from "./billing.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Razorpay subscription management
 */

// ─────────────────────────────────────────────────────────────────
// ROUTE MAP
//
//   POST   /api/billing/order        → Step 1: create Razorpay order
//   POST   /api/billing/verify       → Step 2: verify payment + upgrade plan
//   POST   /api/billing/webhook      → Razorpay lifecycle webhooks (no auth)
//   GET    /api/billing/status       → current plan + renewal info
//   DELETE /api/billing/subscription → cancel subscription
//
// WEBHOOK BODY NOTE:
//   The webhook route uses express.text() to receive the raw string body
//   for HMAC-SHA256 signature verification. All other routes use the
//   global express.json() middleware from app.ts.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// FRONTEND INTEGRATION SNIPPET
//
// Copy this into your React/Next.js frontend.
// This is the complete Razorpay checkout integration.
//
// ─────────────────────────────────────────────────────────────────
//
//  async function handleUpgrade(plan: "pro" | "enterprise") {
//    // Step 1 — Create order on your backend
//    const { orderId, amount, currency, keyId } = await fetch(
//      "/api/billing/order",
//      {
//        method: "POST",
//        headers: {
//          "Content-Type": "application/json",
//          Authorization: `Bearer ${accessToken}`,
//        },
//        body: JSON.stringify({ plan }),
//      }
//    ).then((r) => r.json());
//
//    // Step 2 — Load Razorpay SDK (add this script to your index.html:)
//    // <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
//
//    // Step 3 — Open the Razorpay checkout popup
//    const rzp = new (window as any).Razorpay({
//      key: keyId,
//      amount,
//      currency,
//      order_id: orderId,
//      name: "PulseBloom",
//      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
//      image: "https://yourapp.com/logo.png", // optional
//      prefill: {
//        email: user.email,  // pre-fills the form
//        name: user.name,
//      },
//      theme: { color: "#7C3AED" }, // your brand purple
//
//      handler: async function (response: any) {
//        // Step 4 — Payment succeeded. Verify on your backend.
//        const result = await fetch("/api/billing/verify", {
//          method: "POST",
//          headers: {
//            "Content-Type": "application/json",
//            Authorization: `Bearer ${accessToken}`,
//          },
//          body: JSON.stringify({
//            razorpayOrderId:   response.razorpay_order_id,
//            razorpayPaymentId: response.razorpay_payment_id,
//            razorpaySignature: response.razorpay_signature,
//            plan,
//          }),
//        }).then((r) => r.json());
//
//        if (result.success) {
//          // Plan upgraded! Refresh user context / show success UI
//          console.log("Upgraded to:", result.plan);
//        }
//      },
//
//      modal: {
//        ondismiss: function () {
//          console.log("User closed the payment popup");
//        },
//      },
//    });
//
//    rzp.open();
//  }
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/billing/webhook:
 *   post:
 *     summary: Razorpay webhook receiver
 *     description: |
 *       Receives Razorpay webhook events for subscription lifecycle management.
 *       Called by Razorpay servers — not by your frontend.
 *
 *       Events handled:
 *       - `subscription.charged` — renewal payment succeeded, refreshes period dates
 *       - `subscription.cancelled` — reverts user to free plan
 *       - `payment.failed` — marks subscription as past_due
 *
 *       Always returns 200. Razorpay retries on non-2xx responses.
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Event received
 */
// ↓ express.text() captures the raw string body needed for HMAC verification.
//   Must be applied at route level — NOT globally.
router.post(
  "/webhook",
  express.text({ type: "application/json" }),
  webhookController,
);

/**
 * @swagger
 * /api/billing/order:
 *   post:
 *     summary: Create a Razorpay order (Step 1 of checkout)
 *     description: |
 *       Creates a Razorpay order and returns the details needed to open
 *       the Razorpay checkout popup on the frontend.
 *
 *       **Frontend flow after calling this:**
 *       1. Use the returned `orderId`, `amount`, `currency`, `keyId` to initialize the Razorpay popup
 *       2. User completes payment in the popup
 *       3. Razorpay calls your `handler` with `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
 *       4. Call `POST /api/billing/verify` with those three values + `plan`
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [pro, enterprise]
 *                 example: pro
 *     responses:
 *       200:
 *         description: Razorpay order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                   example: "order_NaVxyz123"
 *                   description: Pass this to the Razorpay popup as order_id
 *                 amount:
 *                   type: integer
 *                   example: 99900
 *                   description: Amount in paise (99900 = ₹999)
 *                 currency:
 *                   type: string
 *                   example: INR
 *                 keyId:
 *                   type: string
 *                   example: "rzp_test_..."
 *                   description: Your Razorpay Key ID — pass to the popup as key
 *                 plan:
 *                   type: string
 *                   example: pro
 *       400:
 *         description: Invalid plan or already on requested plan
 *       401:
 *         description: Unauthorized
 */
router.post("/order", protect, createOrderController);

/**
 * @swagger
 * /api/billing/verify:
 *   post:
 *     summary: Verify payment and upgrade plan (Step 2 of checkout)
 *     description: |
 *       Called by the frontend after the user completes payment in the Razorpay popup.
 *       Verifies the HMAC-SHA256 signature to confirm the payment is genuine,
 *       then upgrades the user's plan in the database.
 *
 *       **This is the most critical endpoint** — the signature check prevents anyone
 *       from calling this endpoint with fake payment IDs to get a free upgrade.
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpayOrderId, razorpayPaymentId, razorpaySignature, plan]
 *             properties:
 *               razorpayOrderId:
 *                 type: string
 *                 example: "order_NaVxyz123"
 *                 description: From the createOrder response
 *               razorpayPaymentId:
 *                 type: string
 *                 example: "pay_NaVabc456"
 *                 description: From the Razorpay popup success handler
 *               razorpaySignature:
 *                 type: string
 *                 example: "a9f3e2..."
 *                 description: From the Razorpay popup success handler
 *               plan:
 *                 type: string
 *                 enum: [pro, enterprise]
 *                 example: pro
 *     responses:
 *       200:
 *         description: Payment verified and plan upgraded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 plan:
 *                   type: string
 *                   example: pro
 *                 message:
 *                   type: string
 *       400:
 *         description: Signature verification failed or payment not captured
 *       401:
 *         description: Unauthorized
 */
router.post("/verify", protect, verifyPaymentController);

/**
 * @swagger
 * /api/billing/status:
 *   get:
 *     summary: Get current billing status
 *     description: |
 *       Returns the user's current plan, subscription details, and
 *       a link to the billing management page.
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentPlan:
 *                   type: string
 *                   enum: [free, pro, enterprise]
 *                   example: pro
 *                 subscription:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [active, cancelled, past_due, trialing, incomplete]
 *                     currentPeriodEnd:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     cancelledAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                 manageUrl:
 *                   type: string
 *                   example: "http://localhost:3000/billing/manage"
 *       401:
 *         description: Unauthorized
 */
router.get("/status", protect, billingStatusController);

/**
 * @swagger
 * /api/billing/subscription:
 *   delete:
 *     summary: Cancel subscription
 *     description: |
 *       Cancels the user's Razorpay subscription.
 *       Access is retained until the end of the current billing period,
 *       after which the plan reverts to free.
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *       400:
 *         description: No active subscription found
 *       401:
 *         description: Unauthorized
 */
router.delete("/subscription", protect, cancelSubscriptionController);

export default router;
