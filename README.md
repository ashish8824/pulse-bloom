# 🌸 PulseBloom Backend

> Track your pulse. Bloom with intention.

PulseBloom is a **production-grade, AI-ready behavioral analytics backend** designed for high-performance professionals managing stress, productivity, and emotional well-being.

This backend powers a modern SaaS-style platform capable of mood tracking, habit building, statistical analytics, trend detection, burnout risk modeling, and behavioral intelligence.

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
- 💳 Subscription Billing — Razorpay integration with plan gating (Free / Pro / Enterprise)

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
│   ├── config/                          # Global configuration
│   │   ├── db.ts                        # Prisma client + PostgreSQL connection pool (pg adapter)
│   │   ├── mongo.ts                     # MongoDB connection via Mongoose
│   │   ├── env.ts                       # Environment variable loading + validation (dotenv)
│   │   └── swagger.ts                   # OpenAPI 3.0 spec config (swagger-jsdoc)
│   │
│   ├── modules/                         # Feature-based modules (Clean Architecture)
│   │   │
│   │   ├── auth/                        # ✅ Authentication Module
│   │   │   ├── auth.controller.ts       # HTTP layer — all 9 auth endpoints
│   │   │   ├── auth.service.ts          # Business logic:
│   │   │   │                            #   • register (creates user, sends OTP)
│   │   │   │                            #   • verifyEmail (validates OTP, issues tokens)
│   │   │   │                            #   • resendVerification (rate-limited OTP resend)
│   │   │   │                            #   • login (validates credentials, issues tokens)
│   │   │   │                            #   • refreshToken (rotation + reuse detection)
│   │   │   │                            #   • logout (revokes refresh token)
│   │   │   │                            #   • getProfile
│   │   │   │                            #   • forgotPassword (sends reset link)
│   │   │   │                            #   • resetPassword (validates token, revokes sessions)
│   │   │   ├── auth.repository.ts       # DB layer — User + RefreshToken + OTP queries (Prisma)
│   │   │   ├── auth.routes.ts           # All 9 routes with Swagger JSDoc + tiered rate limiting
│   │   │   └── auth.validation.ts       # Zod schemas — register, login, verify, reset, etc.
│   │   │
│   │   ├── mood/                        # ✅ Mood Tracking + Analytics Module
│   │   │   ├── mood.controller.ts       # HTTP layer — all 13 mood endpoints
│   │   │   ├── mood.service.ts          # Business logic:
│   │   │   │                            #   • addMood (Postgres + Mongo dual-write)
│   │   │   │                            #   • getMoodById (journal hydration)
│   │   │   │                            #   • updateMood (true PATCH + journal sync)
│   │   │   │                            #   • deleteMood (cross-store cleanup)
│   │   │   │                            #   • fetchMoods (paginated)
│   │   │   │                            #   • calculateMoodAnalytics
│   │   │   │                            #   • calculateWeeklyTrend (ISO 8601 corrected)
│   │   │   │                            #   • calculateRollingAverage
│   │   │   │                            #   • calculateBurnoutRisk
│   │   │   │                            #   • calculateMoodStreak
│   │   │   │                            #   • generateMoodHeatmap
│   │   │   │                            #   • getMoodMonthlySummary
│   │   │   │                            #   • getMoodDailyInsights
│   │   │   ├── mood.repository.ts       # DB layer — all Prisma + lean select queries
│   │   │   ├── mood.routes.ts           # All 13 routes with full Swagger JSDoc
│   │   │   ├── mood.validation.ts       # Zod schemas:
│   │   │   │                            #   • createMoodSchema
│   │   │   │                            #   • updateMoodSchema
│   │   │   │                            #   • moodQuerySchema
│   │   │   │                            #   • heatmapQuerySchema
│   │   │   │                            #   • monthlySummaryQuerySchema
│   │   │   └── mood.mongo.ts            # Mongoose schema — JournalEntry (MongoDB)
│   │   │
│   │   ├── habits/                      # ✅ Full Habit Engine Module
│   │   │   ├── habit.controller.ts      # HTTP layer — all 15 habit endpoints
│   │   │   ├── habit.service.ts         # Business logic:
│   │   │   │                            #   • createHabit (duplicate guard)
│   │   │   │                            #   • archiveHabit / restoreHabit (soft-delete)
│   │   │   │                            #   • completeHabit (period normalization)
│   │   │   │                            #   • undoLastCompletion
│   │   │   │                            #   • reorderHabits (atomic transaction)
│   │   │   │                            #   • calculateHabitStreak (DST-safe)
│   │   │   │                            #   • calculateHabitAnalytics (consistency score)
│   │   │   │                            #   • getMonthlyHabitSummary
│   │   │   │                            #   • generateHabitHeatmap
│   │   │   │                            #   • fetchPaginatedLogs
│   │   │   │                            #   • updateReminder
│   │   │   ├── habit.repository.ts      # DB layer — all Prisma queries (habits + logs)
│   │   │   ├── habit.routes.ts          # All 15 routes with full Swagger JSDoc annotations
│   │   │   └── habit.validation.ts      # Zod schemas (5 schemas)
│   │   │
│   │   ├── ai/                          # ✅ AI Insights Module
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── ai.repository.ts
│   │   │   ├── ai.prompt.ts
│   │   │   └── ai.routes.ts
│   │   │
│   │   ├── billing/                     # ✅ Razorpay Billing Module
│   │   │   ├── billing.controller.ts    # HTTP layer — 5 billing endpoints
│   │   │   ├── billing.service.ts       # Business logic:
│   │   │   │                            #   • createOrder (Razorpay order creation)
│   │   │   │                            #   • verifyPayment (HMAC-SHA256 verification)
│   │   │   │                            #   • handleWebhook (subscription lifecycle)
│   │   │   │                            #   • getBillingStatus (plan + renewal info)
│   │   │   │                            #   • cancelSubscription
│   │   │   └── billing.routes.ts        # All 5 routes with full Swagger JSDoc
│   │   │
│   │   ├── community/                   # 🔮 Upcoming
│   │   └── challenges/                  # 🔮 Upcoming
│   │
│   ├── jobs/
│   │   └── reminder.cron.ts             # node-cron — runs every minute
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts           # JWT verification → attaches req.userId
│   │   ├── error.middleware.ts          # Global error handler (Zod + App + unknown)
│   │   ├── rateLimiter.ts               # Tiered rate limiting (global + auth-specific)
│   │   └── planLimiter.ts               # ✅ Plan enforcement middleware (checkPlanLimit)
│   │
│   ├── websocket/                       # 🔮 Upcoming — Socket.io real-time layer
│   │
│   ├── utils/
│   │   ├── jwt.ts                       # generateAccessToken, generateRefreshToken, verifyToken
│   │   ├── date.utils.ts                # normalizeDailyDate, normalizeWeeklyDate
│   │   ├── logger.ts                    # Structured timestamp logger
│   │   ├── mailer.ts                    # Nodemailer Gmail SMTP — OTP, reset, reminder emails
│   │   └── helpers.ts
│   │
│   ├── types/
│   │   └── express.d.ts                 # Extends Request with req.userId: string
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/                               # 🔮 Upcoming
│   ├── unit/
│   └── integration/
│
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml                   # 🔮 Upcoming
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

| Method | Endpoint                        | Auth | Rate Limit | Description                      |
| ------ | ------------------------------- | ---- | ---------- | -------------------------------- |
| `POST` | `/api/auth/register`            | ❌   | 10/15 min  | Create account, sends OTP email  |
| `POST` | `/api/auth/verify-email`        | ❌   | —          | Confirm OTP, issues tokens       |
| `POST` | `/api/auth/resend-verification` | ❌   | 3/15 min   | Re-send OTP email                |
| `POST` | `/api/auth/login`               | ❌   | 10/15 min  | Login, issues tokens             |
| `POST` | `/api/auth/refresh-token`       | ❌   | —          | Rotate access + refresh tokens   |
| `POST` | `/api/auth/logout`              | ✅   | —          | Revoke current session           |
| `GET`  | `/api/auth/me`                  | ✅   | —          | Get authenticated user profile   |
| `POST` | `/api/auth/forgot-password`     | ❌   | 3/15 min   | Send password reset email        |
| `POST` | `/api/auth/reset-password`      | ❌   | —          | Set new password via reset token |

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
  "message": "Email verified successfully. Welcome to PulseBloom!",
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

# 📊 Mood Module

The Mood Module is a production-grade behavioral logging and analytics engine.

It stores structured mood data in **PostgreSQL** and unstructured journal text in **MongoDB**, with a bidirectional link (`journalId` on the Postgres row ↔ `moodEntryId` on the Mongo document).

## 🗺 Mood API Reference

| Method   | Endpoint                    | Description                                                  |
| -------- | --------------------------- | ------------------------------------------------------------ |
| `POST`   | `/api/mood`                 | Create mood entry (+ optional journal)                       |
| `GET`    | `/api/mood`                 | Paginated history (`?page` `?limit` `?startDate` `?endDate`) |
| `GET`    | `/api/mood/:id`             | Single entry hydrated with journal text + tags               |
| `PATCH`  | `/api/mood/:id`             | Partial update (score, emoji, journal, tags)                 |
| `DELETE` | `/api/mood/:id`             | Hard delete entry + journal cleanup                          |
| `GET`    | `/api/mood/analytics`       | Summary statistics                                           |
| `GET`    | `/api/mood/streak`          | Consecutive logging streak                                   |
| `GET`    | `/api/mood/heatmap`         | GitHub-style daily heatmap (`?days=365`)                     |
| `GET`    | `/api/mood/summary/monthly` | Calendar month view (`?month=YYYY-MM`)                       |
| `GET`    | `/api/mood/insights/daily`  | Day-of-week + time-of-day patterns                           |
| `GET`    | `/api/mood/trends/weekly`   | ISO 8601 weekly trend groupings                              |
| `GET`    | `/api/mood/trends/rolling`  | 7-day rolling average                                        |
| `GET`    | `/api/mood/burnout-risk`    | Burnout risk score + level                                   |

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

---

## Get Single Mood Entry (Hydrated)

```
GET /api/mood/:id
```

Returns the mood entry merged with its journal text and tags from MongoDB.

```json
{
  "id": "uuid",
  "moodScore": 4,
  "emoji": "😊",
  "journalId": "65d4fa21bc92b3bcd23e4567",
  "userId": "uuid",
  "createdAt": "2026-02-26T08:30:00.000Z",
  "journal": {
    "text": "Had a productive deep work session.",
    "tags": ["work", "exercise"]
  }
}
```

`journal` is `null` if the entry has no linked journal document.

---

## Update Mood Entry

```
PATCH /api/mood/:id
```

True PATCH semantics — only the fields you send are changed.

```json
{
  "moodScore": 3,
  "journalText": "Actually it was more of a medium day."
}
```

**Journal update rules:**

| `journalText` value   | Behaviour                                         |
| --------------------- | ------------------------------------------------- |
| `"some updated text"` | Updates the existing journal doc (or creates one) |
| `null`                | Deletes the linked MongoDB journal document       |
| _(omitted)_           | Journal is left completely untouched              |

---

## Delete Mood Entry

```
DELETE /api/mood/:id
```

Permanently deletes the mood entry from PostgreSQL **and** its linked journal document from MongoDB. This action is irreversible.

```json
{ "message": "Mood entry deleted successfully" }
```

---

## Paginated Mood History

```
GET /api/mood?page=1&limit=10
GET /api/mood?startDate=2026-01-01&endDate=2026-01-31
```

`endDate` is end-of-day inclusive — all entries up to `23:59:59.999` on that date are included.

> **Plan limit:** Free plan users are restricted to the last 30 days of mood history. If `startDate` is older than 30 days, it is silently clamped and a `planLimitApplied` flag is included in the response so the frontend can show an upgrade banner.

```json
{
  "data": [{ "id": "uuid", "moodScore": 4, "emoji": "😊" }],
  "pagination": {
    "total": 87,
    "page": 1,
    "limit": 10,
    "totalPages": 9
  }
}
```

---

## Mood Analytics

```
GET /api/mood/analytics
GET /api/mood/analytics?startDate=2026-01-01&endDate=2026-01-31
```

```json
{
  "totalEntries": 20,
  "averageMood": 3.8,
  "highestMood": 5,
  "lowestMood": 1,
  "mostFrequentMood": 4,
  "distribution": { "1": 2, "2": 3, "3": 5, "4": 6, "5": 4 }
}
```

---

## Mood Logging Streak

```
GET /api/mood/streak
```

**Algorithm:** The streak anchor is today (or yesterday as a grace period). If you haven't logged yet today but logged yesterday, the streak stays active — you won't lose a 30-day streak at 7am for not having logged yet.

```json
{
  "currentStreak": 12,
  "longestStreak": 30,
  "lastLoggedDate": "2026-02-26"
}
```

---

## Mood Heatmap

```
GET /api/mood/heatmap?days=365
```

Returns one entry per calendar day for the requested window (max 730 days / 2 years).

- `averageScore: 0` — no entry logged that day
- `averageScore: 1–5` — average mood across all entries on that day
- `count` — number of entries logged on that day

```json
{
  "heatmap": [
    { "date": "2025-02-26", "averageScore": 0, "count": 0 },
    { "date": "2025-02-27", "averageScore": 4.0, "count": 2 },
    { "date": "2025-02-28", "averageScore": 3.5, "count": 1 }
  ],
  "totalDays": 365,
  "loggedDays": 87
}
```

> Frontend maps `averageScore` to colour intensity — 0 = grey, 1–5 = green scale (or custom theme).

---

## Monthly Calendar Summary

```
GET /api/mood/summary/monthly?month=2026-02
```

Defaults to the current month if `month` is not provided.

```json
{
  "month": "2026-02",
  "totalEntries": 35,
  "loggedDays": 22,
  "averageMood": 3.7,
  "bestDay": { "date": "2026-02-14", "averageScore": 5.0 },
  "worstDay": { "date": "2026-02-03", "averageScore": 1.5 },
  "calendar": [
    { "date": "2026-02-01", "day": 1, "averageScore": 4.0, "count": 1 },
    { "date": "2026-02-02", "day": 2, "averageScore": null, "count": 0 },
    { "date": "2026-02-03", "day": 3, "averageScore": 1.5, "count": 2 }
  ]
}
```

`averageScore: null` means no entry was logged on that day.

---

## Daily Insights (Day-of-Week + Time-of-Day Patterns)

```
GET /api/mood/insights/daily
GET /api/mood/insights/daily?startDate=2025-12-01&endDate=2026-02-28
```

Analyses mood entries across two behavioural dimensions. Requires at least 5 entries.

```json
{
  "analyzedEntries": 87,
  "dayOfWeekPattern": {
    "data": [
      { "day": "Monday", "averageMood": 2.1, "entries": 14 },
      { "day": "Wednesday", "averageMood": 4.1, "entries": 15 }
    ],
    "bestDay": "Wednesday",
    "worstDay": "Monday",
    "mostActiveDay": "Wednesday",
    "insight": "Your Wednesdays average 4.1 — your best day of the week."
  },
  "timeOfDayPattern": {
    "data": [
      { "timeOfDay": "Morning (5am–12pm)", "averageMood": 4.2, "entries": 42 },
      {
        "timeOfDay": "Afternoon (12pm–5pm)",
        "averageMood": 3.5,
        "entries": 21
      },
      { "timeOfDay": "Evening (5pm–9pm)", "averageMood": 3.1, "entries": 18 },
      { "timeOfDay": "Night (9pm–5am)", "averageMood": 2.9, "entries": 6 }
    ],
    "bestTime": "Morning (5am–12pm)",
    "mostActiveTime": "Morning (5am–12pm)",
    "insight": "You feel best during Morning (5am–12pm) (avg 4.2)."
  }
}
```

**Day-of-week pattern** reveals which weekday has your best/worst average mood. **Time-of-day pattern** buckets entries into Morning / Afternoon / Evening / Night.

---

## Weekly Trend Analysis

```
GET /api/mood/trends/weekly
```

Groups mood entries by ISO 8601 week (weeks start Monday). Returns weeks in chronological order.

```json
{
  "weeklyTrends": [
    { "week": "2026-W05", "averageMood": 3.6, "entries": 5 },
    { "week": "2026-W06", "averageMood": 4.1, "entries": 7 }
  ]
}
```

---

## Rolling 7-Day Average

```
GET /api/mood/trends/rolling
```

```json
{
  "rollingAverage": [
    { "date": "2026-02-10", "averageMood": 3.57 },
    { "date": "2026-02-11", "averageMood": 3.71 }
  ]
}
```

---

## Burnout Risk Scoring

```
GET /api/mood/burnout-risk
```

Requires at least 3 entries.

**Formula:**

```
riskScore = (lowMoodDays × 2) + (max(0, 3.0 − averageMood) × 3) + (volatility × 1.5)
```

| Signal        | Weight | Description                                                                                  |
| ------------- | ------ | -------------------------------------------------------------------------------------------- |
| `lowMoodDays` | × 2    | Days where moodScore ≤ 2                                                                     |
| `moodDeficit` | × 3    | How far the average falls below 3.0 (clamped ≥ 0 so healthy averages don't reduce the score) |
| `volatility`  | × 1.5  | Range between highest and lowest score                                                       |

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

## Mood Database Schema

```prisma
model MoodEntry {
  id        String   @id @default(uuid())
  moodScore Int
  emoji     String
  journalId String?  // MongoDB ObjectId — null if no journal was provided
  userId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, createdAt])  // critical for all date-range analytics queries
}
```

**MongoDB — JournalEntry:**

```ts
{
  userId: string        // links back to PostgreSQL User.id
  moodEntryId: string   // back-reference to PostgreSQL MoodEntry.id
  text: string          // up to 5000 characters
  tags: string[]        // context slugs e.g. ["work", "sleep"]
  createdAt: Date
  updatedAt: Date
}
```

**Indexes on JournalEntry:** `{ userId: 1 }`, `{ moodEntryId: 1 }` (unique), `{ userId: 1, createdAt: -1 }`

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

## Create Habit

```
POST /api/habits
```

```json
{
  "title": "Morning Meditation",
  "description": "10 minutes mindfulness before work",
  "frequency": "daily",
  "category": "mindfulness",
  "color": "#7C3AED",
  "icon": "🧘",
  "targetPerWeek": 5,
  "reminderTime": "08:00",
  "reminderOn": true
}
```

**Fields:**

| Field           | Type                | Required | Description                                                              |
| --------------- | ------------------- | -------- | ------------------------------------------------------------------------ |
| `title`         | string              | ✅       | 2–100 chars, trimmed, case-insensitive duplicate check                   |
| `frequency`     | `daily` \| `weekly` | ✅       | Period type                                                              |
| `description`   | string              | ❌       | Up to 500 chars                                                          |
| `category`      | enum                | ❌       | `health`, `fitness`, `learning`, `mindfulness`, `productivity`, `custom` |
| `color`         | string              | ❌       | Hex code like `#FF5733`                                                  |
| `icon`          | string              | ❌       | Single emoji like `🧘`                                                   |
| `targetPerWeek` | integer 1–7         | ❌       | Weekly goal — affects completion rate calculation                        |
| `reminderTime`  | `HH:MM`             | ❌       | 24-hour format — used by cron job for exact-minute matching              |
| `reminderOn`    | boolean             | ❌       | Toggle reminder on/off without clearing `reminderTime`                   |

> **Plan limit:** Free plan users are limited to **3 active habits**. Attempting to create a 4th habit returns a `403` with an upgrade prompt.

---

## Habit Completion

```
POST /api/habits/:id/complete
```

```json
{ "note": "Felt really focused today" }
```

**Period normalization:** `daily` → midnight of today, `weekly` → Monday midnight of the current ISO week. Completing at 9am and 11pm on the same day maps to the same date. The `@@unique([habitId, date])` constraint enforces this at the database level.

**Response includes streak milestone detection:**

```json
{
  "message": "Habit marked as completed",
  "log": { "id": "uuid", "date": "2026-02-23T00:00:00.000Z", "note": "..." },
  "currentStreak": 7,
  "milestone": { "days": 7, "message": "Amazing! You hit a 7-day streak!" }
}
```

`milestone` is `null` if no milestone was hit. Milestones trigger at: **7, 14, 21, 30, 60, 90, 100, 180, 365 days.**

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

**`consistencyScore` formula:** `50% completion rate + 30% streak (normalized to personal best) + 20% recency`

> A user with 60% completion rate and an active 30-day streak scores significantly higher than one with 60% rate who hasn't completed the habit in two weeks.

---

## Habit Heatmap

```
GET /api/habits/:id/heatmap?days=365
```

```json
{
  "heatmap": [
    { "date": "2025-02-23", "completed": 0 },
    { "date": "2025-02-24", "completed": 1 }
  ]
}
```

`completed: 0 | 1` — maps directly to GitHub-style colour intensity on the frontend.

---

## Monthly Summary

```
GET /api/habits/:id/summary?month=2026-02
```

```json
{
  "month": "2026-02",
  "completionsThisMonth": 18,
  "completionRate": 64.29,
  "calendar": [
    { "date": "2026-02-01", "completed": true },
    { "date": "2026-02-02", "completed": false }
  ]
}
```

---

## Undo Last Completion

```
DELETE /api/habits/:id/complete
```

Removes the most recent completion log. **Only allowed if the latest log is from the current period** — you cannot undo a log from a previous day or week.

---

## Reorder Habits

```
PATCH /api/habits/reorder
```

```json
{
  "habits": [
    { "id": "uuid-1", "sortOrder": 0 },
    { "id": "uuid-2", "sortOrder": 1 }
  ]
}
```

All `sortOrder` updates run in a **single atomic database transaction**. If any update fails, all changes roll back.

---

## Habit Database Schema

```prisma
model Habit {
  id            String         @id @default(uuid())
  title         String
  description   String?
  frequency     HabitFrequency
  category      HabitCategory  @default(custom)
  color         String?
  icon          String?
  targetPerWeek Int?
  sortOrder     Int            @default(0)
  isArchived    Boolean        @default(false)
  reminderTime  String?
  reminderOn    Boolean        @default(false)
  userId        String
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@unique([userId, title, frequency])
  @@index([userId])
  @@index([reminderOn, reminderTime])  // cron job performance index
}

model HabitLog {
  id        String   @id @default(uuid())
  habitId   String
  date      DateTime
  completed Boolean  @default(true)
  note      String?
  createdAt DateTime @default(now())

  @@unique([habitId, date])
  @@index([habitId])
}
```

---

# ⏰ Reminder Cron Job

PulseBloom includes a production-grade background job that sends habit reminder emails to users who haven't completed their habit yet for the current period.

## How It Works

```
Every minute:
  1. Get current time as "HH:MM"
  2. Query habits WHERE reminderOn=true AND reminderTime="HH:MM"
  3. For each habit → check if already completed this period
  4. Not completed → send reminder email via Gmail SMTP
  5. Already completed → skip silently
```

Error isolation is achieved via `Promise.allSettled()` — if one email fails, all other reminders still fire.

## Terminal Output

```
[INFO]  [ReminderCron] ⏱  Tick — 08:00
[INFO]  [ReminderCron] Found 2 habit(s) to process
[INFO]  ✅ Reminder email sent {"to":"ashish@gmail.com","habit":"Morning Meditation"}
[INFO]  [ReminderCron] ✅ Tick complete {"sent":2,"skipped":0,"failed":0}
```

## Environment Variables Required

```env
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="PulseBloom 🌸 <yourgmail@gmail.com>"
```

> You must use a [Google App Password](https://myaccount.google.com/apppasswords) — not your real Gmail password. 2-Step Verification must be enabled first.

---

# 🤖 AI Insights Module

PulseBloom uses **Groq** to cross-correlate mood scores and habit completion data, generating personalised behavioral insights.

## Endpoint

```
GET /api/ai/insights
GET /api/ai/insights?refresh=true
```

`?refresh=true` bypasses the cache and forces regeneration.

> **Plan limit:** AI Insights are available on **Pro and Enterprise plans only**. Free plan users receive a `403` with an upgrade prompt.

## How It Works

```
GET /api/ai/insights
    ↓
Fetch last 90 days of mood entries + habit logs (parallel DB queries)
    ↓
Compute SHA-256 hash of raw data snapshot
    ↓
Check AiInsight cache: current hash === cached hash?
    YES → return cached insights instantly (zero Groq API cost)
    NO  → continue
    ↓
Pre-process into weekly behavioral summaries (ai.prompt.ts)
    ↓
Build system + user prompts
    ↓
Call Groq API (temperature: 0.4, max_tokens: 1200)
    ↓
Parse + validate JSON response
    ↓
Upsert AiInsight cache row in PostgreSQL
    ↓
Return 3–6 structured insights
```

## Response

```json
{
  "insights": [
    {
      "type": "correlation",
      "title": "Meditation skips align with your lowest mood weeks",
      "description": "In the 3 weeks where your mood averaged below 3.0, you completed Morning Meditation 0 times. In weeks you did complete it, your average mood was 4.1.",
      "severity": "warning"
    },
    {
      "type": "positive",
      "title": "Strong consistency on weekday mornings",
      "description": "You completed Exercise 91% of weekdays over the past 90 days — your best performing habit.",
      "severity": "success"
    }
  ],
  "cached": true,
  "generatedAt": "2026-02-26T08:00:00.000Z",
  "message": "Insights served from cache"
}
```

## Insight Types

| Type          | Meaning                                     | Severity           |
| ------------- | ------------------------------------------- | ------------------ |
| `correlation` | Mood ↔ habit relationship (highest value)   | `warning` / `info` |
| `streak`      | Notable streak pattern (current or broken)  | `info` / `success` |
| `warning`     | Concerning pattern needing attention        | `warning`          |
| `positive`    | Strong behavioral pattern worth celebrating | `success`          |
| `suggestion`  | Actionable recommendation based on data     | `info`             |

## Caching Strategy

Results are cached in PostgreSQL (`AiInsight` table) using a **SHA-256 data hash**. The Groq API is only called when the user's behavioral data has actually changed — not on a fixed TTL. Zero API cost on repeated requests with unchanged data.

## Minimum Data Requirements

- At least 7 mood entries, **OR**
- At least 1 habit with 5+ completions

## Environment Variable Required

```env
GROQ_API_KEY=gsk_...your-key-here...
```

---

# 💳 Billing Module

PulseBloom uses **Razorpay** for subscription billing. The billing module enforces plan-based feature gating across the entire API via the `planLimiter` middleware.

## Plan Limits

| Tier       | Habits    | Mood History | AI Insights | Team Features |
| ---------- | --------- | ------------ | ----------- | ------------- |
| Free       | 3 max     | 30 days      | ❌          | ❌            |
| Pro        | Unlimited | Full history | ✅          | ❌            |
| Enterprise | Unlimited | Full history | ✅          | ✅            |

## 🗺 Billing API Reference

| Method   | Endpoint                    | Auth | Description                                        |
| -------- | --------------------------- | ---- | -------------------------------------------------- |
| `POST`   | `/api/billing/order`        | ✅   | Create Razorpay order — Step 1 of checkout         |
| `POST`   | `/api/billing/verify`       | ✅   | Verify payment + upgrade plan — Step 2             |
| `POST`   | `/api/billing/webhook`      | ❌   | Razorpay webhook receiver (subscription lifecycle) |
| `GET`    | `/api/billing/status`       | ✅   | Current plan, renewal date, manage link            |
| `DELETE` | `/api/billing/subscription` | ✅   | Cancel subscription at end of billing period       |

## Payment Flow

```
Frontend                    Your Backend              Razorpay
─────────                   ────────────              ────────
Click "Upgrade to Pro"
  │
  ├─ POST /api/billing/order ──────────────────────────────────→
  │                           createOrder()
  │                           razorpay.orders.create()  ───────→
  │                                                     order_id ←─
  │  ←────────── { orderId, amount, currency, keyId }
  │
  ├─ new Razorpay({ key, order_id }).open()
  │                                               ←── Popup shown
  │  User pays with card / UPI / netbanking
  │                                               ──── Payment ──→
  │  handler({ payment_id, order_id, signature }) ←─────────────
  │
  ├─ POST /api/billing/verify ─────────────────────────────────→
  │                           HMAC-SHA256 signature verify ✅
  │                           razorpay.payments.fetch() ────────→
  │                                                  status=captured ←─
  │                           prisma: user.plan = "pro"
  │  ←────────── { success: true, plan: "pro" }
  │
  Show success UI ✅
```

## Create Order (Step 1)

```
POST /api/billing/order
Authorization: Bearer <accessToken>
```

```json
{ "plan": "pro" }
```

**Response:**

```json
{
  "orderId": "order_NaVxyz123",
  "amount": 99900,
  "currency": "INR",
  "keyId": "rzp_test_...",
  "plan": "pro"
}
```

Pass these to the Razorpay checkout popup on the frontend. See `billing.routes.ts` for the complete frontend integration snippet.

---

## Verify Payment (Step 2)

```
POST /api/billing/verify
Authorization: Bearer <accessToken>
```

```json
{
  "razorpayOrderId": "order_NaVxyz123",
  "razorpayPaymentId": "pay_NaVabc456",
  "razorpaySignature": "a9f3e2...",
  "plan": "pro"
}
```

Verifies the `HMAC-SHA256` signature — the critical security step that prevents fake payment IDs from being submitted to get a free upgrade.

**Response:**

```json
{
  "success": true,
  "plan": "pro",
  "message": "🎉 Welcome to PulseBloom Pro! Your plan has been upgraded."
}
```

---

## Billing Status

```
GET /api/billing/status
Authorization: Bearer <accessToken>
```

```json
{
  "currentPlan": "pro",
  "subscription": {
    "status": "active",
    "currentPeriodEnd": "2026-04-01T00:00:00.000Z",
    "cancelledAt": null
  },
  "manageUrl": "http://localhost:3000/billing/manage"
}
```

---

## Cancel Subscription

```
DELETE /api/billing/subscription
Authorization: Bearer <accessToken>
```

Cancels the Razorpay subscription. Access is retained until `currentPeriodEnd`, then the plan reverts to `free`.

```json
{
  "message": "Subscription cancelled. You will retain access until the end of your current billing period."
}
```

---

## Webhook Events Handled

| Event                    | Action                                           |
| ------------------------ | ------------------------------------------------ |
| `subscription.charged`   | Renewal confirmed — refreshes `currentPeriodEnd` |
| `subscription.cancelled` | Reverts user plan to `free`                      |
| `payment.failed`         | Marks subscription as `past_due`                 |

Webhook signature is verified via `HMAC-SHA256` using `RAZORPAY_WEBHOOK_SECRET`. Always returns `200` to prevent Razorpay retries on processing errors.

---

## Plan Enforcement Middleware

`checkPlanLimit(resource)` is applied at the route level — before the controller runs.

| Resource        | Enforcement                                                  |
| --------------- | ------------------------------------------------------------ |
| `habit_create`  | Hard block (403) if free user has ≥ 3 active habits          |
| `mood_history`  | Clamps `startDate` to last 30 days for free users (no block) |
| `ai_insights`   | Hard block (403) for free users                              |
| `team_features` | Hard block (403) for non-enterprise users                    |

Upgrade prompt response shape:

```json
{
  "error": "plan_limit_reached",
  "message": "Free plan is limited to 3 active habits.",
  "currentPlan": "free",
  "requiredPlan": "pro",
  "upgradeUrl": "https://yourapp.com/billing/upgrade?from=free&to=pro",
  "limit": 3,
  "current": 3
}
```

---

## Billing Database Schema

```prisma
enum Plan {
  free
  pro
  enterprise
}

enum SubscriptionStatus {
  active
  cancelled
  past_due
  trialing
  incomplete
}

model Subscription {
  id                   String             @id @default(uuid())
  userId               String             @unique
  plan                 Plan
  status               SubscriptionStatus @default(active)
  stripeSubscriptionId String?            @unique  // stores Razorpay subscription ID
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelledAt          DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([stripeSubscriptionId])
}
```

`User` model additions:

```prisma
plan                 Plan    @default(free)
stripeCustomerId     String? @unique   // unused with Razorpay — kept for future gateway flexibility
stripeSubscriptionId String? @unique   // stores Razorpay subscription ID
```

---

# 🗄 Hybrid Database Architecture

## PostgreSQL (Structured Data)

Managed via **Prisma ORM** with a `pg` connection pool adapter.

Stores: Users, RefreshTokens, MoodEntry, Habit, HabitLog, AiInsight cache, Subscription.

Used for: Filtering, pagination, sorting, analytics calculations, streak queries, transactional reordering, cron job reminder queries, O(1) refresh token lookup via `@@index([token])`, plan enforcement reads.

## MongoDB (Unstructured Data)

Managed via **Mongoose**.

Stores: JournalEntry (mood text + tags).

Optimised for: Flexible schemas, text-heavy storage, future AI model integrations, community posts (upcoming).

---

# 🛡 Security & Reliability

- `bcrypt` password hashing (salt rounds: 12)
- Strong password policy enforced at validation layer (uppercase, lowercase, number, special char)
- Dual-token JWT system — short-lived access tokens (15m) + long-lived refresh tokens (7d)
- Refresh token rotation — every `/refresh-token` call immediately revokes the old token and issues a new one
- Refresh token reuse detection — using a revoked token terminates **all sessions** for that user
- Email verification required before login — unverified accounts cannot access the API
- OTP generated with `crypto.randomInt` (cryptographically secure, not `Math.random`)
- Password reset tokens generated with `crypto.randomBytes(32)` (256-bit randomness)
- Password reset revokes all existing refresh tokens — forces re-login on all devices
- All forgot-password and resend-verification responses are identical (prevents user enumeration)
- Route-level `protect` middleware on all user endpoints — validates access token, attaches `req.userId`
- `TokenExpiredError` distinguished from `JsonWebTokenError` — client knows to refresh vs re-login
- Global centralised error handler — ZodError → 400 with field-level detail, AppErrors → correct HTTP status, unknown errors → 500 (never leaks stack traces)
- Tiered rate limiting — global (100 req/15min), auth login/register (10 req/15min), OTP resend + forgot-password (3 req/15min)
- `skipSuccessfulRequests: true` on login limiter — only failed attempts count toward the limit
- `helmet` security headers
- CORS enabled
- Environment variable validation on startup — server refuses to start with missing required vars
- Atomic database transactions for multi-row operations (habit reorder, plan upgrades)
- Soft-delete pattern preserves all historical behavioral data
- DB-level unique constraints as a safety net against race conditions
- `@@index([token])` on RefreshToken for O(1) lookup during rotation
- Ownership checks (`assertMoodOwnership`) before every write operation
- Cron job error isolation — one email failure never blocks other users
- MongoDB cleanup runs before Postgres delete — prevents orphaned documents
- Gmail SMTP with TLS for secure email delivery
- Razorpay `HMAC-SHA256` signature verification on every payment — prevents fake payment ID attacks
- Razorpay webhook signature verification — prevents spoofed webhook events
- Plan read from DB (not JWT) on every request — plan upgrades take effect immediately

---

# 📘 API Documentation

Interactive Swagger UI available at:

```
http://localhost:5000/api-docs
```

Features:

- Bearer token authentication
- All request/response schemas documented with examples
- Organised by feature module (Auth / Mood / Habits / AI Insights / Billing)
- Real-time API testing in-browser

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

# Gmail SMTP — for OTP verification + password reset + habit reminder emails
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="PulseBloom 🌸 <yourgmail@gmail.com>"

# Frontend URL — used in password reset email link and billing redirects
# Development: http://localhost:3000  |  Production: https://yourapp.com
APP_URL=http://localhost:3000

# Groq — for AI insights
GROQ_API_KEY=gsk_...your-key-here...

# ─────────────────────────────────────────────────────────────────
# Razorpay — for subscription billing
# Get from: https://dashboard.razorpay.com → Account & Settings → API Keys
# ─────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_PLAN_PRO=plan_...
RAZORPAY_PLAN_ENTERPRISE=plan_...
```

> **Gmail App Password Setup:**
>
> 1. Go to [myaccount.google.com/security](https://myaccount.google.com/security) → enable 2-Step Verification
> 2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → create an App Password named `PulseBloom`
> 3. Copy the 16-character password (remove spaces) → paste into `SMTP_PASS`

> **Razorpay Setup:**
>
> 1. Sign up at [razorpay.com](https://razorpay.com) — KYC approved instantly for Indian accounts
> 2. Dashboard → Account & Settings → API Keys → Generate Key → copy `key_id` and `key_secret`
> 3. Dashboard → Subscriptions → Plans → Create plans for Pro (₹999/mo) and Enterprise (₹2999/mo) → copy Plan IDs
> 4. Dashboard → Account & Settings → Webhooks → Add webhook URL → copy signing secret
> 5. For local webhook testing: `ngrok http 5000` → use the ngrok URL as webhook endpoint

## 4. Setup PostgreSQL

```sql
CREATE DATABASE pulsebloom;
```

Run migrations and generate the Prisma client:

```bash
npx prisma migrate dev --name init
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

| Feature                                      | Status      |
| -------------------------------------------- | ----------- |
| Authentication (Register / Login)            | ✅ Complete |
| Email Verification (OTP flow)                | ✅ Complete |
| Resend Verification OTP                      | ✅ Complete |
| Refresh Token + Token Rotation               | ✅ Complete |
| Refresh Token Reuse Detection                | ✅ Complete |
| Forgot Password / Reset Password             | ✅ Complete |
| GET /me — User Profile Endpoint              | ✅ Complete |
| Tiered Auth Rate Limiting                    | ✅ Complete |
| Protected Routes (JWT middleware)            | ✅ Complete |
| Mood CRUD (Create, Read, Update, Delete)     | ✅ Complete |
| Mood Pagination + Date Filtering             | ✅ Complete |
| Mood Entry Hydration (journal + tags)        | ✅ Complete |
| Mood Journal Cross-store Sync (PG + Mongo)   | ✅ Complete |
| Mood Context Tags                            | ✅ Complete |
| Mood Analytics Engine                        | ✅ Complete |
| Mood Logging Streak                          | ✅ Complete |
| Mood Heatmap (GitHub-style)                  | ✅ Complete |
| Monthly Mood Calendar Summary                | ✅ Complete |
| Day-of-Week + Time-of-Day Pattern Insights   | ✅ Complete |
| Weekly Trend Analysis (ISO 8601)             | ✅ Complete |
| Rolling 7-Day Average                        | ✅ Complete |
| Burnout Risk Scoring                         | ✅ Complete |
| Swagger Documentation                        | ✅ Complete |
| Hybrid DB Architecture (PG + Mongo)          | ✅ Complete |
| Habit CRUD (Create, Read, Update)            | ✅ Complete |
| Habit Soft Delete + Restore                  | ✅ Complete |
| Habit Duplicate Prevention                   | ✅ Complete |
| Habit Categories, Color, Icon                | ✅ Complete |
| Habit Reordering (Drag & Drop, Atomic TX)    | ✅ Complete |
| Habit Completion + Undo                      | ✅ Complete |
| Habit Streak Engine (DST-safe)               | ✅ Complete |
| Streak Milestone Detection                   | ✅ Complete |
| Habit Analytics + Consistency Score          | ✅ Complete |
| Best Day of Week Insight                     | ✅ Complete |
| Monthly Habit Calendar Summary               | ✅ Complete |
| GitHub-style Habit Heatmap                   | ✅ Complete |
| Paginated Habit Log History                  | ✅ Complete |
| Habit Reminder Settings                      | ✅ Complete |
| targetPerWeek Goal Support                   | ✅ Complete |
| Global Error Handler (Zod + App + Unknown)   | ✅ Complete |
| Reminder Cron Job (node-cron)                | ✅ Complete |
| Structured Logger                            | ✅ Complete |
| Gmail SMTP Email Delivery                    | ✅ Complete |
| AI-powered Insights (Groq)                   | ✅ Complete |
| SHA-256 Hash-based AI Cache                  | ✅ Complete |
| Subscription Plans (Free / Pro / Enterprise) | ✅ Complete |
| Usage Limits Middleware (planLimiter)        | ✅ Complete |
| Razorpay Payment Integration                 | ✅ Complete |

## 🔮 Upcoming — Build Order

> Features are listed in the order they should be implemented. Each phase unlocks the next.

| #   | Feature                                  | Phase             |
| --- | ---------------------------------------- | ----------------- |
| 4   | In-App Notification System               | 🔔 Engagement     |
| 5   | Weekly Email Digest                      | 🔔 Engagement     |
| 6   | Mood Check-in Reminders                  | 🔔 Engagement     |
| 7   | Mood ↔ Habit Correlation Engine          | 📊 Analytics      |
| 8   | Predictive Mood Forecast                 | 📊 Analytics      |
| 9   | Personal Records & Milestones Timeline   | 📊 Analytics      |
| 10  | Habit Correlation Matrix                 | 📊 Analytics      |
| 11  | Achievement Badges                       | 🏆 Gamification   |
| 12  | Challenge System                         | 🏆 Gamification   |
| 13  | Anonymous Community Feed                 | 🏆 Gamification   |
| 14  | Journal Sentiment Analysis               | 🤖 Enhanced AI    |
| 15  | Smart Habit Suggestions                  | 🤖 Enhanced AI    |
| 16  | Personalized AI Coach (Chat Interface)   | 🤖 Enhanced AI    |
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
| 28  | Docker Containerization                  | 🚀 Deployment     |
| 29  | AWS Deployment                           | 🚀 Deployment     |

---

# 🔮 Upcoming Features

## 🔔 Phase 2 — Engagement

> Retention before advanced features. These three keep users coming back daily before you've built anything else.

**4. In-App Notification System** — Add a `Notification` model in PostgreSQL: `id`, `userId`, `type`, `title`, `message`, `isRead`, `createdAt`. Notification types: `STREAK_MILESTONE`, `BURNOUT_RISK_CHANGED`, `WEEKLY_SUMMARY`, `BADGE_EARNED`, `CHALLENGE_UPDATE`. Endpoints:

- `GET /api/notifications?page=1&limit=20` — paginated, unread first
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/notifications/unread-count` — lightweight count for badge display

This model feeds the WebSocket layer (Phase 7) directly — build the DB layer now, real-time delivery later.

**5. Weekly Email Digest** — A Saturday 8am cron job (add alongside `reminder.cron.ts`) that iterates users with `weeklyDigestOn: true` and sends a branded HTML email: average mood this week, habits completed vs target, current streaks, burnout risk trend. Use `Promise.allSettled()` — same error isolation pattern as the habit reminder cron. Add `weeklyDigestOn: Boolean @default(true)` to the `User` model.

**6. Mood Check-in Reminders** — Add `moodReminderTime: String?` and `moodReminderOn: Boolean @default(false)` to the `User` model. Add `@@index([moodReminderOn, moodReminderTime])` for cron performance. Extend `reminder.cron.ts` to process mood reminders in the same tick: query users whose `moodReminderTime` matches the current `HH:MM`, check if a `MoodEntry` exists for today, send nudge email if not.

---

## 📊 Phase 3 — Analytics

> Pure computation on data you already have. No external dependencies, no new infrastructure.

**7. Mood ↔ Habit Correlation Engine** — `GET /api/analytics/correlation`. For each active habit, compute: average mood on days the habit was completed vs days it was skipped. Return sorted by impact descending. Example output: `{ habitTitle: "Morning Meditation", completionDayAvg: 4.2, skipDayAvg: 2.8, lift: +1.4 }`. Deterministic — zero AI cost.

**8. Predictive Mood Forecast** — `GET /api/mood/forecast?days=7`. Uses the rolling average + day-of-week pattern (both already computed) to project the next 7 days. Formula: `baseline (30-day avg) + day-of-week adjustment (from daily insights) + recent trend slope`. Returns `{ date, predictedScore, label }` per day. Entirely local — no external API.

**9. Personal Records & Milestones Timeline** — Add a `Milestone` model: `id`, `userId`, `type`, `habitId?`, `value`, `achievedAt`. Types: `FIRST_MOOD_ENTRY`, `HABIT_STREAK_7/14/21/30/60/90/100`, `MOOD_STREAK_7/14/30`, `BEST_WEEK_MOOD`, `BURNOUT_RECOVERY`. Call `createMilestoneIfNew()` from inside `completeHabit()` and `addMood()` after each write. `GET /api/milestones` returns the full timeline.

**10. Habit Correlation Matrix** — `GET /api/analytics/habit-matrix`. For each pair of active habits, compute the co-completion rate: percentage of days where both were completed when at least one was. Sort pairs by correlation descending. Powers habit stacking suggestions in the UI.

---

## 🏆 Phase 4 — Gamification

> Add these once analytics are in place — badges and challenges reference streak and milestone data.

**11. Achievement Badges** — Add a `Badge` model: `id`, `userId`, `type`, `earnedAt`. Check and award badges inside `completeHabit()` and `addMood()` (async, non-blocking). Badge types and unlock conditions:

| Badge         | Unlock Condition                           |
| ------------- | ------------------------------------------ |
| First Step    | First mood entry logged                    |
| Week One      | 7-day mood logging streak                  |
| Iron Will     | 30-day habit streak                        |
| Mindful Month | Mood logged every day for a calendar month |
| Resilient     | Burnout risk dropped from High → Low       |
| Centurion     | 100-day habit streak                       |

`GET /api/badges` returns earned badges with dates and locked badges with progress percentages.

**12. Challenge System** — `Challenge` model: `title`, `description`, `targetDays`, `habitId?`, `startDate`, `endDate`, `isPublic`, `createdBy`. `ChallengeParticipant` model: `challengeId`, `userId`, `joinedAt`, `completionsCount`. Endpoints: `POST /api/challenges`, `GET /api/challenges` (public list), `POST /api/challenges/:id/join`, `GET /api/challenges/:id/leaderboard`. Hook into `completeHabit()` to increment `completionsCount` when a completion contributes to an active challenge.

**13. Anonymous Community Feed** — `CommunityPost` model in MongoDB: `type` (`MILESTONE | REFLECTION`), `content`, `upvotes`, `tags[]`, `createdAt`. User identity is never stored. `POST /api/community` (authenticated, but strips identity before save), `GET /api/community` (public), `POST /api/community/:id/upvote`.

---

## 🤖 Phase 5 — Enhanced AI

> Build on the existing `ai.prompt.ts` infrastructure. The data pre-processing layer is already there.

**14. Journal Sentiment Analysis** — After `JournalModel.create()` in `addMood()`, fire an async Groq call (don't await — non-blocking). Prompt: extract `sentimentScore` (-1.0 to 1.0) and up to 5 theme tags from the journal text, respond in JSON. Update the journal document with `sentimentScore` and `themes[]`. New endpoint: `GET /api/mood/sentiment/trends` — weekly average sentiment vs weekly mood score.

**15. Smart Habit Suggestions** — `GET /api/ai/suggestions`. Feed the existing daily insights + current habits + burnout risk level into a Groq prompt. Return 3 habit suggestions with `title`, `frequency`, `category`, `rationale`, and `expectedMoodImpact`. Cache using the same SHA-256 hash strategy as AI insights — only regenerate when behavioral data changes.

**16. Personalized AI Coach (Chat Interface)** — `POST /api/ai/chat` with body `{ message, conversationId? }`. Store conversation history in a new MongoDB model `AiConversation`: `userId`, `messages: [{ role, content, timestamp }]`. Inject the user's last 90-day behavioral summary into the system prompt on every call (same pre-processing as `ai.prompt.ts`). Include up to the last 10 messages for context. Gate behind Pro plan.

---

## 👥 Phase 6 — Team & Organization

> Build after monetization is stable. Enterprise plan must exist before org features launch.

**17. Organizations + Members** — `Organization` model: `id`, `name`, `ownerId`, `createdAt`. `OrgMember` model: `orgId`, `userId`, `role` (`OWNER | ADMIN | MEMBER`), `joinedAt`. Endpoints: `POST /api/orgs`, `POST /api/orgs/:id/invite` (sends invite email via existing mailer), `POST /api/orgs/join?token=...`, `DELETE /api/orgs/:id/members/:userId`. Add `requireOrgRole(role)` middleware for all org-scoped routes.

**18. Team Mood Dashboard** — `GET /api/teams/:id/mood/overview`. Aggregate mood data across all org members: team average mood this week, percentage at High burnout risk, week-over-week trend. Data is anonymized by default — no individual names unless the member has opted in via a profile flag. Require a minimum of 3 members before returning any individual breakdowns. Gate behind Enterprise plan.

**19. Manager Burnout Alerts** — Add a weekly Monday 9am cron job (alongside the existing reminder cron). For each org: run team burnout aggregation, compare to last week's snapshot stored in an `OrgMoodSnapshot` model. If High-risk member count increased by more than 20%, send a digest email to all org admins via the existing mailer.

---

## 🔧 Phase 7 — Infrastructure

> These are ongoing — Redis and GDPR deletion can be added at any point. WebSockets and webhooks come last.

**20. Redis Caching Layer** — `npm install ioredis`. Cache keys: `mood:analytics:{userId}`, `mood:streak:{userId}`, `mood:heatmap:{userId}:{days}`, `habit:streak:{habitId}`, `habit:heatmap:{habitId}:{days}`. TTL: 5 minutes for analytics and streaks, 1 hour for heatmaps. Invalidate in `addMood()`, `updateMood()`, `deleteMood()`, `completeHabit()`, `undoLastCompletion()`. Add `X-Cache: HIT | MISS` header to analytics responses for debugging.

**21. Account Deletion (GDPR Right to Erasure)** — `DELETE /api/auth/account` (requires password confirmation in body). Flow: verify password → delete all MongoDB `JournalEntry` docs for `userId` → delete `User` row in Postgres (Prisma `onDelete: Cascade` handles `MoodEntry`, `Habit`, `HabitLog`, `AiInsight`) → revoke all refresh tokens. Send a 24-hour warning email first; add `scheduledDeletion: DateTime?` to `User` and process via a daily cron rather than immediately.

**22. Data Export (CSV / JSON)** — `GET /api/export/mood?format=csv|json` and `GET /api/export/habits?format=csv|json`. For CSV, use a streaming response with `Content-Disposition: attachment` header. Rate-limit to 3 exports per 24 hours per user (exports are expensive — full table scans).

**23. Audit Log** — `UserEvent` model: `userId`, `action`, `metadata JSON`, `ipAddress`, `createdAt`. Log on: login, register, plan upgraded, data exported, account deleted, API key created. `GET /api/admin/users/:id/events` (admin-only). Audit logs are never deleted — even when the user account is deleted, keep the records.

**24. WebSocket Real-time Updates** — Socket.io. Emit events to the user's socket room on: `habit.completed`, `streak.milestone`, `badge.earned`, `notification.created`. The `Notification` model from Phase 2 already has the data structure — WebSocket is just the delivery layer. Authenticate socket connections using the existing JWT.

**25. API Key Management** — `ApiKey` model: `id`, `userId`, `keyHash` (SHA-256), `name`, `lastUsedAt`, `createdAt`, `expiresAt?`. `POST /api/developer/keys` — generate key, return raw value once, store only the hash. `DELETE /api/developer/keys/:id` — revoke. Add API key authentication middleware as an alternative to Bearer JWT on all routes. Gate behind Pro/Enterprise plan.

**26. Webhook System** — `Webhook` model: `userId`, `url`, `events[]`, `secret`, `isActive`. Events: `mood.created`, `habit.completed`, `habit.streak.milestone`, `burnout.risk.changed`, `badge.earned`. On each triggering event, POST a signed `HMAC-SHA256` payload to the registered URL. Retry 3 times with exponential backoff on failure. `GET /api/developer/webhooks/:id/deliveries` for delivery history.

**27. Public Developer Portal** — A static `/developer` route serving an HTML page with: API key management UI, interactive endpoint explorer, code examples in Node.js / Python / curl, rate limit dashboard, and webhook event catalog. This is what makes PulseBloom a platform rather than just an app.

---

## 🚀 Phase 8 — Deployment

**28. Docker Containerization** — `docker-compose.yml` with services: `app` (Node.js), `postgres`, `mongo`, `redis`. Add health checks on all services. Multi-stage Dockerfile: `builder` stage compiles TypeScript, `runner` stage copies compiled output only.

**29. AWS Deployment** — ECS Fargate for the Node app, RDS PostgreSQL, DocumentDB (MongoDB-compatible), ElastiCache Redis. Store secrets in AWS Secrets Manager and inject via environment variables at task definition level.

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
