// src/modules/community/community.routes.ts
//
// ROUTES — mounts under /api/community in app.ts
//
// MIXED AUTH PATTERN:
//   GET /api/community — public (no auth required)
//   POST /api/community — requires auth (to enforce rate limits + spam prevention)
//   POST /api/community/:id/upvote — requires auth (one vote per user)
//
// The GET route intentionally skips the protect middleware so unauthenticated
// users can browse the feed. The controller reads req.userId optionally —
// if present it adds a `hasUpvoted` flag to each post.

import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  createPostHandler,
  getFeedHandler,
  upvoteHandler,
} from "./community.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Community
 *   description: |
 *     Anonymous community feed. Users share milestones and reflections without
 *     revealing their identity. Authentication is required to post or upvote,
 *     but identity is never stored — every post is fully anonymous.
 *
 *     **Anonymity guarantee:** User identity is verified by the auth middleware
 *     to prevent spam, but is discarded before the document is created in MongoDB.
 *     No `userId` is ever stored on a post. Upvote deduplication uses an
 *     HMAC-SHA256 hash of the userId — mathematically irreversible, never exposed.
 */

/**
 * @swagger
 * /api/community:
 *   get:
 *     summary: Browse the anonymous community feed
 *     description: |
 *       **Public endpoint — no authentication required.**
 *
 *       Returns a paginated feed of anonymous posts. Supports two sort modes:
 *       - `newest` (default) — most recently posted first
 *       - `popular` — most upvoted first
 *
 *       Filter by post `type` (MILESTONE or REFLECTION) or by `tag` to narrow results.
 *
 *       **Optional auth:** If you include a valid `Authorization: Bearer <token>` header,
 *       each post will include a `hasUpvoted` boolean so the frontend can show
 *       the upvote button in its active/inactive state without an extra API call.
 *       Without auth, `hasUpvoted` is omitted from all posts.
 *     tags: [Community]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-indexed)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Posts per page (max 50)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, popular]
 *           default: newest
 *         description: "newest = most recently posted | popular = most upvoted"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MILESTONE, REFLECTION]
 *         description: Filter by post type. Omit to return all types.
 *         example: MILESTONE
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag slug (case-insensitive). Omit to return all tags.
 *         example: meditation
 *     responses:
 *       200:
 *         description: Paginated community feed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: MongoDB ObjectId
 *                         example: "65d4fa21bc92b3bcd23e4567"
 *                       type:
 *                         type: string
 *                         enum: [MILESTONE, REFLECTION]
 *                         example: "MILESTONE"
 *                       content:
 *                         type: string
 *                         example: "Just hit a 30-day meditation streak! Never thought I'd make it this far."
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["meditation", "mindfulness", "30-day-streak"]
 *                       upvotes:
 *                         type: integer
 *                         example: 47
 *                       hasUpvoted:
 *                         type: boolean
 *                         example: false
 *                         description: |
 *                           Only present when request is authenticated.
 *                           `true` if the current user has upvoted this post.
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-02-26T08:30:00.000Z"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 342
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 18
 *             examples:
 *               unauthenticated:
 *                 summary: Unauthenticated response (no hasUpvoted field)
 *                 value:
 *                   posts:
 *                     - id: "65d4fa21bc92b3bcd23e4567"
 *                       type: "MILESTONE"
 *                       content: "Just hit a 30-day meditation streak! Never thought I'd make it this far."
 *                       tags: ["meditation", "mindfulness", "streak"]
 *                       upvotes: 47
 *                       createdAt: "2026-02-26T08:30:00.000Z"
 *                   pagination:
 *                     total: 342
 *                     page: 1
 *                     limit: 20
 *                     totalPages: 18
 *               authenticated:
 *                 summary: Authenticated response (includes hasUpvoted)
 *                 value:
 *                   posts:
 *                     - id: "65d4fa21bc92b3bcd23e4567"
 *                       type: "MILESTONE"
 *                       content: "Just hit a 30-day meditation streak! Never thought I'd make it this far."
 *                       tags: ["meditation", "mindfulness", "streak"]
 *                       upvotes: 47
 *                       hasUpvoted: true
 *                       createdAt: "2026-02-26T08:30:00.000Z"
 *                   pagination:
 *                     total: 342
 *                     page: 1
 *                     limit: 20
 *                     totalPages: 18
 */
router.get("/", getFeedHandler);

/**
 * @swagger
 * /api/community:
 *   post:
 *     summary: Submit an anonymous post
 *     description: |
 *       **Requires authentication** (to prevent spam), but your identity is
 *       **never stored**. All posts are fully anonymous — no userId, IP address,
 *       or any other identifying information is saved on the document.
 *
 *       **Post types:**
 *       - `MILESTONE` — share a behavioral achievement (streak hit, badge earned, challenge completed)
 *       - `REFLECTION` — share a thought, insight, or personal observation
 *
 *       **Tags:** up to 5 lowercase slugs (letters, numbers, hyphens only).
 *       Tags power the tag-filter on `GET /api/community?tag=meditation`.
 *
 *       **Content moderation note:** posts are stored as-is. A moderation
 *       layer may be added in a future phase.
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - content
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [MILESTONE, REFLECTION]
 *                 description: Post category.
 *                 example: "MILESTONE"
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: The post body. 10–500 characters.
 *                 example: "Just hit a 30-day meditation streak! Never thought I'd make it this far."
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   pattern: "^[a-z0-9-]+$"
 *                   maxLength: 30
 *                 maxItems: 5
 *                 default: []
 *                 description: Up to 5 lowercase tag slugs. Only letters, numbers, and hyphens.
 *                 example: ["meditation", "mindfulness", "30-day-streak"]
 *           examples:
 *             milestone:
 *               summary: Share a milestone
 *               value:
 *                 type: "MILESTONE"
 *                 content: "Just hit a 30-day meditation streak! Never thought I'd make it this far."
 *                 tags: ["meditation", "mindfulness", "30-day-streak"]
 *             reflection:
 *               summary: Share a reflection (no tags)
 *               value:
 *                 type: "REFLECTION"
 *                 content: "Realized today that showing up consistently matters more than intensity. Small steps every day really do compound."
 *     responses:
 *       201:
 *         description: Post created anonymously. No identity information is stored.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: MongoDB ObjectId of the created post
 *                       example: "65d4fa21bc92b3bcd23e4567"
 *                     type:
 *                       type: string
 *                       enum: [MILESTONE, REFLECTION]
 *                       example: "MILESTONE"
 *                     content:
 *                       type: string
 *                       example: "Just hit a 30-day meditation streak!"
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["meditation", "mindfulness"]
 *                     upvotes:
 *                       type: integer
 *                       example: 0
 *                       description: Always 0 on creation.
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-26T08:30:00.000Z"
 *       400:
 *         description: Validation error (content too short/long, invalid tag format, too many tags)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               content_too_short:
 *                 summary: Content too short
 *                 value:
 *                   message: "Validation error"
 *                   errors:
 *                     - field: "content"
 *                       message: "Post must be at least 10 characters"
 *               invalid_tag:
 *                 summary: Invalid tag format
 *                 value:
 *                   message: "Validation error"
 *                   errors:
 *                     - field: "tags.0"
 *                       message: "Tags can only contain lowercase letters, numbers, and hyphens"
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post("/", protect, createPostHandler);

/**
 * @swagger
 * /api/community/{id}/upvote:
 *   post:
 *     summary: Toggle upvote on a post
 *     description: |
 *       **Toggle semantics:** calling this endpoint twice returns the upvote to its original state.
 *       - First call → adds upvote → `{ upvotes: N+1, hasUpvoted: true }`
 *       - Second call → removes upvote → `{ upvotes: N, hasUpvoted: false }`
 *
 *       **One upvote per user per post** is enforced using an HMAC-SHA256 hash of the
 *       userId. The hash is stored server-side only and is never returned in any
 *       API response — your identity is not exposed by upvoting.
 *
 *       The `upvotes` count on the post is updated atomically.
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the post to upvote
 *         example: "65d4fa21bc92b3bcd23e4567"
 *     responses:
 *       200:
 *         description: Upvote toggled. Returns the new upvote count and current state.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 postId:
 *                   type: string
 *                   description: MongoDB ObjectId of the post
 *                   example: "65d4fa21bc92b3bcd23e4567"
 *                 upvotes:
 *                   type: integer
 *                   description: New total upvote count after toggle.
 *                   example: 48
 *                 hasUpvoted:
 *                   type: boolean
 *                   description: Whether the user now has an upvote on this post.
 *                   example: true
 *             examples:
 *               upvote_added:
 *                 summary: Upvote added (first call)
 *                 value:
 *                   postId: "65d4fa21bc92b3bcd23e4567"
 *                   upvotes: 48
 *                   hasUpvoted: true
 *               upvote_removed:
 *                 summary: Upvote removed (second call)
 *                 value:
 *                   postId: "65d4fa21bc92b3bcd23e4567"
 *                   upvotes: 47
 *                   hasUpvoted: false
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post not found"
 */
router.post("/:id/upvote", protect, upvoteHandler);

export default router;
