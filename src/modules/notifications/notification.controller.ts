// src/modules/notifications/notification.controller.ts

import { Request, Response, NextFunction } from "express";
import { notificationQuerySchema } from "./notification.validation";
import {
  getNotifications,
  getUnreadCount,
  markOneAsRead,
  markAllAsRead,
} from "./notification.service";

// ─────────────────────────────────────────────────────────────────
// NOTIFICATION CONTROLLERS — thin HTTP adapter layer
//
// Responsibilities (ONLY these):
//   1. Parse and validate input via Zod schemas
//   2. Call the service layer
//   3. Send the HTTP response
//   4. Forward ALL errors to next()
//
// No business logic. No DB calls.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// GET /api/notifications
//
// Returns paginated notifications for the authenticated user.
// Unread notifications appear first, then chronological history.
// Default: page 1, limit 20.
// ─────────────────────────────────────────────────────────────────
export const getNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit } = notificationQuerySchema.parse(req.query);
    const result = await getNotifications(req.userId!, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
//
// Returns the count of unread notifications.
// This is a lightweight endpoint the frontend polls on page load
// to drive the notification badge (e.g. the red dot on the bell icon).
//
// Response: { unreadCount: number }
// ─────────────────────────────────────────────────────────────────
export const getUnreadCountController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getUnreadCount(req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read
//
// Marks a single notification as read.
// The service verifies ownership — a user cannot mark another
// user's notification as read (same 404 either way).
//
// Idempotent: calling this on an already-read notification returns 200.
// ─────────────────────────────────────────────────────────────────
export const markAsReadController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await markOneAsRead(req.params.id, req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /api/notifications/read-all
//
// Marks ALL of the user's unread notifications as read.
// Returns the count of updated rows.
//
// Response: { message: "5 notifications marked as read.", updated: 5 }
// ─────────────────────────────────────────────────────────────────
export const markAllAsReadController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await markAllAsRead(req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
