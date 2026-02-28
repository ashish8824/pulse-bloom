// src/config/env.ts
//
// Add these new variables to your .env file:
//
//   APP_URL=http://localhost:3000      ← your frontend URL (for reset password link)
//
// All other existing variables remain the same.

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
  MONGO_URI: required("MONGO_URI"), // ← add this line
  JWT_SECRET: required("JWT_SECRET"),
  SMTP_USER: required("SMTP_USER"),
  SMTP_PASS: required("SMTP_PASS"),
  EMAIL_FROM: required("EMAIL_FROM"),
  APP_URL: process.env.APP_URL || "http://localhost:3000",
};
