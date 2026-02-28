-- ─────────────────────────────────────────────────────────────────
-- Migration: auth_enhancement
-- Manually edited to handle existing rows in User table.
--
-- The issue: Prisma tried to add `updatedAt` as NOT NULL with no default,
-- which fails when rows already exist in the table.
--
-- Fix: Add the column as NULLABLE first → backfill existing rows
--       → then add the NOT NULL constraint.
-- ─────────────────────────────────────────────────────────────────

-- Step 1: Add `isVerified` with a default (safe — no existing-row issues)
ALTER TABLE "User" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Add `updatedAt` as NULLABLE first (avoids the existing-row error)
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Step 3: Backfill all existing rows with the current timestamp
UPDATE "User" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

-- Step 4: Now enforce NOT NULL (all rows have a value, so this is safe)
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Step 5: Create RefreshToken table
CREATE TABLE "RefreshToken" (
    "id"        TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_token_idx"        ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx"       ON "RefreshToken"("userId");

ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Create EmailVerification table
CREATE TABLE "EmailVerification" (
    "id"        TEXT NOT NULL,
    "otp"       TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailVerification_userId_idx" ON "EmailVerification"("userId");

ALTER TABLE "EmailVerification"
    ADD CONSTRAINT "EmailVerification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Create PasswordReset table
CREATE TABLE "PasswordReset" (
    "id"        TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");
CREATE INDEX "PasswordReset_token_idx"        ON "PasswordReset"("token");
CREATE INDEX "PasswordReset_userId_idx"       ON "PasswordReset"("userId");

ALTER TABLE "PasswordReset"
    ADD CONSTRAINT "PasswordReset_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- IMPORTANT: Existing users are set to isVerified = false by default.
-- Run the line below if you want existing users to stay logged in
-- after deploying the new auth logic (recommended for dev):
-- ─────────────────────────────────────────────────────────────────
UPDATE "User" SET "isVerified" = true;
