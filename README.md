# 🌸 PulseBloom Backend

> Track your pulse. Bloom with intention.

PulseBloom is a **production-grade, AI-ready behavioral analytics backend** designed for high-performance professionals managing stress, productivity, and emotional well-being.

This backend powers a modern SaaS-style platform capable of mood tracking, habit building, statistical analytics, trend detection, burnout risk modeling, behavioral intelligence, gamification, anonymous community sharing, and an AI-powered wellness coach.

Built with scalable architecture, advanced backend logic, and production-level engineering standards.

---

# 🚀 Product Vision

PulseBloom transforms simple daily logs into **actionable behavioral intelligence**.

Instead of basic CRUD tracking, it provides:

- 🔐 Production-Grade Auth — Dual-token JWT, OTP email verification, refresh token rotation
- 📊 Advanced Mood Analytics
- 📈 Weekly Trend Analysis
- 📉 Rolling 7-Day Moving Averages
- 🔥 Burnout Risk Scoring
- 🗓 Mood Logging Streak Engine
- 🌡 GitHub-style Mood Heatmap
- 📆 Monthly Mood Calendar Summary
- 🔍 Day-of-Week + Time-of-Day Behavioural Patterns
- 🧘 Full Habit Tracking Engine with Streak System
- 📅 Habit Heatmaps, Monthly Summaries & Consistency Scoring
- 🗄 Hybrid Database Architecture (PostgreSQL + MongoDB)
- 📘 Fully documented OpenAPI (Swagger)
- ⏰ Automated Habit Reminder Emails (node-cron + Gmail SMTP)
- 🤖 AI-powered Behavioural Insights (Groq)
- 🧠 Journal Sentiment Analysis — async sentiment scoring + theme extraction per journal entry
- 💡 Smart Habit Suggestions — 3 personalized habit recommendations with rationale (Pro)
- 💬 Personalized AI Coach — context-aware chat with full behavioral history injection (Pro)
- 💳 Subscription Billing — Razorpay integration with plan gating (Free / Pro / Enterprise)
- 🏆 Achievement Badge System — 6 badges awarded automatically as behavioral side effects
- 🎯 Challenge System — create, join, and track time-boxed habit goals with leaderboards
- 💬 Anonymous Community Feed — anonymous milestone and reflection sharing with upvotes

This is not a tutorial backend.
This is a **SaaS-ready behavioral analytics engine**.

---

# 🏗 Architecture

PulseBloom follows a **Modular Monolith + Clean Architecture pattern**:

```
Route → Controller → Service → Repository → Database
```

This ensures:

- Clear separation of concerns
- Scalable feature modules
- Testable business logic (services have zero HTTP dependencies)
- Easy future migration to microservices
- Production maintainability

## Folder Structure

```
pulsebloom-backend/
│
├── src/
│   │
│   ├── config/                              # Global configuration
│   │   ├── db.ts                            # Prisma client + PostgreSQL connection pool (pg adapter)
│   │   ├── mongo.ts                         # MongoDB connection via Mongoose
│   │   ├── env.ts                           # Environment variable loading + validation (dotenv)
│   │   └── swagger.ts                       # OpenAPI 3.0 spec config (swagger-jsdoc)
│   │
│   ├── modules/                             # Feature-based modules (Clean Architecture)
│   │   │
│   │   ├── auth/                            # ✅ Authentication Module
│   │   │   ├── auth.controller.ts           # HTTP layer — all 10 auth endpoints
│   │   │   ├── auth.service.ts              # Business logic (register, login, refresh, reset, etc.)
│   │   │   ├── auth.repository.ts           # DB layer — User + RefreshToken + OTP + preferences queries
│   │   │   ├── auth.routes.ts               # All 10 routes with Swagger JSDoc + tiered rate limiting
│   │   │   └── auth.validation.ts           # Zod schemas — register, login, verify, reset, preferences
│   │   │
│   │   ├── mood/                            # ✅ Mood Tracking + Analytics Module
│   │   │   ├── mood.controller.ts           # HTTP layer — all 15 mood endpoints
│   │   │   ├── mood.service.ts              # Business logic (addMood, analytics, burnout, forecast, sentiment trends…)
│   │   │   ├── mood.repository.ts           # DB layer — all Prisma + lean select queries
│   │   │   ├── mood.routes.ts               # All 15 routes with full Swagger JSDoc
│   │   │   ├── mood.validation.ts           # Zod schemas (5 schemas)
│   │   │   └── mood.mongo.ts                # Mongoose schema — JournalEntry + sentimentScore + themes
│   │   │
│   │   ├── habits/                          # ✅ Full Habit Engine Module
│   │   │   ├── habit.controller.ts          # HTTP layer — all 15 habit endpoints
│   │   │   ├── habit.service.ts             # Business logic (streak, analytics, heatmap, badges…)
│   │   │   ├── habit.repository.ts          # DB layer — all Prisma queries (habits + logs)
│   │   │   ├── habit.routes.ts              # All 15 routes with full Swagger JSDoc annotations
│   │   │   └── habit.validation.ts          # Zod schemas (5 schemas)
│   │   │
│   │   ├── ai/                              # ✅ AI Insights + Enhanced AI Module (Phase 5)
│   │   │   ├── ai.controller.ts             # HTTP layer — insights, suggestions, chat
│   │   │   ├── ai.service.ts                # Business logic — behavioral insight generation
│   │   │   ├── ai.repository.ts             # DB layer — mood + habit data for AI context
│   │   │   ├── ai.prompt.ts                 # Groq prompt builder — behavioral insights
│   │   │   ├── ai.routes.ts                 # GET /insights, GET /suggestions, POST /chat
│   │   │   ├── sentiment.prompt.ts          # Groq prompt — sentiment score + theme extraction
│   │   │   ├── sentiment.service.ts         # Fire-and-forget sentiment analysis per journal
│   │   │   ├── suggestions.prompt.ts        # Groq prompt — 3 personalized habit suggestions
│   │   │   ├── suggestions.service.ts       # Suggestions with SHA-256 context-hash caching
│   │   │   ├── chat.mongo.ts                # Mongoose schema — AiConversation (messages array)
│   │   │   ├── chat.prompt.ts               # System prompt builder — injects 90-day behavioral summary
│   │   │   └── chat.service.ts              # AI Coach orchestrator — history + context + Groq
│   │   │
│   │   ├── billing/                         # ✅ Razorpay Billing Module
│   │   │   ├── billing.controller.ts        # HTTP layer — 5 billing endpoints
│   │   │   ├── billing.service.ts           # Business logic (order, verify, webhook, status, cancel)
│   │   │   └── billing.routes.ts            # All 5 routes with full Swagger JSDoc
│   │   │
│   │   ├── analytics/                       # ✅ Cross-module Analytics Module
│   │   │   ├── analytics.controller.ts      # HTTP layer — correlation + habit matrix
│   │   │   ├── analytics.service.ts         # Business logic (correlation #7, matrix #10)
│   │   │   ├── analytics.repository.ts      # DB layer — cross-module Prisma queries
│   │   │   └── analytics.routes.ts          # GET /correlation, GET /habit-matrix
│   │   │
│   │   ├── milestones/                      # ✅ Milestones Module
│   │   │   ├── milestone.controller.ts      # HTTP layer — GET /api/milestones
│   │   │   ├── milestone.service.ts         # Business logic (fire-and-forget awards)
│   │   │   ├── milestone.repository.ts      # DB layer — Milestone Prisma queries
│   │   │   └── milestone.routes.ts          # GET /api/milestones with Swagger JSDoc
│   │   │
│   │   ├── badges/                          # ✅ Achievement Badges Module (Phase 4)
│   │   │   ├── badge.controller.ts          # HTTP layer — GET /api/badges
│   │   │   ├── badge.service.ts             # checkAndAwardHabitBadges, checkAndAwardMoodBadges,
│   │   │   │                                #   getBadges, BADGE_META config
│   │   │   ├── badge.repository.ts          # DB layer — getBadgesByUser, hasBadge, createBadge
│   │   │   └── badge.routes.ts              # GET /api/badges with full Swagger JSDoc
│   │   │
│   │   ├── challenges/                      # ✅ Challenge System Module (Phase 4)
│   │   │   ├── challenge.controller.ts      # HTTP layer — 7 challenge endpoints
│   │   │   ├── challenge.service.ts         # createChallenge, listChallenges, getMyChallenges,
│   │   │   │                                #   getJoinedChallenges, joinChallenge, completeChallenge,
│   │   │   │                                #   getLeaderboard, advanceChallengeProgressForHabit
│   │   │   ├── challenge.repository.ts      # DB layer — Challenge + ChallengeParticipant queries
│   │   │   ├── challenge.validation.ts      # Zod schemas — createChallengeSchema, joinChallengeSchema
│   │   │   └── challenge.routes.ts          # 7 routes with full Swagger JSDoc
│   │   │
│   │   └── community/                       # ✅ Anonymous Community Feed Module (Phase 4)
│   │       ├── community.controller.ts      # HTTP layer — 3 community endpoints
│   │       ├── community.service.ts         # createPost, getFeed, toggleUpvote
│   │       ├── community.repository.ts      # DB layer — MongoDB CommunityPost queries
│   │       ├── community.mongo.ts           # Mongoose schema — CommunityPost (MongoDB)
│   │       └── community.routes.ts          # 3 routes with full Swagger JSDoc (mixed auth pattern)
│   │
│   ├── jobs/
│   │   ├── reminder.cron.ts                 # node-cron — runs every minute (habits + mood reminders)
│   │   ├── weekly.digest.cron.ts            # node-cron — Saturday 8am UTC weekly behavioral digest
│   │   └── notification.cleanup.cron.ts     # node-cron — daily 3am UTC, deletes notifications > 90 days
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts               # JWT verification → attaches req.userId
│   │   ├── error.middleware.ts              # Global error handler (Zod + App + unknown)
│   │   ├── rateLimiter.ts                   # Tiered rate limiting (global + auth-specific)
│   │   └── planLimiter.ts                   # ✅ Plan enforcement middleware (checkPlanLimit)
│   │
│   ├── websocket/                           # 🔮 Upcoming — Socket.io real-time layer
│   │
│   ├── utils/
│   │   ├── jwt.ts                           # generateAccessToken, generateRefreshToken, verifyToken
│   │   ├── date.utils.ts                    # normalizeDailyDate, normalizeWeeklyDate
│   │   ├── logger.ts                        # Structured timestamp logger
│   │   ├── mailer.ts                        # Nodemailer Gmail SMTP — OTP, reset, reminder emails
│   │   └── helpers.ts
│   │
│   ├── types/
│   │   └── express.d.ts                     # Extends Request with req.userId: string
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/                                   # 🔮 Upcoming
│   ├── unit/
│   └── integration/
│
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml                       # Multi-service local + production setup
├── Dockerfile                               # Multi-stage build (builder → runner)
├── tsconfig.json
├── package.json
└── README.md
```

---

# 🔐 Authentication

PulseBloom uses a **dual-token JWT authentication system** with mandatory email verification via OTP.

## Auth Flow Overview

```
Register → OTP Email → Verify Email → Login → Access Token (15m) + Refresh Token (7d)
```

- **Access Token** — short-lived JWT (15 min), sent in `Authorization: Bearer <token>` header
- **Refresh Token** — long-lived opaque token (7 days), stored hashed in DB, used to rotate both tokens silently

## Auth API Reference

| Method  | Endpoint                        | Auth | Rate Limit | Description                                      |
| ------- | ------------------------------- | ---- | ---------- | ------------------------------------------------ |
| `POST`  | `/api/auth/register`            | ❌   | 10/15 min  | Create account, sends OTP email                  |
| `POST`  | `/api/auth/verify-email`        | ❌   | —          | Confirm OTP, issues tokens                       |
| `POST`  | `/api/auth/resend-verification` | ❌   | 3/15 min   | Re-send OTP email                                |
| `POST`  | `/api/auth/login`               | ❌   | 10/15 min  | Login, issues tokens                             |
| `POST`  | `/api/auth/refresh-token`       | ❌   | —          | Rotate access + refresh tokens                   |
| `POST`  | `/api/auth/logout`              | ✅   | —          | Revoke current session                           |
| `GET`   | `/api/auth/me`                  | ✅   | —          | Get authenticated user profile + preferences     |
| `PATCH` | `/api/auth/me/preferences`      | ✅   | —          | Update mood reminder + weekly digest preferences |
| `POST`  | `/api/auth/forgot-password`     | ❌   | 3/15 min   | Send password reset email                        |
| `POST`  | `/api/auth/reset-password`      | ❌   | —          | Set new password via reset token                 |

---

## Register

```
POST /api/auth/register
```

```json
{
  "name": "Ashish Anand",
  "email": "ashish@example.com",
  "password": "MyPass@123"
}
```

**Password rules:** min 8 chars, must contain uppercase, lowercase, number, and special character (`@$!%*?&`).

**Response `201`** — no tokens issued yet. User must verify email first.

```json
{
  "message": "Registration successful. Please check your email for the verification code.",
  "user": {
    "id": "uuid",
    "email": "ashish@example.com",
    "name": "Ashish Anand",
    "isVerified": false
  }
}
```

---

## Verify Email

```
POST /api/auth/verify-email
```

```json
{
  "email": "ashish@example.com",
  "otp": "482931"
}
```

A 6-digit OTP is sent to the registered email. It expires in **15 minutes** and is single-use.

**Response `200`** — tokens are issued for the first time:

```json
{
  "user": {
    "id": "uuid",
    "email": "ashish@example.com",
    "name": "Ashish Anand",
    "isVerified": true,
    "plan": "free"
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3d4...64hexchars",
  "accessTokenExpiresInSeconds": 840
}
```

---

## Login

```
POST /api/auth/login
```

```json
{
  "email": "ashish@example.com",
  "password": "MyPass@123"
}
```

**Response `200`:**

```json
{
  "user": {
    "id": "uuid",
    "email": "ashish@example.com",
    "name": "Ashish Anand",
    "isVerified": true
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3d4...64hexchars",
  "accessTokenExpiresInSeconds": 840
}
```

---

## Refresh Token (Token Rotation)

```
POST /api/auth/refresh-token
```

```json
{ "refreshToken": "a1b2c3d4...64hexchars" }
```

The old refresh token is **immediately revoked**. The client must store the new refresh token returned in the response.

**Security:** If a revoked token is reused (stolen token attack), all sessions for that user are immediately terminated.

Returns the same shape as login.

---

## Logout

```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

```json
{ "refreshToken": "a1b2c3d4...64hexchars" }
```

Revokes the refresh token for this device only. Returns `200` even if already revoked (idempotent).

---

## Forgot Password

```
POST /api/auth/forgot-password
```

```json
{ "email": "ashish@example.com" }
```

Always returns `200` regardless of whether the email is registered — prevents user enumeration. A reset link valid for **1 hour** is sent if the email exists.

---

## Reset Password

```
POST /api/auth/reset-password
```

```json
{
  "token": "c9f3a2...64hexchars",
  "password": "NewPass@456",
  "confirmPassword": "NewPass@456"
}
```

Validates the token, saves the new password, and **revokes all refresh tokens** — forces re-login on all devices.

---

## Get Profile

```
GET /api/auth/me
Authorization: Bearer <accessToken>
```

```json
{
  "user": {
    "id": "uuid",
    "email": "ashish@example.com",
    "name": "Ashish Anand",
    "isVerified": true,
    "createdAt": "2026-02-28T00:00:00.000Z",
    "updatedAt": "2026-02-28T00:00:00.000Z"
  }
}
```

---

## Update Preferences

```
PATCH /api/auth/me/preferences
Authorization: Bearer <accessToken>
```

All fields are optional — send only the ones you want to change.

```json
{ "weeklyDigestOn": false }
```

```json
{ "moodReminderOn": true, "moodReminderTime": "08:30" }
```

```json
{ "moodReminderTime": null }
```

> Sending `moodReminderTime: null` clears the stored time and automatically disables the mood reminder. Sending `moodReminderOn: true` without a `moodReminderTime` requires one to be already stored — otherwise returns `400`.

**Fields:**

| Field              | Type            | Description                                                                      |
| ------------------ | --------------- | -------------------------------------------------------------------------------- |
| `weeklyDigestOn`   | boolean         | Opt in/out of Saturday 8am weekly behavioral email summary                       |
| `moodReminderOn`   | boolean         | Toggle mood check-in reminder. Requires `moodReminderTime` to be set             |
| `moodReminderTime` | `HH:MM` \| null | 24-hour format reminder time. Send `null` to clear and auto-disable the reminder |

**Response `200`:**

```json
{
  "message": "Preferences updated successfully.",
  "preferences": {
    "id": "uuid",
    "weeklyDigestOn": false,
    "moodReminderOn": true,
    "moodReminderTime": "08:30"
  }
}
```

> `GET /api/auth/me` also returns `weeklyDigestOn`, `moodReminderOn`, and `moodReminderTime` alongside the user profile — no separate call needed to pre-populate the preferences UI.

---

## Token Reference

| Property             | Value                    |
| -------------------- | ------------------------ |
| Access token expiry  | 15 minutes               |
| Refresh token expiry | 7 days                   |
| Password hashing     | bcrypt, 12 rounds        |
| OTP expiry           | 15 minutes               |
| Reset token expiry   | 1 hour                   |
| Strategy             | Dual-token with rotation |

All protected routes require:

```
Authorization: Bearer <accessToken>
```

---

# 🔔 Notifications Module

The Notifications Module provides an in-app inbox for behavioral events. Every notification is written to PostgreSQL and surfaced via 4 REST endpoints. The WebSocket delivery layer (Phase 7) will plug into this same data model — the DB layer is already built.

Notifications are automatically cleaned up after **90 days** by a daily 3am cron job.

## 🗺 Notifications API Reference

| Method  | Endpoint                          | Auth | Description                                        |
| ------- | --------------------------------- | ---- | -------------------------------------------------- |
| `GET`   | `/api/notifications`              | ✅   | Paginated list, unread first (`?page=1&limit=20`)  |
| `GET`   | `/api/notifications/unread-count` | ✅   | Lightweight count for notification badge           |
| `PATCH` | `/api/notifications/:id/read`     | ✅   | Mark one notification as read (ownership enforced) |
| `PATCH` | `/api/notifications/read-all`     | ✅   | Mark all notifications as read (bulk)              |

## Notification Types

| Type                   | Trigger                                                        | `relatedId`   |
| ---------------------- | -------------------------------------------------------------- | ------------- |
| `STREAK_MILESTONE`     | Habit streak hits 7, 14, 21, 30, 60, 90, 100, 180, or 365 days | `habitId`     |
| `BURNOUT_RISK_CHANGED` | Burnout risk level shifts (e.g. Low → High)                    | —             |
| `WEEKLY_SUMMARY`       | Saturday 8am digest was generated                              | —             |
| `BADGE_EARNED`         | Achievement badge unlocked (Phase 4)                           | `badgeType`   |
| `CHALLENGE_UPDATE`     | Challenge day completed or challenge finished (Phase 4)        | `challengeId` |
| `MOOD_REMINDER`        | Mood check-in reminder email fired                             | —             |
| `HABIT_REMINDER`       | Habit reminder email fired                                     | `habitId`     |

> `relatedId` lets the frontend deep-link to the relevant screen (e.g. tap a `BADGE_EARNED` notification → navigate to the badge shelf with that badge highlighted).

## Get Notifications

```
GET /api/notifications?page=1&limit=20
Authorization: Bearer <accessToken>
```

**Ordering:** unread notifications always appear first, then most recent read notifications. Maximum 50 per page.

```json
{
  "notifications": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "BADGE_EARNED",
      "title": "💪 Badge Unlocked: Iron Will",
      "message": "30-day streak on a single habit. This is becoming identity.",
      "isRead": false,
      "relatedId": "IRON_WILL",
      "createdAt": "2026-02-26T08:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 47,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

## Get Unread Count

```
GET /api/notifications/unread-count
Authorization: Bearer <accessToken>
```

```json
{ "unreadCount": 5 }
```

## Mark One as Read

```
PATCH /api/notifications/:id/read
Authorization: Bearer <accessToken>
```

Ownership enforced — attempting to mark another user's notification returns `404` to avoid leaking that the ID exists. Idempotent.

## Mark All as Read

```
PATCH /api/notifications/read-all
Authorization: Bearer <accessToken>
```

```json
{
  "message": "5 notifications marked as read.",
  "updated": 5
}
```

## How Notifications Are Created

`createNotification()` in `notification.service.ts` is the single utility all modules call. It is **fire-and-forget safe** — catches all errors internally and never propagates them.

| Event                      | Called from                            | Notification type  |
| -------------------------- | -------------------------------------- | ------------------ |
| Habit streak milestone hit | `habit.service.ts` → `completeHabit()` | `STREAK_MILESTONE` |
| Weekly digest sent         | `weekly.digest.cron.ts`                | `WEEKLY_SUMMARY`   |
| Badge earned               | `badge.service.ts` → `awardBadge()`    | `BADGE_EARNED`     |
| Challenge day completed    | `challenge.service.ts`                 | `CHALLENGE_UPDATE` |

---

# 📊 Mood Module

The Mood Module is a production-grade behavioral logging and analytics engine.

It stores structured mood data in **PostgreSQL** and unstructured journal text in **MongoDB**, with a bidirectional link (`journalId` on the Postgres row ↔ `moodEntryId` on the Mongo document).

## 🗺 Mood API Reference

| Method   | Endpoint                     | Description                                                  |
| -------- | ---------------------------- | ------------------------------------------------------------ |
| `POST`   | `/api/mood`                  | Create mood entry (+ optional journal)                       |
| `GET`    | `/api/mood`                  | Paginated history (`?page` `?limit` `?startDate` `?endDate`) |
| `GET`    | `/api/mood/:id`              | Single entry hydrated with journal text + tags               |
| `PATCH`  | `/api/mood/:id`              | Partial update (score, emoji, journal, tags)                 |
| `DELETE` | `/api/mood/:id`              | Hard delete entry + journal cleanup                          |
| `GET`    | `/api/mood/analytics`        | Summary statistics                                           |
| `GET`    | `/api/mood/streak`           | Consecutive logging streak                                   |
| `GET`    | `/api/mood/heatmap`          | GitHub-style daily heatmap (`?days=365`)                     |
| `GET`    | `/api/mood/summary/monthly`  | Calendar month view (`?month=YYYY-MM`)                       |
| `GET`    | `/api/mood/insights/daily`   | Day-of-week + time-of-day patterns                           |
| `GET`    | `/api/mood/trends/weekly`    | ISO 8601 weekly trend groupings                              |
| `GET`    | `/api/mood/trends/rolling`   | 7-day rolling average                                        |
| `GET`    | `/api/mood/burnout-risk`     | Burnout risk score + level                                   |
| `GET`    | `/api/mood/forecast`         | Predictive mood forecast (`?days=7`, max 14)                 |
| `GET`    | `/api/mood/sentiment/trends` | Weekly sentiment vs mood score correlation (Phase 5)         |

---

## Create Mood Entry

```
POST /api/mood
```

```json
{
  "moodScore": 4,
  "emoji": "😊",
  "journalText": "Had a productive deep work session.",
  "tags": ["work", "exercise"]
}
```

**Fields:**

| Field         | Type        | Required | Description                                       |
| ------------- | ----------- | -------- | ------------------------------------------------- |
| `moodScore`   | integer 1–5 | ✅       | Mood score (1 = very low, 5 = excellent)          |
| `emoji`       | string      | ✅       | Emoji representation of the mood                  |
| `journalText` | string      | ❌       | Up to 5000 characters — saved in MongoDB          |
| `tags`        | string[]    | ❌       | Up to 10 lowercase slugs e.g. `["work", "sleep"]` |

**Response:**

```json
{
  "id": "uuid",
  "moodScore": 4,
  "emoji": "😊",
  "journalId": "65d4fa21bc92b3bcd23e4567",
  "userId": "uuid",
  "createdAt": "2026-02-26T08:30:00.000Z"
}
```

> `journalId` is the MongoDB ObjectId of the linked journal document. `null` if no `journalText` was provided.

**Side effects (fire-and-forget, non-blocking):**

- Mood milestone checks (`FIRST_MOOD_ENTRY`, `MOOD_STREAK_7/14/30`, `BEST_WEEK_MOOD`, `BURNOUT_RECOVERY`)
- Badge checks (`FIRST_STEP`, `WEEK_ONE`, `MINDFUL_MONTH`, `RESILIENT`)
- Journal sentiment analysis via Groq — extracts `sentimentScore` and `themes[]` and writes back to MongoDB (Phase 5)

---

## Mood Logging Streak

```
GET /api/mood/streak
```

```json
{
  "currentStreak": 12,
  "longestStreak": 30,
  "lastLoggedDate": "2026-02-26"
}
```

---

## Burnout Risk Scoring

```
GET /api/mood/burnout-risk
```

**Formula:**

```
riskScore = (lowMoodDays × 2) + (max(0, 3.0 − averageMood) × 3) + (volatility × 1.5)
```

| Score | Level    |
| ----- | -------- |
| 0–5   | Low      |
| 5–10  | Moderate |
| 10+   | High     |

```json
{
  "riskScore": 8.5,
  "riskLevel": "Moderate",
  "metrics": {
    "totalEntries": 14,
    "averageMood": 2.9,
    "lowMoodDays": 4,
    "volatility": 3
  }
}
```

---

## Predictive Mood Forecast

```
GET /api/mood/forecast?days=7
```

**Formula:** `predictedScore = baseline + dayOfWeekAdjustment + (slope × daysAhead)`

| Signal              | Source                     | Description                                |
| ------------------- | -------------------------- | ------------------------------------------ |
| `baseline`          | 30-day average             | Rolling mood average over the past 30 days |
| `dayOfWeekAdjust`   | 90-day day-of-week pattern | How each weekday compares to your baseline |
| `trendContribution` | 14-day linear regression   | Recent trend clamped to ±0.15/day          |

```json
{
  "forecast": [
    {
      "date": "2026-03-04",
      "dayOfWeek": "Wednesday",
      "predictedScore": 4.05,
      "label": "Good",
      "signals": {
        "baseline": 3.6,
        "dayOfWeekAdjustment": 0.5,
        "trendContribution": -0.05
      }
    }
  ],
  "insufficientData": false,
  "basedOn": {
    "baselineDays": 30,
    "baselineAvg": 3.6,
    "trendSlopePerDay": -0.05,
    "entriesAnalyzed": 47
  }
}
```

---

## Mood Database Schema

```prisma
model MoodEntry {
  id        String   @id @default(uuid())
  moodScore Int
  emoji     String
  journalId String?
  userId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, createdAt])
}
```

**MongoDB — JournalEntry (updated in Phase 5):**

```ts
{
  userId: string          // links back to PostgreSQL User.id
  moodEntryId: string     // back-reference to PostgreSQL MoodEntry.id
  text: string            // up to 5000 characters
  tags: string[]          // context slugs e.g. ["work", "sleep"]
  sentimentScore: number  // -1.0 to 1.0 — AI-inferred emotional tone (nullable)
  themes: string[]        // up to 5 AI-extracted topic keywords (e.g. ["productivity", "focus"])
  createdAt: Date
  updatedAt: Date
}
```

> `sentimentScore` and `themes` are populated asynchronously after journal creation. They are `null`/`[]` until the Groq analysis completes (typically within seconds).

---

# 🤖 AI Module _(Enhanced in Phase 5)_

PulseBloom uses **Groq** (llama-3.3-70b-versatile) for all AI features. Three distinct AI capabilities are available, all gated behind the Pro/Enterprise plan.

## 🗺 AI API Reference

| Method | Endpoint              | Plan Gate        | Description                                              |
| ------ | --------------------- | ---------------- | -------------------------------------------------------- |
| `GET`  | `/api/ai/insights`    | Pro + Enterprise | Cross-correlated behavioral insights (SHA-256 cached)    |
| `GET`  | `/api/ai/suggestions` | Pro + Enterprise | 3 personalized habit suggestions with rationale          |
| `POST` | `/api/ai/chat`        | Pro + Enterprise | Conversational AI wellness coach with behavioral context |

---

## Behavioral Insights

```
GET /api/ai/insights
GET /api/ai/insights?refresh=true
```

Generates cross-correlated behavioral insights by analyzing mood scores and habit completion data together. Results are cached in PostgreSQL using a **SHA-256 data hash** — the Groq API is only called when behavioral data has actually changed.

---

## Smart Habit Suggestions _(Phase 5)_

```
GET /api/ai/suggestions
GET /api/ai/suggestions?refresh=true
```

Returns 3 personalized habit recommendations based on the user's current habits, burnout risk, mood patterns, and behavioral context. Never suggests habits already tracked by the user.

**Caching:** SHA-256 hash of the suggestion context (existing habits, burnout level, day/time patterns, average mood). The Groq API is only called when context has meaningfully changed — zero cost on repeated requests with unchanged data.

**Response:**

```json
{
  "suggestions": [
    {
      "title": "5-Minute Evening Walk",
      "frequency": "daily",
      "category": "WELLNESS",
      "rationale": "Your mood averages 2.8 on Thursdays and Fridays. Light movement in the evening has been shown to reduce end-of-week stress accumulation.",
      "expectedMoodImpact": "May improve Friday mood scores by 0.5–1.0 points based on your current patterns."
    }
  ],
  "cached": false,
  "generatedAt": "2026-03-06T10:00:00.000Z",
  "message": "Suggestions generated based on your latest behavioral data."
}
```

---

## Personalized AI Coach _(Phase 5)_

```
POST /api/ai/chat
```

A conversational AI wellness coach that has **full access to the user's 90-day behavioral summary** — mood averages, burnout risk, habit streaks, and completion rates — injected into every call. The coach references your actual data rather than giving generic advice.

**Request body:**

```json
{
  "message": "Why do I always feel worse on Fridays?",
  "conversationId": "65d4fa21bc92b3bcd23e4567"
}
```

| Field            | Type   | Required | Description                                                                   |
| ---------------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `message`        | string | ✅       | User message. Max 1000 characters.                                            |
| `conversationId` | string | ❌       | Continue an existing conversation. Omit or send `null` to start a new thread. |

**Response:**

```json
{
  "reply": "Looking at your data, your mood averages 2.8 on Fridays vs 3.9 on Mondays — one of the largest day-of-week gaps in your history. Your habit completion also drops on Thursdays, which likely compounds into Friday. Would you like to try anchoring one consistent habit on Thursday evenings?",
  "conversationId": "65d4fa21bc92b3bcd23e4567",
  "messageCount": 2
}
```

> **`conversationId` flow:** The first call (no `conversationId`) creates a new conversation and returns its ID. Pass this ID in subsequent requests to continue the same thread. Store it client-side (e.g. in state or localStorage).

**Conversation limits:**

| Limit                            | Value                                        |
| -------------------------------- | -------------------------------------------- |
| Messages sent to AI per call     | Last 10 (context window management)          |
| Messages stored per conversation | Max 50 (older messages pruned automatically) |
| Conversations per user           | Max 20 (oldest deleted on overflow)          |
| Message max length               | 1000 characters                              |

**Behavioral context injected on every call:**

- Average mood score (last 90 days)
- Burnout risk level
- Current mood logging streak
- Active habits with per-habit completion rates and streaks
- Recent low-mood days (last 14 days)

**Conversation storage:** MongoDB `AiConversation` model — `userId`, `conversationId`, `title` (auto-generated from first message), `messages[]` with `role`, `content`, and `timestamp`.

---

## Journal Sentiment Analysis _(Phase 5)_

Sentiment analysis runs **automatically and asynchronously** after every mood entry with journal text. No separate endpoint is required — it fires as a fire-and-forget side effect of `POST /api/mood`.

**What it does:**

- Calls Groq with the journal text (truncated to 2000 chars for cost efficiency)
- Extracts `sentimentScore` (−1.0 to 1.0) representing emotional tone
- Extracts up to 5 `themes[]` as lowercase slugs (e.g. `["productivity", "stress", "sleep"]`)
- Updates the MongoDB `JournalEntry` document with both fields
- Never blocks the mood entry save — all Groq errors are caught internally and logged

**Sentiment Trends Endpoint:**

```
GET /api/mood/sentiment/trends
Authorization: Bearer <accessToken>
```

Returns weekly average sentiment aligned with weekly mood scores, surfacing divergence between what you write and how you rate your mood.

```json
{
  "weeks": [
    {
      "week": "2026-W08",
      "avgSentiment": -0.3,
      "avgMood": 3.8,
      "journalCount": 5,
      "moodEntryCount": 7,
      "topThemes": ["stress", "work", "deadlines"]
    }
  ],
  "insufficientData": false,
  "summary": {
    "divergentWeeks": 2,
    "divergenceNote": "2 week(s) where mood score was high (≥3.5) but journal sentiment was negative (<-0.2). You may be underreporting emotional difficulty."
  }
}
```

> **Divergence insight:** weeks where `avgMood ≥ 3.5` but `avgSentiment < −0.2` signal potential emotional suppression — rating mood positively while journaling negatively.

Requires a minimum of 3 analyzed journals to return data. Returns `insufficientData: true` otherwise.

---

## Groq Configuration Reference

| Feature             | Model                   | Temperature | Max Tokens | Notes                                    |
| ------------------- | ----------------------- | ----------- | ---------- | ---------------------------------------- |
| Behavioral Insights | llama-3.3-70b-versatile | 0.3         | 800        | Structured JSON output                   |
| Sentiment Analysis  | llama-3.3-70b-versatile | 0.1         | 100        | Deterministic extraction, minimal tokens |
| Habit Suggestions   | llama-3.3-70b-versatile | 0.5         | 600        | Creative variety, structured JSON        |
| AI Coach Chat       | llama-3.3-70b-versatile | 0.7         | 400        | Conversational, context-aware            |

---

# 📊 Analytics Module

Cross-module behavioral analytics — computes correlations across mood and habit data.

## 🗺 Analytics API Reference

| Method | Endpoint                      | Description                                   |
| ------ | ----------------------------- | --------------------------------------------- |
| `GET`  | `/api/analytics/correlation`  | Mood ↔ habit lift for each active habit (#7)  |
| `GET`  | `/api/analytics/habit-matrix` | Co-completion rate for every habit pair (#10) |

---

## Mood ↔ Habit Correlation

```
GET /api/analytics/correlation
Authorization: Bearer <accessToken>
```

For each active habit, computes average mood on completion days vs skip days over the last 90 days. `lift = completionDayAvg − skipDayAvg`. Sorted by lift descending.

```json
{
  "correlations": [
    {
      "habitId": "uuid",
      "habitTitle": "Morning Meditation",
      "frequency": "daily",
      "completionDayAvg": 4.2,
      "skipDayAvg": 2.8,
      "lift": 1.4,
      "completionDaysAnalyzed": 18,
      "skipDaysAnalyzed": 12
    }
  ],
  "analyzedDays": 90,
  "moodLoggedDays": 47
}
```

---

## Habit Correlation Matrix

```
GET /api/analytics/habit-matrix
Authorization: Bearer <accessToken>
```

For every pair of active habits, computes co-completion rate: `(bothDays / eitherDays) × 100`.

```json
{
  "matrix": [
    {
      "habitA": { "id": "uuid-1", "title": "Morning Meditation" },
      "habitB": { "id": "uuid-2", "title": "Exercise" },
      "coCompletionRate": 78.57,
      "coCompletedDays": 22,
      "eitherCompletedDays": 28,
      "suggestion": "\"Morning Meditation\" and \"Exercise\" are often completed on the same day. Try intentionally pairing them."
    }
  ],
  "analyzedDays": 90,
  "totalHabits": 3
}
```

---

# 🏆 Milestones Module

Personal records and behavioral achievement timeline.

## 🗺 Milestones API Reference

| Method | Endpoint          | Description                      |
| ------ | ----------------- | -------------------------------- |
| `GET`  | `/api/milestones` | Full timeline, newest first (#9) |

---

## Milestone Types

| Type               | Category    | Icon | Trigger                               |
| ------------------ | ----------- | ---- | ------------------------------------- |
| `FIRST_MOOD_ENTRY` | mood        | 🌱   | Very first mood entry logged          |
| `MOOD_STREAK_7`    | mood        | 🔥   | 7 consecutive days of mood logging    |
| `MOOD_STREAK_14`   | mood        | 🔥   | 14 consecutive days of mood logging   |
| `MOOD_STREAK_30`   | mood        | 🏆   | 30 consecutive days of mood logging   |
| `HABIT_STREAK_7`   | habit       | ⚡   | 7-day habit streak                    |
| `HABIT_STREAK_14`  | habit       | ⚡   | 14-day habit streak                   |
| `HABIT_STREAK_21`  | habit       | 🌟   | 21-day habit streak                   |
| `HABIT_STREAK_30`  | habit       | 🏆   | 30-day habit streak                   |
| `HABIT_STREAK_60`  | habit       | 🏆   | 60-day habit streak                   |
| `HABIT_STREAK_90`  | habit       | 💎   | 90-day habit streak                   |
| `HABIT_STREAK_100` | habit       | 💎   | 100-day habit streak                  |
| `HABIT_STREAK_180` | habit       | 👑   | 180-day habit streak                  |
| `HABIT_STREAK_365` | habit       | 👑   | 365-day habit streak                  |
| `BEST_WEEK_MOOD`   | achievement | ✨   | New personal best weekly mood average |
| `BURNOUT_RECOVERY` | achievement | 🌸   | Burnout risk dropped from High → Low  |

---

# 🧘 Habits Module

The Habits Module is the core of PulseBloom's behavioral intelligence layer.

## 🗺 Habit API Reference

| Method   | Endpoint                    | Description                                 |
| -------- | --------------------------- | ------------------------------------------- |
| `POST`   | `/api/habits`               | Create a habit                              |
| `GET`    | `/api/habits`               | List active habits (`?category=`)           |
| `GET`    | `/api/habits/archived`      | List archived habits                        |
| `PATCH`  | `/api/habits/reorder`       | Bulk reorder (atomic transaction)           |
| `PATCH`  | `/api/habits/:id`           | Partial update                              |
| `DELETE` | `/api/habits/:id`           | Soft-delete (archive)                       |
| `PATCH`  | `/api/habits/:id/restore`   | Restore archived habit                      |
| `POST`   | `/api/habits/:id/complete`  | Mark as completed (with optional note)      |
| `DELETE` | `/api/habits/:id/complete`  | Undo last completion                        |
| `PATCH`  | `/api/habits/:id/reminder`  | Update reminder settings                    |
| `GET`    | `/api/habits/:id/streak`    | Current active streak                       |
| `GET`    | `/api/habits/:id/analytics` | Full analytics + consistency score          |
| `GET`    | `/api/habits/:id/summary`   | Monthly calendar summary (`?month=YYYY-MM`) |
| `GET`    | `/api/habits/:id/heatmap`   | Heatmap data (`?days=365`)                  |
| `GET`    | `/api/habits/:id/logs`      | Paginated log history (`?page=1&limit=20`)  |

---

## Habit Completion

```
POST /api/habits/:id/complete
```

```json
{ "note": "Felt really focused today" }
```

**Response includes streak milestone detection:**

```json
{
  "message": "Habit marked as completed",
  "log": { "id": "uuid", "date": "2026-02-23T00:00:00.000Z", "note": "..." },
  "currentStreak": 30,
  "milestone": { "days": 30, "message": "Amazing! You hit a 30-day streak!" }
}
```

**Side effects (fire-and-forget, non-blocking):**

- Streak milestone awards (`HABIT_STREAK_7` through `HABIT_STREAK_365`)
- Badge checks → `IRON_WILL` (streak ≥ 30) and `CENTURION` (streak ≥ 100)
- Challenge progress auto-advance for all active challenges linked to this habit

---

## Habit Analytics

```
GET /api/habits/:id/analytics
```

```json
{
  "totalCompletions": 18,
  "totalPossiblePeriods": 30,
  "completionRate": 72.5,
  "currentStreak": 5,
  "longestStreak": 12,
  "missedPeriods": 12,
  "bestDayOfWeek": "Monday",
  "consistencyScore": 68.3
}
```

---

# 🏅 Badges Module _(Phase 4)_

Achievement badges are awarded automatically as **fire-and-forget side effects** inside `completeHabit()` and `addMood()`. Badge failures never crash primary operations. Each badge is awarded once per user — idempotency enforced by `@@unique([userId, type])`.

## 🗺 Badges API Reference

| Method | Endpoint      | Auth | Description                                             |
| ------ | ------------- | ---- | ------------------------------------------------------- |
| `GET`  | `/api/badges` | ✅   | Badge shelf — earned (with dates) + locked (with hints) |

---

## Get Badge Shelf

```
GET /api/badges
Authorization: Bearer <accessToken>
```

Returns two lists: earned badges with metadata and `earnedAt`, and all locked badges with hint text so users know how to unlock them. This is better retention UX than showing only earned badges.

```json
{
  "earned": [
    {
      "id": "uuid",
      "type": "IRON_WILL",
      "icon": "💪",
      "label": "Iron Will",
      "description": "30-day streak on a single habit. This is becoming identity.",
      "category": "habit",
      "relatedId": "habit-uuid",
      "earnedAt": "2026-02-26T08:30:00.000Z"
    }
  ],
  "locked": [
    {
      "type": "CENTURION",
      "icon": "🏅",
      "label": "Centurion",
      "description": "100-day streak on a single habit. Legendary consistency.",
      "category": "habit",
      "hint": "Reach a 100-day streak on any habit."
    }
  ],
  "summary": {
    "total": 6,
    "earned": 2,
    "remaining": 4
  }
}
```

---

## Badge Types

| Badge         | Type            | Category    | Icon | Unlock Condition                            |
| ------------- | --------------- | ----------- | ---- | ------------------------------------------- |
| First Step    | `FIRST_STEP`    | mood        | 🌱   | Log your first mood entry                   |
| Week One      | `WEEK_ONE`      | mood        | 🔥   | 7-day consecutive mood logging streak       |
| Iron Will     | `IRON_WILL`     | habit       | 💪   | Reach a 30-day streak on any single habit   |
| Mindful Month | `MINDFUL_MONTH` | mood        | 🧘   | Log mood every day of a full calendar month |
| Resilient     | `RESILIENT`     | achievement | 🌸   | Burnout risk drops from High → Low          |
| Centurion     | `CENTURION`     | habit       | 🏅   | Reach a 100-day streak on any single habit  |

---

# 🎯 Challenges Module _(Phase 4)_

The Challenge System allows users to create time-boxed habit goals, invite others via a join code, and compete on a leaderboard.

**Two challenge types:**

- **Habit-linked** — linked to an existing habit via `habitId`. Progress advances automatically every time the participant completes that habit. No manual tracking needed.
- **Free-form** — no linked habit. Participants manually mark days complete via `POST /api/challenges/:id/complete`.

## 🗺 Challenges API Reference

| Method | Endpoint                          | Auth | Description                                           |
| ------ | --------------------------------- | ---- | ----------------------------------------------------- |
| `GET`  | `/api/challenges`                 | ✅   | Browse public challenges (`?page` `?limit` `?active`) |
| `POST` | `/api/challenges`                 | ✅   | Create a challenge (creator auto-joined as #1)        |
| `GET`  | `/api/challenges/mine`            | ✅   | Challenges you created (includes `joinCode`)          |
| `GET`  | `/api/challenges/joined`          | ✅   | Challenges you joined (with nested progress object)   |
| `POST` | `/api/challenges/:id/join`        | ✅   | Join public (by ID) or private (by `joinCode`)        |
| `POST` | `/api/challenges/:id/complete`    | ✅   | Manually mark a day complete (free-form only)         |
| `GET`  | `/api/challenges/:id/leaderboard` | ✅   | Ranked leaderboard with `isMe` flag                   |

---

## Create a Challenge

```
POST /api/challenges
Authorization: Bearer <accessToken>
```

```json
{
  "title": "30 Days of Morning Meditation",
  "description": "Meditate every morning for 30 days straight.",
  "habitId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "targetDays": 30,
  "startDate": "2026-03-01",
  "isPublic": true
}
```

**Fields:**

| Field         | Type           | Required | Description                                                              |
| ------------- | -------------- | -------- | ------------------------------------------------------------------------ |
| `title`       | string 3–100   | ✅       | Challenge display name                                                   |
| `description` | string max 500 | ❌       | Optional context                                                         |
| `habitId`     | UUID           | ❌       | Link to an existing habit — completions auto-advance progress            |
| `targetDays`  | integer 1–365  | ✅       | Duration of the challenge                                                |
| `startDate`   | date           | ✅       | Cannot be in the past. `endDate` is computed as `startDate + targetDays` |
| `isPublic`    | boolean        | ❌       | `true` = appears in public feed. `false` = invite-only via `joinCode`    |

**Response `201`:**

```json
{
  "challenge": {
    "id": "b3f1e9a2-4c72-4f8d-bc12-9d1a3e7f0b45",
    "title": "30 Days of Morning Meditation",
    "targetDays": 30,
    "startDate": "2026-03-01T00:00:00.000Z",
    "endDate": "2026-03-31T00:00:00.000Z",
    "isPublic": true,
    "isActive": true,
    "joinCode": "A3F9E201",
    "createdBy": "uuid",
    "participantCount": 1
  }
}
```

> `joinCode` is an 8-character uppercase hex code. Share it with friends to let them join a private challenge.

---

## Join a Challenge

```
POST /api/challenges/:id/join
Authorization: Bearer <accessToken>
```

**Public challenge** — body can be empty. Pass the challenge `id` in the URL.

**Private challenge** — pass `joinCode` in the body. The URL `id` is ignored when `joinCode` is provided.

```json
{ "joinCode": "A3F9E201" }
```

---

## Challenge Leaderboard

```
GET /api/challenges/:id/leaderboard
Authorization: Bearer <accessToken>
```

Ranked by `completionsCount` descending. Ties broken by `completedAt` ascending (finished first ranks higher). The `isMe` flag lets the frontend highlight the authenticated user's row without client-side ID comparison.

```json
{
  "challengeId": "b3f1e9a2-...",
  "challengeTitle": "30 Days of Morning Meditation",
  "targetDays": 30,
  "totalParticipants": 3,
  "leaderboard": [
    {
      "rank": 1,
      "name": "Ashish Anand",
      "completionsCount": 30,
      "progressPct": 100,
      "isCompleted": true,
      "completedAt": "2026-03-31T09:15:00.000Z",
      "isMe": true
    },
    {
      "rank": 2,
      "name": "Priya Sharma",
      "completionsCount": 28,
      "progressPct": 93,
      "isCompleted": false,
      "completedAt": null,
      "isMe": false
    }
  ]
}
```

---

# 💬 Community Module _(Phase 4)_

The Anonymous Community Feed lets users share behavioral milestones and personal reflections with the community — without ever revealing their identity.

**Anonymity guarantee:** Authentication is required to post or upvote (preventing spam), but user identity is **never stored** on any post document. No `userId`, IP, or identifying data is persisted. Upvote deduplication uses `HMAC-SHA256(userId, serverSecret)` — same user always produces the same hash (idempotency), but the hash is mathematically irreversible (privacy). The hash is stored server-side only and never returned in any API response.

## 🗺 Community API Reference

| Method | Endpoint                    | Auth        | Description                                  |
| ------ | --------------------------- | ----------- | -------------------------------------------- |
| `GET`  | `/api/community`            | ❌ Optional | Browse the anonymous feed (public)           |
| `POST` | `/api/community`            | ✅          | Submit an anonymous post (identity stripped) |
| `POST` | `/api/community/:id/upvote` | ✅          | Toggle upvote — one vote per user per post   |

---

## Browse the Feed (Public)

```
GET /api/community?page=1&limit=20&sort=popular&type=MILESTONE&tag=meditation
```

**No authentication required.** Optional auth adds a `hasUpvoted` flag to each post so the frontend can show the upvote button in its active/inactive state.

**Query parameters:**

| Parameter | Type    | Default  | Description                                            |
| --------- | ------- | -------- | ------------------------------------------------------ |
| `page`    | integer | 1        | Page number (1-indexed)                                |
| `limit`   | integer | 20       | Posts per page (max 50)                                |
| `sort`    | string  | `newest` | `newest` = most recent first, `popular` = most upvoted |
| `type`    | string  | —        | Filter by `MILESTONE` or `REFLECTION`. Omit for all.   |
| `tag`     | string  | —        | Filter by tag slug (case-insensitive)                  |

```json
{
  "posts": [
    {
      "id": "65d4fa21bc92b3bcd23e4567",
      "type": "MILESTONE",
      "content": "Just hit a 30-day meditation streak! Never thought I'd make it this far.",
      "tags": ["meditation", "mindfulness", "streak"],
      "upvotes": 47,
      "hasUpvoted": true,
      "createdAt": "2026-02-26T08:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 342,
    "page": 1,
    "limit": 20,
    "totalPages": 18
  }
}
```

---

## Submit an Anonymous Post

```
POST /api/community
Authorization: Bearer <accessToken>
```

```json
{
  "type": "MILESTONE",
  "content": "Just hit a 30-day meditation streak! Never thought I'd make it this far.",
  "tags": ["meditation", "mindfulness", "30-day-streak"]
}
```

**Fields:**

| Field     | Type                      | Required | Description                                              |
| --------- | ------------------------- | -------- | -------------------------------------------------------- |
| `type`    | `MILESTONE`\|`REFLECTION` | ✅       | Post category                                            |
| `content` | string 10–500             | ✅       | Post body. 10–500 characters.                            |
| `tags`    | string[]                  | ❌       | Up to 5 lowercase slugs (`^[a-z0-9-]+$`). Default: `[]`. |

---

## Toggle Upvote

```
POST /api/community/:id/upvote
Authorization: Bearer <accessToken>
```

**Toggle semantics:** calling this endpoint twice returns the upvote to its original state.

```json
{
  "postId": "65d4fa21bc92b3bcd23e4567",
  "upvotes": 48,
  "hasUpvoted": true
}
```

---

# ⏰ Reminder Cron Job

```
Every minute:
  1. Get current time as "HH:MM"
  2. Query habits WHERE reminderOn=true AND reminderTime="HH:MM"
  3. For each habit → check if already completed this period
  4. Not completed → send reminder email via Gmail SMTP
  5. Already completed → skip silently
```

Error isolation via `Promise.allSettled()` — if one email fails, all other reminders still fire.

---

# 💳 Billing Module

PulseBloom uses **Razorpay** for subscription billing with plan-based feature gating across the entire API.

## Plan Limits

| Tier       | Habits    | Mood History | AI Features | Team Features |
| ---------- | --------- | ------------ | ----------- | ------------- |
| Free       | 3 max     | 30 days      | ❌          | ❌            |
| Pro        | Unlimited | Full history | ✅          | ❌            |
| Enterprise | Unlimited | Full history | ✅          | ✅            |

> AI features on Pro/Enterprise: Behavioral Insights, Smart Habit Suggestions, AI Coach Chat, Journal Sentiment Trends.

## 🗺 Billing API Reference

| Method   | Endpoint                    | Auth | Description                                        |
| -------- | --------------------------- | ---- | -------------------------------------------------- |
| `POST`   | `/api/billing/order`        | ✅   | Create Razorpay order — Step 1 of checkout         |
| `POST`   | `/api/billing/verify`       | ✅   | Verify payment + upgrade plan — Step 2             |
| `POST`   | `/api/billing/webhook`      | ❌   | Razorpay webhook receiver (subscription lifecycle) |
| `GET`    | `/api/billing/status`       | ✅   | Current plan, renewal date, manage link            |
| `DELETE` | `/api/billing/subscription` | ✅   | Cancel subscription at end of billing period       |

---

# 🗄 Hybrid Database Architecture

## PostgreSQL (Structured Data)

Managed via **Prisma ORM** with a `pg` connection pool adapter.

Stores: Users, RefreshTokens, MoodEntry, Habit, HabitLog, AiInsight cache (with `type` discriminator for insights vs suggestions), Subscription, Milestone, Badge, Challenge, ChallengeParticipant.

Used for: Filtering, pagination, sorting, analytics, streak queries, transactional reordering, cron job queries, plan enforcement, badge idempotency checks, challenge leaderboards, AI result caching.

## MongoDB (Unstructured Data)

Managed via **Mongoose**.

Stores: JournalEntry (mood text + tags + `sentimentScore` + `themes`), CommunityPost (anonymous posts + upvotes), AiConversation (AI coach message history with per-conversation message arrays).

Optimised for: Flexible schemas, text-heavy storage, variable-length arrays, anonymous community data, AI conversation history.

---

# 🛡 Security & Reliability

- `bcrypt` password hashing (salt rounds: 12)
- Dual-token JWT system — short-lived access tokens (15m) + long-lived refresh tokens (7d)
- Refresh token rotation with reuse detection — using a revoked token terminates **all sessions**
- Email verification required before login
- OTP generated with `crypto.randomInt` (cryptographically secure)
- Password reset tokens generated with `crypto.randomBytes(32)` (256-bit randomness)
- All forgot-password and resend-verification responses are identical (prevents user enumeration)
- Route-level `protect` middleware on all user endpoints
- Global centralised error handler — ZodError → 400, AppErrors → correct HTTP status, 500 never leaks stack traces
- Tiered rate limiting — global (100 req/15min), auth (10 req/15min), OTP resend (3 req/15min)
- `helmet` security headers + CORS enabled
- Environment variable validation on startup
- Atomic database transactions for multi-row operations
- Soft-delete pattern preserves all historical behavioral data
- DB-level unique constraints as race-condition safety nets
- Ownership checks before every write operation
- Cron job error isolation via `Promise.allSettled()`
- Razorpay `HMAC-SHA256` signature verification on every payment
- Community anonymity enforced architecturally — `upvotedBy` has `select: false` and is never returned in any query
- Upvote deduplication via `HMAC-SHA256(userId, serverSecret)` — irreversible, never exposed in any API response
- Badge awards are idempotent — `hasBadge()` checked before every write, `@@unique([userId, type])` as DB-level safety net
- All gamification side effects (badges, challenges) are fire-and-forget — failures never propagate to primary operations
- AI sentiment analysis never blocks mood entry save — all Groq errors are caught internally and logged
- Free plan users receive `403` before any Groq call is made — zero AI API cost from free tier

---

# 📘 API Documentation

Interactive Swagger UI available at:

```
# Local
http://localhost:5000/api-docs

# Production (AWS ECS Fargate — ap-south-1)
https://<your-domain>/api-docs
```

Features:

- Bearer token authentication
- All request/response schemas documented with examples
- Organised by feature module (Auth / Mood / Habits / AI Insights / Billing / Badges / Challenges / Community)
- Real-time API testing in-browser

---

# 🐳 Docker Setup

PulseBloom ships with a multi-stage `Dockerfile` and a `docker-compose.yml` for running the full stack locally with a single command.

## Dockerfile

Multi-stage build — keeps the final image lean:

```
Stage 1 (builder): installs all dependencies, compiles TypeScript → dist/
Stage 2 (runner):  copies only dist/ and production node_modules — no dev tooling in the image
```

## docker-compose.yml

Runs three services together:

| Service    | Image            | Port  | Notes                                      |
| ---------- | ---------------- | ----- | ------------------------------------------ |
| `app`      | Local Dockerfile | 5000  | Node.js backend with compiled TS output    |
| `postgres` | postgres:15      | 5432  | Persistent volume — data survives restarts |
| `mongo`    | mongo:7          | 27017 | Persistent volume — data survives restarts |

## Running Locally with Docker

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down
```

The app container waits for both postgres and mongo to be healthy before starting.

---

# ☁️ AWS Deployment

PulseBloom is deployed on **AWS (ap-south-1 / Mumbai)** using ECS Fargate — fully serverless container hosting, no EC2 instances to manage.

## Infrastructure Overview

| Component          | AWS Service           | Notes                                        |
| ------------------ | --------------------- | -------------------------------------------- |
| Container host     | ECS Fargate           | Serverless — scales without managing servers |
| Container registry | ECR                   | Docker images stored and pulled by ECS       |
| PostgreSQL         | RDS PostgreSQL        | Managed DB in private subnet                 |
| MongoDB            | MongoDB Atlas         | Cloud-hosted, connected via URI              |
| Networking         | VPC + private subnets | App and DB in isolated network               |
| Secrets            | ECS Task env vars     | All secrets injected at container runtime    |
| Region             | ap-south-1 (Mumbai)   | Closest region for India-based users         |

## Deployment Flow

```
Push to GitHub → Build Docker image → Tag + push to ECR → Update ECS service → New task deployed
```

The ECS service pulls the latest image from ECR and replaces the running task with zero-downtime replacement.

## CI/CD

GitHub Actions pipeline handles the full deployment automatically on every push to `main`:

1. Build Docker image
2. Authenticate with ECR
3. Push image to ECR with `latest` tag
4. Force new ECS deployment — pulls the new image and restarts the task

---

# 🛠 Local Development Setup

## 1. Clone Repository

```bash
git clone <your-repository-url>
cd pulsebloom-backend
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment

Create a `.env` file:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/pulsebloom
MONGO_URI=mongodb://localhost:27017/pulsebloom
JWT_SECRET=your_super_secret_key_min_32_chars

# Community upvote anonymisation — any 32+ char random string
COMMUNITY_HMAC_SECRET=your_hmac_secret_min_32_chars

# Gmail SMTP
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="PulseBloom 🌸 <yourgmail@gmail.com>"

# Frontend URL
APP_URL=http://localhost:3000

# Groq — used for all AI features (insights, sentiment, suggestions, coach chat)
GROQ_API_KEY=gsk_...your-key-here...

# Razorpay — for subscription billing
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_PLAN_PRO=plan_...
RAZORPAY_PLAN_ENTERPRISE=plan_...
```

> **`COMMUNITY_HMAC_SECRET`** is used to hash upvoter identities. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep this secret — rotating it invalidates all existing upvote deduplication records.

## 4. Setup PostgreSQL

```sql
CREATE DATABASE pulsebloom;
```

Run migrations (Phase 5 adds `type` discriminator field to `AiInsight`):

```bash
npx prisma migrate dev --name phase5_ai_type_discriminator
npx prisma generate
```

## 5. Start MongoDB

Ensure MongoDB is running locally on port `27017`.

## 6. Start Development Server

```bash
npm run dev
```

Server runs at: `http://localhost:5000`

On successful startup:

```
MongoDB Connected
[ReminderCron] 🚀 Started — fires every minute
Server running on port 5000
📧 Gmail SMTP connection verified — mailer is ready
```

---

# 📦 Feature Status

## ✅ Completed

| Feature                                                       | Status      |
| ------------------------------------------------------------- | ----------- |
| Authentication (Register / Login)                             | ✅ Complete |
| Email Verification (OTP flow)                                 | ✅ Complete |
| Resend Verification OTP                                       | ✅ Complete |
| Refresh Token + Token Rotation                                | ✅ Complete |
| Refresh Token Reuse Detection                                 | ✅ Complete |
| Forgot Password / Reset Password                              | ✅ Complete |
| GET /me — User Profile Endpoint                               | ✅ Complete |
| Tiered Auth Rate Limiting                                     | ✅ Complete |
| Protected Routes (JWT middleware)                             | ✅ Complete |
| Mood CRUD (Create, Read, Update, Delete)                      | ✅ Complete |
| Mood Pagination + Date Filtering                              | ✅ Complete |
| Mood Entry Hydration (journal + tags)                         | ✅ Complete |
| Mood Journal Cross-store Sync (PG + Mongo)                    | ✅ Complete |
| Mood Context Tags                                             | ✅ Complete |
| Mood Analytics Engine                                         | ✅ Complete |
| Mood Logging Streak                                           | ✅ Complete |
| Mood Heatmap (GitHub-style)                                   | ✅ Complete |
| Monthly Mood Calendar Summary                                 | ✅ Complete |
| Day-of-Week + Time-of-Day Pattern Insights                    | ✅ Complete |
| Weekly Trend Analysis (ISO 8601)                              | ✅ Complete |
| Rolling 7-Day Average                                         | ✅ Complete |
| Burnout Risk Scoring                                          | ✅ Complete |
| Swagger Documentation                                         | ✅ Complete |
| Hybrid DB Architecture (PG + Mongo)                           | ✅ Complete |
| Habit CRUD (Create, Read, Update)                             | ✅ Complete |
| Habit Soft Delete + Restore                                   | ✅ Complete |
| Habit Duplicate Prevention                                    | ✅ Complete |
| Habit Categories, Color, Icon                                 | ✅ Complete |
| Habit Reordering (Drag & Drop, Atomic TX)                     | ✅ Complete |
| Habit Completion + Undo                                       | ✅ Complete |
| Habit Streak Engine (DST-safe)                                | ✅ Complete |
| Streak Milestone Detection                                    | ✅ Complete |
| Habit Analytics + Consistency Score                           | ✅ Complete |
| Best Day of Week Insight                                      | ✅ Complete |
| Monthly Habit Calendar Summary                                | ✅ Complete |
| GitHub-style Habit Heatmap                                    | ✅ Complete |
| Paginated Habit Log History                                   | ✅ Complete |
| Habit Reminder Settings                                       | ✅ Complete |
| targetPerWeek Goal Support                                    | ✅ Complete |
| Global Error Handler (Zod + App + Unknown)                    | ✅ Complete |
| Reminder Cron Job (node-cron)                                 | ✅ Complete |
| Mood Check-in Reminder Emails                                 | ✅ Complete |
| Weekly Email Digest (Saturday 8am cron)                       | ✅ Complete |
| In-App Notification System                                    | ✅ Complete |
| User Notification Preferences (PATCH /me/preferences)         | ✅ Complete |
| Notification Cleanup Cron (daily 3am)                         | ✅ Complete |
| Structured Logger                                             | ✅ Complete |
| Gmail SMTP Email Delivery                                     | ✅ Complete |
| AI-powered Behavioral Insights (Groq)                         | ✅ Complete |
| SHA-256 Hash-based AI Cache                                   | ✅ Complete |
| Subscription Plans (Free / Pro / Enterprise)                  | ✅ Complete |
| Usage Limits Middleware (planLimiter)                         | ✅ Complete |
| Razorpay Payment Integration                                  | ✅ Complete |
| Mood ↔ Habit Correlation Engine                               | ✅ Complete |
| Predictive Mood Forecast (3-signal model)                     | ✅ Complete |
| Personal Records & Milestones Timeline                        | ✅ Complete |
| Habit Correlation Matrix (co-completion rate)                 | ✅ Complete |
| Achievement Badges (6 badges, fire-and-forget)                | ✅ Complete |
| Challenge System (public + private, leaderboard)              | ✅ Complete |
| Anonymous Community Feed (HMAC upvote deduplication)          | ✅ Complete |
| Journal Sentiment Analysis (async, fire-and-forget)           | ✅ Complete |
| Sentiment Trends Endpoint (weekly mood vs sentiment)          | ✅ Complete |
| Smart Habit Suggestions (3 personalized, SHA-256 cached)      | ✅ Complete |
| Personalized AI Coach (chat, MongoDB history, 90-day context) | ✅ Complete |
| Docker Containerization (multi-stage build + docker-compose)  | ✅ Complete |
| AWS Deployment (ECS Fargate, ECR, RDS, VPC — ap-south-1)      | ✅ Complete |
| GitHub Actions CI/CD Pipeline                                 | ✅ Complete |

## 🔮 Upcoming — Build Order

| #   | Feature                                  | Phase             |
| --- | ---------------------------------------- | ----------------- |
| 17  | Organizations + Members                  | 👥 Team           |
| 18  | Team Mood Dashboard                      | 👥 Team           |
| 19  | Manager Burnout Alerts                   | 👥 Team           |
| 20  | Redis Caching Layer                      | 🔧 Infrastructure |
| 21  | Account Deletion (GDPR Right to Erasure) | 🔧 Infrastructure |
| 22  | Data Export (CSV / JSON)                 | 🔧 Infrastructure |
| 23  | Audit Log                                | 🔧 Infrastructure |
| 24  | WebSocket Real-time Updates (Socket.io)  | 🔧 Infrastructure |
| 25  | API Key Management                       | 🔧 Infrastructure |
| 26  | Webhook System                           | 🔧 Infrastructure |
| 27  | Public Developer Portal                  | 🔧 Infrastructure |

---

# 🔮 Upcoming Features

## 👥 Phase 6 — Team & Organization

> Build after monetization is stable. Enterprise plan must exist before org features launch.

**17. Organizations + Members** — `Organization` model: `id`, `name`, `ownerId`, `createdAt`. `OrgMember` model: `orgId`, `userId`, `role` (`OWNER | ADMIN | MEMBER`), `joinedAt`. Endpoints: `POST /api/orgs`, `POST /api/orgs/:id/invite`, `POST /api/orgs/join?token=...`, `DELETE /api/orgs/:id/members/:userId`. Add `requireOrgRole(role)` middleware for all org-scoped routes.

**18. Team Mood Dashboard** — `GET /api/teams/:id/mood/overview`. Aggregate mood data across all org members: team average mood this week, percentage at High burnout risk, week-over-week trend. Data is anonymized by default. Require a minimum of 3 members before returning any individual breakdowns. Gate behind Enterprise plan.

**19. Manager Burnout Alerts** — Weekly Monday 9am cron job. For each org: run team burnout aggregation, compare to last week's snapshot in `OrgMoodSnapshot`. If High-risk member count increased by more than 20%, send a digest email to all org admins.

---

## 🔧 Phase 7 — Infrastructure

**20. Redis Caching Layer** — `npm install ioredis`. Cache keys: `mood:analytics:{userId}`, `mood:streak:{userId}`, `habit:streak:{habitId}`. TTL: 5 minutes for analytics and streaks, 1 hour for heatmaps. Invalidate on write. Add `X-Cache: HIT | MISS` header to analytics responses.

**21. Account Deletion (GDPR Right to Erasure)** — `DELETE /api/auth/account` (requires password confirmation). Flow: verify password → delete all MongoDB `JournalEntry`, `CommunityPost`, and `AiConversation` docs for `userId` → delete `User` row in Postgres (Cascade handles related records) → revoke all refresh tokens. Send a 24-hour warning email first.

**22. Data Export (CSV / JSON)** — `GET /api/export/mood?format=csv|json` and `GET /api/export/habits?format=csv|json`. Rate-limit to 3 exports per 24 hours per user.

**23. Audit Log** — `UserEvent` model: `userId`, `action`, `metadata JSON`, `ipAddress`, `createdAt`. Log on: login, register, plan upgraded, data exported, account deleted. Audit logs are never deleted.

**24. WebSocket Real-time Updates** — Socket.io. Emit events to the user's socket room on: `habit.completed`, `streak.milestone`, `badge.earned`, `notification.created`. The `Notification` model from Phase 2 already has the data structure — WebSocket is just the delivery layer.

**25. API Key Management** — `ApiKey` model: `id`, `userId`, `keyHash` (SHA-256), `name`, `lastUsedAt`. `POST /api/developer/keys` — generate key, return raw value once, store only the hash. Gate behind Pro/Enterprise plan.

**26. Webhook System** — `Webhook` model: `userId`, `url`, `events[]`, `secret`, `isActive`. Events: `mood.created`, `habit.completed`, `habit.streak.milestone`, `burnout.risk.changed`, `badge.earned`. Retry 3 times with exponential backoff on failure.

**27. Public Developer Portal** — Static `/developer` route: API key management UI, interactive endpoint explorer, code examples in Node.js / Python / curl, rate limit dashboard.

---

# 👨‍💻 Author

**Ashish Anand**
Backend / MERN Developer

---

# 📜 License

MIT License

---

# 🌸 PulseBloom

> Track your pulse. Bloom with intention.
