// src/config/env.ts

import dotenv from "dotenv";
dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  PORT: process.env.PORT || "5000",
  DATABASE_URL: required("DATABASE_URL"),
  MONGO_URI: required("MONGO_URI"),
  JWT_SECRET: required("JWT_SECRET"),
  SMTP_USER: required("SMTP_USER"),
  SMTP_PASS: required("SMTP_PASS"),
  EMAIL_FROM: required("EMAIL_FROM"),
  APP_URL: process.env.APP_URL || "http://localhost:3000",

  // ── Razorpay (Phase 1 — Monetization) ──────────────────────────
  // Get these from https://dashboard.razorpay.com → Settings → API Keys
  RAZORPAY_KEY_ID: required("RAZORPAY_KEY_ID"),
  RAZORPAY_KEY_SECRET: required("RAZORPAY_KEY_SECRET"),

  // Webhook secret — from Dashboard → Webhooks → your webhook → Secret
  RAZORPAY_WEBHOOK_SECRET: required("RAZORPAY_WEBHOOK_SECRET"),

  // Plan IDs — from Dashboard → Subscriptions → Plans
  RAZORPAY_PLAN_PRO: required("RAZORPAY_PLAN_PRO"),
  RAZORPAY_PLAN_ENTERPRISE: required("RAZORPAY_PLAN_ENTERPRISE"),
};
