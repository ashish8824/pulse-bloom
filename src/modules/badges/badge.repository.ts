// src/modules/badges/badge.repository.ts
//
// DB LAYER — all Prisma queries for badges.
//
// WHY SEPARATE FROM SERVICE?
//   The service contains pure business logic (when to award, what to return).
//   The repository contains only SQL/ORM calls. This separation means:
//   - The service can be unit tested by mocking these functions
//   - If we ever swap Prisma for another ORM, only this file changes
//
// All functions receive exactly what they need — no req/res objects.

import { prisma } from "../../config/db";
import { BadgeType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────

/**
 * Get all badges earned by a user.
 * Returns newest first (earnedAt DESC).
 * Used by GET /api/badges to build the full badge shelf.
 */
export const getBadgesByUser = async (userId: string) => {
  return prisma.badge.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
    select: {
      id: true,
      type: true,
      relatedId: true,
      earnedAt: true,
    },
  });
};

/**
 * Check if a user has already earned a specific badge.
 * Used before every award attempt — badge awards are idempotent.
 *
 * WHY NOT USE upsert?
 *   We want to know IF it's new so the service can fire a notification
 *   only on first award. upsert returns the record either way with no
 *   "was this created now?" signal in Prisma without checking created_at.
 *   Explicit check → create is clearer.
 */
export const hasBadge = async (
  userId: string,
  type: BadgeType,
): Promise<boolean> => {
  const existing = await prisma.badge.findUnique({
    where: { userId_type: { userId, type } },
    select: { id: true },
  });
  return existing !== null;
};

// ─────────────────────────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────────────────────────

/**
 * Create a badge record.
 * Only called after hasBadge() confirms it doesn't exist yet.
 * relatedId is optional context (e.g. habitId for IRON_WILL).
 */
export const createBadge = async (
  userId: string,
  type: BadgeType,
  relatedId?: string,
) => {
  return prisma.badge.create({
    data: { userId, type, relatedId },
  });
};
