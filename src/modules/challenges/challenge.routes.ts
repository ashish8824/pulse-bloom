// src/modules/challenges/challenge.routes.ts
//
// ROUTES — mounts under /api/challenges in app.ts
//
// All routes require authentication.
// Leaderboards for public challenges could be made public in the
// future — auth is kept here for now to prevent scraping.

import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  createChallengeHandler,
  listChallengesHandler,
  getMyChallengesHandler,
  getJoinedChallengesHandler,
  joinChallengeHandler,
  completeChallengeHandler,
  getLeaderboardHandler,
} from "./challenge.controller";

const router = Router();

// ─────────────────────────────────────────────────────────────────
// COLLECTION ROUTES
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Challenges
 *   description: Time-boxed habit goals. Create public or private challenges, invite others with a join code, and track progress on a leaderboard.
 */

/**
 * @swagger
 * /api/challenges:
 *   get:
 *     summary: Browse public challenges
 *     description: |
 *       Returns a paginated list of all public challenges.
 *       Use `?active=true` to show only ongoing challenges.
 *       Sorted newest first. Each result includes a `participantCount`
 *       so the frontend can show how many people have joined.
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
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
 *           maximum: 20
 *           default: 10
 *         description: Results per page (max 20)
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: "true = only active challenges | false = only ended challenges | omit = all"
 *     responses:
 *       200:
 *         description: Paginated public challenges list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 challenges:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45"
 *                       title:
 *                         type: string
 *                         example: "30 Days of Morning Meditation"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: "Meditate every morning for 30 days straight."
 *                       habitId:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                       targetDays:
 *                         type: integer
 *                         example: 30
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-03-01T00:00:00.000Z"
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-03-31T00:00:00.000Z"
 *                       isPublic:
 *                         type: boolean
 *                         example: true
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdBy:
 *                         type: string
 *                         format: uuid
 *                         example: "c9d8e7f6-a5b4-3c2d-1e0f-9a8b7c6d5e4f"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-02-28T10:00:00.000Z"
 *                       participantCount:
 *                         type: integer
 *                         example: 12
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 47
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.get("/", protect, listChallengesHandler);

/**
 * @swagger
 * /api/challenges:
 *   post:
 *     summary: Create a new challenge
 *     description: |
 *       Creates a challenge and automatically joins the creator as participant #1.
 *       `endDate` is computed server-side as `startDate + targetDays`.
 *       A unique 8-character `joinCode` is generated automatically for private sharing.
 *
 *       **Habit-linked challenges:** set `habitId` to link the challenge to one of
 *       your habits. When any participant completes that habit, their challenge
 *       progress advances automatically — no manual tracking needed.
 *
 *       **Free-form challenges:** omit `habitId`. Participants manually mark days
 *       complete via `POST /api/challenges/:id/complete`.
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - targetDays
 *               - startDate
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: "30 Days of Morning Meditation"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *                 example: "Meditate every morning for 30 days straight."
 *               habitId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Link to an existing habit. Completions auto-advance progress.
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               targetDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 example: 30
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Cannot be in the past. Use today or a future date.
 *                 example: "2026-03-01"
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *                 description: "true = appears in public feed | false = invite-only via joinCode"
 *                 example: true
 *           examples:
 *             habit_linked:
 *               summary: Habit-linked public challenge
 *               value:
 *                 title: "30 Days of Morning Meditation"
 *                 description: "Meditate every morning for 30 days straight."
 *                 habitId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 targetDays: 30
 *                 startDate: "2026-03-01"
 *                 isPublic: true
 *             free_form_private:
 *               summary: Free-form private challenge
 *               value:
 *                 title: "Drink 2L of Water Daily"
 *                 targetDays: 21
 *                 startDate: "2026-03-05"
 *                 isPublic: false
 *     responses:
 *       201:
 *         description: Challenge created. Creator is auto-joined as participant #1.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 challenge:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45"
 *                     title:
 *                       type: string
 *                       example: "30 Days of Morning Meditation"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     habitId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     targetDays:
 *                       type: integer
 *                       example: 30
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-03-01T00:00:00.000Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-03-31T00:00:00.000Z"
 *                     isPublic:
 *                       type: boolean
 *                       example: true
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     joinCode:
 *                       type: string
 *                       example: "A3F9E201"
 *                       description: Share this code with friends to invite them to a private challenge.
 *                     createdBy:
 *                       type: string
 *                       format: uuid
 *                     participantCount:
 *                       type: integer
 *                       example: 1
 *                       description: Always 1 on creation (creator is auto-joined).
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error (e.g. startDate in the past, targetDays out of range)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post("/", protect, createChallengeHandler);

/**
 * @swagger
 * /api/challenges/mine:
 *   get:
 *     summary: Challenges you created
 *     description: |
 *       Returns all challenges created by the authenticated user.
 *       Includes `joinCode` so the creator can share private challenge links.
 *       Sorted newest first.
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of challenges created by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 challenges:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                         example: "30 Days of Morning Meditation"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       targetDays:
 *                         type: integer
 *                         example: 30
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       isPublic:
 *                         type: boolean
 *                       isActive:
 *                         type: boolean
 *                       joinCode:
 *                         type: string
 *                         example: "A3F9E201"
 *                         description: Only visible to the creator.
 *                       participantCount:
 *                         type: integer
 *                         example: 12
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.get("/mine", protect, getMyChallengesHandler);

/**
 * @swagger
 * /api/challenges/joined:
 *   get:
 *     summary: Challenges you have joined (with progress)
 *     description: |
 *       Returns all challenges the authenticated user has joined (including challenges they created).
 *       Each result includes a `progress` object with `completionsCount`, `progressPct`, and
 *       `isCompleted` so the frontend can render a progress bar without an extra API call.
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Joined challenges with progress data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 challenges:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                         example: "30 Days of Morning Meditation"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       targetDays:
 *                         type: integer
 *                         example: 30
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       isActive:
 *                         type: boolean
 *                       habitId:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       progress:
 *                         type: object
 *                         properties:
 *                           completionsCount:
 *                             type: integer
 *                             example: 14
 *                             description: How many days the user has completed so far.
 *                           targetDays:
 *                             type: integer
 *                             example: 30
 *                           progressPct:
 *                             type: integer
 *                             example: 47
 *                             description: Percentage toward completion (0–100), capped at 100.
 *                           isCompleted:
 *                             type: boolean
 *                             example: false
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             example: null
 *                       joinedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.get("/joined", protect, getJoinedChallengesHandler);

// ─────────────────────────────────────────────────────────────────
// INSTANCE ROUTES
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/challenges/{id}/join:
 *   post:
 *     summary: Join a challenge
 *     description: |
 *       **Public challenge:** pass the challenge `id` in the URL path. Body can be empty.
 *
 *       **Private challenge:** pass `joinCode` in the request body.
 *       The `id` in the URL path is ignored when `joinCode` is provided —
 *       the challenge is looked up by the code.
 *
 *       Returns `409` if you have already joined. Returns `400` if the challenge has ended.
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Challenge ID. Required for public join. Pass any placeholder UUID for private join.
 *         example: "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               joinCode:
 *                 type: string
 *                 description: 8-character code for private challenges. Omit for public challenges.
 *                 example: "A3F9E201"
 *           examples:
 *             public_join:
 *               summary: Join a public challenge (no body needed)
 *               value: {}
 *             private_join:
 *               summary: Join a private challenge via join code
 *               value:
 *                 joinCode: "A3F9E201"
 *     responses:
 *       200:
 *         description: Successfully joined the challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You joined \"30 Days of Morning Meditation\"! Complete 30 days to finish."
 *                 challengeId:
 *                   type: string
 *                   format: uuid
 *                   example: "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45"
 *                 targetDays:
 *                   type: integer
 *                   example: 30
 *       400:
 *         description: Challenge has ended and is no longer accepting participants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "This challenge has ended and is no longer accepting participants"
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Challenge not found (invalid ID or join code)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Challenge not found"
 *       409:
 *         description: Already joined this challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You have already joined this challenge"
 */
router.post("/:id/join", protect, joinChallengeHandler);

/**
 * @swagger
 * /api/challenges/{id}/complete:
 *   post:
 *     summary: Manually mark a challenge day complete
 *     description: |
 *       For **free-form challenges** (no linked `habitId`) only.
 *
 *       Habit-linked challenges advance automatically when the linked habit
 *       is completed via `POST /api/habits/:id/complete` — do not call this
 *       endpoint for habit-linked challenges.
 *
 *       Increments your `completionsCount` by 1. When `completionsCount` reaches
 *       `targetDays`, `isCompleted` is set to `true` and a `CHALLENGE_UPDATE`
 *       notification is fired.
 *
 *       Returns `200` with `alreadyCompleted: true` if you have already finished.
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Challenge ID
 *         example: "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 description: Optional note for this day's completion (stored in memory only, not persisted).
 *                 example: "Really pushed through today despite being tired."
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 completionsCount:
 *                   type: integer
 *                   example: 15
 *                 targetDays:
 *                   type: integer
 *                   example: 30
 *                 progressPct:
 *                   type: integer
 *                   example: 50
 *                   description: Percentage toward completion (0–100).
 *                 isCompleted:
 *                   type: boolean
 *                   example: false
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   example: null
 *                 alreadyCompleted:
 *                   type: boolean
 *                   description: Only present when challenge was already finished before this call.
 *                   example: false
 *             examples:
 *               in_progress:
 *                 summary: Still in progress
 *                 value:
 *                   completionsCount: 15
 *                   targetDays: 30
 *                   progressPct: 50
 *                   isCompleted: false
 *                   completedAt: null
 *               just_completed:
 *                 summary: Challenge just finished on this call
 *                 value:
 *                   completionsCount: 30
 *                   targetDays: 30
 *                   progressPct: 100
 *                   isCompleted: true
 *                   completedAt: "2026-03-31T14:22:00.000Z"
 *               already_done:
 *                 summary: Challenge was already completed before
 *                 value:
 *                   message: "You have already completed this challenge!"
 *                   alreadyCompleted: true
 *                   completedAt: "2026-03-31T14:22:00.000Z"
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: You are not a participant in this challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You are not a participant in this challenge"
 *       404:
 *         description: Challenge not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Challenge not found"
 */
router.post("/:id/complete", protect, completeChallengeHandler);

/**
 * @swagger
 * /api/challenges/{id}/leaderboard:
 *   get:
 *     summary: Challenge leaderboard
 *     description: |
 *       Returns all participants ranked by `completionsCount` (descending).
 *       Ties are broken by `completedAt` ascending — whoever finished first ranks higher.
 *
 *       Each entry includes an `isMe` flag so the frontend can highlight the
 *       authenticated user's own row without client-side ID comparison.
 *
 *       **Access rules:**
 *       - Public challenges: any authenticated user can view.
 *       - Private challenges: only participants can view. Non-participants receive `403`.
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Challenge ID
 *         example: "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45"
 *     responses:
 *       200:
 *         description: Ranked leaderboard for the challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 challengeId:
 *                   type: string
 *                   format: uuid
 *                   example: "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45"
 *                 challengeTitle:
 *                   type: string
 *                   example: "30 Days of Morning Meditation"
 *                 targetDays:
 *                   type: integer
 *                   example: 30
 *                 totalParticipants:
 *                   type: integer
 *                   example: 12
 *                 leaderboard:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rank:
 *                         type: integer
 *                         example: 1
 *                         description: 1-indexed position on the leaderboard.
 *                       name:
 *                         type: string
 *                         example: "Ashish Anand"
 *                         description: Display name only — no email or user ID exposed.
 *                       completionsCount:
 *                         type: integer
 *                         example: 30
 *                       progressPct:
 *                         type: integer
 *                         example: 100
 *                       isCompleted:
 *                         type: boolean
 *                         example: true
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2026-03-31T09:15:00.000Z"
 *                       isMe:
 *                         type: boolean
 *                         example: false
 *                         description: "true for the authenticated user's own row. Use to highlight in the UI."
 *             example:
 *               challengeId: "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45"
 *               challengeTitle: "30 Days of Morning Meditation"
 *               targetDays: 30
 *               totalParticipants: 3
 *               leaderboard:
 *                 - rank: 1
 *                   name: "Ashish Anand"
 *                   completionsCount: 30
 *                   progressPct: 100
 *                   isCompleted: true
 *                   completedAt: "2026-03-31T09:15:00.000Z"
 *                   isMe: true
 *                 - rank: 2
 *                   name: "Priya Sharma"
 *                   completionsCount: 28
 *                   progressPct: 93
 *                   isCompleted: false
 *                   completedAt: null
 *                   isMe: false
 *                 - rank: 3
 *                   name: "Rahul Verma"
 *                   completionsCount: 21
 *                   progressPct: 70
 *                   isCompleted: false
 *                   completedAt: null
 *                   isMe: false
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Private challenge — join first to view the leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "This is a private challenge — join to view the leaderboard"
 *       404:
 *         description: Challenge not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Challenge not found"
 */
router.get("/:id/leaderboard", protect, getLeaderboardHandler);

export default router;
