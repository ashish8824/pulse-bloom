// src/modules/notifications/notification.validation.ts

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// QUERY — GET /api/notifications
//
// page + limit for pagination.
// No date range filtering — the list is always chronological.
// ─────────────────────────────────────────────────────────────────
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─────────────────────────────────────────────────────────────────
// EXPORTED TYPES
// ─────────────────────────────────────────────────────────────────
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
