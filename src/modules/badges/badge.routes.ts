// src/modules/badges/badge.routes.ts
//
// ROUTES — mounts under /api/badges in app.ts
//
// All routes require authentication via the protect middleware.

import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { getBadgesHandler } from "./badge.controller";

const router = Router();

/**
 * @swagger
 * /api/badges:
 *   get:
 *     summary: Get badge shelf (earned + locked badges)
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full badge shelf with earned dates and locked hints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 earned:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:        { type: string }
 *                       type:      { type: string }
 *                       icon:      { type: string }
 *                       label:     { type: string }
 *                       description: { type: string }
 *                       category:  { type: string, enum: [mood, habit, achievement] }
 *                       relatedId: { type: string, nullable: true }
 *                       earnedAt:  { type: string, format: date-time }
 *                 locked:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:      { type: string }
 *                       icon:      { type: string }
 *                       label:     { type: string }
 *                       description: { type: string }
 *                       hint:      { type: string }
 *                       category:  { type: string }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:     { type: integer }
 *                     earned:    { type: integer }
 *                     remaining: { type: integer }
 */
router.get("/", protect, getBadgesHandler);

export default router;
