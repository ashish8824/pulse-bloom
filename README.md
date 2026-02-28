# 🌸 PulseBloom Backend

> Track your pulse. Bloom with intention.

PulseBloom is a **production-grade, AI-ready behavioral analytics backend** designed for high-performance professionals managing stress, productivity, and emotional well-being.

This backend powers a modern SaaS-style platform capable of mood tracking, habit building, statistical analytics, trend detection, burnout risk modeling, and behavioral intelligence.

Built with scalable architecture, advanced backend logic, and production-level engineering standards.

---

# 🚀 Product Vision

PulseBloom transforms simple daily logs into **actionable behavioral intelligence**.

Instead of basic CRUD tracking, it provides:

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
- 🔐 Secure JWT-based APIs
- 🗄 Hybrid Database Architecture (PostgreSQL + MongoDB)
- 📘 Fully documented OpenAPI (Swagger)
- ⏰ Automated Habit Reminder Emails (node-cron + Gmail SMTP)
- 🤖 AI-powered Behavioural Insights (GPT-4o-mini)

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
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
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
│   │   ├── community/                   # 🔮 Upcoming
│   │   └── challenges/                  # 🔮 Upcoming
│   │
│   ├── jobs/
│   │   └── reminder.cron.ts             # node-cron — runs every minute
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts           # JWT verification → attaches req.userId
│   │   ├── error.middleware.ts          # Global error handler (Zod + App + unknown)
│   │   └── rateLimiter.ts              # express-rate-limit (100 req / 15 min)
│   │
│   ├── websocket/                       # 🔮 Upcoming — Socket.io real-time layer
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── date.utils.ts
│   │   ├── logger.ts
│   │   ├── mailer.ts
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

PulseBloom uses a **dual-token JWT authentication system** with email verification.

---

## Auth Flow Overview

```
Register → OTP Email → Verify Email → Login → Access Token (15m) + Refresh Token (7d)
```

- **Access Token** — short-lived JWT (15 min), sent in `Authorization: Bearer <token>` header
- **Refresh Token** — long-lived opaque token (7 days), stored in DB, used to rotate both tokens silently

---

## API Reference

| Method | Endpoint                        | Auth | Rate Limit | Description                      |
| ------ | ------------------------------- | ---- | ---------- | -------------------------------- |
| `POST` | `/api/auth/register`            | ❌   | 10/15min   | Create account, sends OTP email  |
| `POST` | `/api/auth/verify-email`        | ❌   | —          | Confirm OTP, issues tokens       |
| `POST` | `/api/auth/resend-verification` | ❌   | 3/15min    | Re-send OTP email                |
| `POST` | `/api/auth/login`               | ❌   | 10/15min   | Login, issues tokens             |
| `POST` | `/api/auth/refresh-token`       | ❌   | —          | Rotate access + refresh tokens   |
| `POST` | `/api/auth/logout`              | ✅   | —          | Revoke current session           |
| `GET`  | `/api/auth/me`                  | ✅   | —          | Get authenticated user profile   |
| `POST` | `/api/auth/forgot-password`     | ❌   | 3/15min    | Send password reset email        |
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

**Response `200`** — first time tokens are issued:

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

The old refresh token is **immediately revoked**. The client must store the new refresh token returned in the response. Returns the same shape as login.

**Security:** If a revoked token is reused (stolen token attack), all sessions for that user are immediately terminated.

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

Always returns `200` regardless of whether the email is registered (prevents user enumeration). A reset link valid for **1 hour** is sent if the email exists.

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

Validates the token, saves the new password, and **revokes all refresh tokens** (forces re-login on all devices).

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

```json
{
  "data": [ { "id": "uuid", "moodScore": 4, "emoji": "😊", ... } ],
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

Returns the current consecutive-day logging streak.

**Algorithm:** The streak anchor is today (or yesterday, as a grace period). If you haven't logged yet today but logged yesterday, the streak stays active — you won't lose a 30-day streak at 7am simply for not having logged yet.

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

`averageScore: null` means no entry was logged on that day. Used by calendar UI components to render coloured day cells.

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
      { "day": "Tuesday", "averageMood": 3.9, "entries": 13 },
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

**Day-of-week pattern** reveals which weekday has your best/worst average mood and where you log most consistently.

**Time-of-day pattern** buckets entries into Morning / Afternoon / Evening / Night and shows when you feel best.

---

## Weekly Trend Analysis

```
GET /api/mood/trends/weekly
```

Groups mood entries by ISO 8601 week (weeks start Monday, week 1 = week containing the first Thursday of the year). Returns weeks in chronological order.

```json
{
  "weeklyTrends": [
    { "week": "2026-W05", "averageMood": 3.6, "entries": 5 },
    { "week": "2026-W06", "averageMood": 4.1, "entries": 7 },
    { "week": "2026-W07", "averageMood": 2.9, "entries": 4 }
  ]
}
```

---

## Rolling 7-Day Average

```
GET /api/mood/trends/rolling
```

For each calendar date with an entry, calculates the average mood score across the 7-day window ending on that date. Multiple entries on the same day are averaged before the window calculation.

```json
{
  "rollingAverage": [
    { "date": "2026-02-10", "averageMood": 3.57 },
    { "date": "2026-02-11", "averageMood": 3.71 },
    { "date": "2026-02-12", "averageMood": 3.86 }
  ]
}
```

---

## Burnout Risk Scoring

```
GET /api/mood/burnout-risk
```

Calculates a composite burnout risk score from three signals. Requires at least 3 entries.

**Formula:**

```
riskScore = (lowMoodDays × 2) + (max(0, 3.0 − averageMood) × 3) + (volatility × 1.5)
```

| Signal        | Weight | Description                                                                                                        |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `lowMoodDays` | × 2    | Days where moodScore ≤ 2                                                                                           |
| `moodDeficit` | × 3    | How far the average falls below the neutral threshold 3.0 (clamped ≥ 0 so healthy averages don't reduce the score) |
| `volatility`  | × 1.5  | Range between highest and lowest score                                                                             |

**Risk Levels:**

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

**Indexes on JournalEntry:**

- `{ userId: 1 }` — fast lookup by user
- `{ moodEntryId: 1 }` (unique) — one journal per mood entry
- `{ userId: 1, createdAt: -1 }` — future journal history + AI context queries

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

---

## Habit Completion

```
POST /api/habits/:id/complete
```

```json
{ "note": "Felt really focused today" }
```

**Period normalization:**

- `daily` → normalized to midnight of today
- `weekly` → normalized to Monday midnight of the current ISO week

Completing at 9am and 11pm on the same day maps to the same date. The `@@unique([habitId, date])` constraint enforces this at the database level.

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

All `sortOrder` updates run in a **single atomic database transaction**. If any update fails, all changes roll back — the list can never end up partially reordered.

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

PulseBloom uses **GPT-4o-mini** to cross-correlate mood scores and habit completion data, generating personalised behavioral insights.

## Endpoint

```
GET /api/ai/insights
GET /api/ai/insights?refresh=true
```

`?refresh=true` bypasses the cache and forces regeneration.

## How It Works

```
GET /api/ai/insights
    ↓
Fetch last 90 days of mood entries + habit logs (parallel DB queries)
    ↓
Compute SHA-256 hash of raw data snapshot
    ↓
Check AiInsight cache: current hash === cached hash?
    YES → return cached insights instantly (zero OpenAI cost)
    NO  → continue
    ↓
Pre-process into weekly behavioral summaries (ai.prompt.ts)
    ↓
Build system + user prompts
    ↓
Call OpenAI gpt-4o-mini (temperature: 0.4, max_tokens: 1200)
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

Results are cached in PostgreSQL (`AiInsight` table) using a **SHA-256 data hash**. The OpenAI API is only called when the user's behavioral data has actually changed — not on a fixed TTL. This means zero API cost on repeated requests with unchanged data.

## Minimum Data Requirements

- At least 7 mood entries, **OR**
- At least 1 habit with 5+ completions

## Environment Variable Required

```env
OPENAI_API_KEY=sk-...your-key-here...
```

---

# 🗄 Hybrid Database Architecture

## PostgreSQL (Structured Data)

Managed via **Prisma ORM** with a `pg` connection pool adapter.

Stores: Users, MoodEntry, Habit, HabitLog, AiInsight cache.

Used for: Filtering, pagination, sorting, analytics calculations, streak queries, transactional reordering, cron job reminder queries.

## MongoDB (Unstructured Data)

Managed via **Mongoose**.

Stores: JournalEntry (mood text + tags).

Optimised for: Flexible schemas, text-heavy storage, future AI model integrations, community posts (upcoming).

---

# 🛡 Security & Reliability

- `bcrypt` password hashing (salt rounds: 12)
- Strong password policy enforced at validation layer (uppercase, lowercase, number, special char)
- Dual-token JWT system — short-lived access tokens (15m) + long-lived refresh tokens (7d)
- Refresh token rotation — every `/refresh-token` call revokes the old token and issues a new one
- Refresh token reuse detection — using a revoked token terminates all sessions for that user
- Email verification required before login — unverified accounts cannot access the API
- OTP generated with `crypto.randomInt` (cryptographically secure, not `Math.random`)
- Password reset tokens generated with `crypto.randomBytes(32)` (256-bit randomness)
- Password reset revokes all existing refresh tokens — forces re-login on all devices
- All forgot-password and resend-verification responses are identical (prevents user enumeration)
- Route-level `protect` middleware on all user endpoints — validates access token, attaches `req.userId`
- `TokenExpiredError` distinguished from `JsonWebTokenError` — client knows to refresh vs re-login
- Global centralised error handler — ZodError → 400 with field-level detail, AppErrors → correct HTTP status, unknown errors → 500 (never leaks internals)
- Tiered rate limiting — global (100 req/15min), auth login/register (10 req/15min), OTP resend + forgot-password (3 req/15min)
- `skipSuccessfulRequests: true` on login limiter — only failed attempts count toward the limit
- `helmet` security headers
- CORS enabled
- Environment variable validation on startup — server refuses to start with missing required vars
- Atomic database transactions for multi-row operations (habit reorder)
- Soft-delete pattern preserves all historical behavioral data
- DB-level unique constraints as a safety net against race conditions
- `@@index` on all hot query columns for performance — including `@@index([token])` for O(1) refresh token lookup
- Ownership checks (`assertMoodOwnership`) before every write operation
- Cron job error isolation — one email failure never blocks other users
- MongoDB cleanup runs before Postgres delete — prevents orphaned documents
- Gmail SMTP with TLS for secure email delivery

---

# 📘 API Documentation

Interactive Swagger UI available at:

```
http://localhost:5000/api-docs
```

Features:

- Bearer token authentication
- All request/response schemas documented with examples
- Organised by feature module (Auth / Mood / Habits / AI Insights)
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

# Gmail SMTP — for verification OTP + password reset + habit reminder emails
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="PulseBloom 🌸 <yourgmail@gmail.com>"

# Frontend URL — used in password reset email link
# Development: http://localhost:3000  |  Production: https://yourapp.com
APP_URL=http://localhost:3000

# GROQ — for AI insights
GROQ_API_KEY=sk-...your-key-here...
```

> **Gmail App Password Setup:**
>
> 1. Go to [myaccount.google.com/security](https://myaccount.google.com/security) → enable 2-Step Verification
> 2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → create an App Password named `PulseBloom`
> 3. Copy the 16-character password (remove spaces) → paste into `SMTP_PASS`

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

| Feature                                    | Status      |
| ------------------------------------------ | ----------- |
| Authentication (Register/Login)            | ✅ Complete |
| Email Verification (OTP flow)              | ✅ Complete |
| Refresh Token + Token Rotation             | ✅ Complete |
| Forgot Password / Reset Password           | ✅ Complete |
| GET /me — User Profile Endpoint            | ✅ Complete |
| Tiered Auth Rate Limiting                  | ✅ Complete |
| Protected Routes (JWT middleware)          | ✅ Complete |
| Mood CRUD (Create, Read, Update, Delete)   | ✅ Complete |
| Mood Pagination + Date Filtering           | ✅ Complete |
| Mood Entry Hydration (journal + tags)      | ✅ Complete |
| Mood Journal Cross-store Sync (PG + Mongo) | ✅ Complete |
| Mood Context Tags                          | ✅ Complete |
| Mood Analytics Engine                      | ✅ Complete |
| Mood Logging Streak                        | ✅ Complete |
| Mood Heatmap (GitHub-style)                | ✅ Complete |
| Monthly Mood Calendar Summary              | ✅ Complete |
| Day-of-Week + Time-of-Day Pattern Insights | ✅ Complete |
| Weekly Trend Analysis (ISO 8601)           | ✅ Complete |
| Rolling 7-Day Average                      | ✅ Complete |
| Burnout Risk Scoring                       | ✅ Complete |
| Swagger Documentation                      | ✅ Complete |
| Hybrid DB Architecture (PG + Mongo)        | ✅ Complete |
| Habit CRUD (Create, Read, Update)          | ✅ Complete |
| Habit Soft Delete + Restore                | ✅ Complete |
| Habit Duplicate Prevention                 | ✅ Complete |
| Habit Categories, Color, Icon              | ✅ Complete |
| Habit Reordering (Drag & Drop, Atomic TX)  | ✅ Complete |
| Habit Completion + Undo                    | ✅ Complete |
| Habit Streak Engine (DST-safe)             | ✅ Complete |
| Streak Milestone Detection                 | ✅ Complete |
| Habit Analytics + Consistency Score        | ✅ Complete |
| Best Day of Week Insight                   | ✅ Complete |
| Monthly Habit Calendar Summary             | ✅ Complete |
| GitHub-style Habit Heatmap                 | ✅ Complete |
| Paginated Habit Log History                | ✅ Complete |
| Habit Reminder Settings                    | ✅ Complete |
| targetPerWeek Goal Support                 | ✅ Complete |
| Global Error Handler (Zod + App + Unknown) | ✅ Complete |
| Reminder Cron Job (node-cron)              | ✅ Complete |
| Structured Logger                          | ✅ Complete |
| Gmail SMTP Email Delivery                  | ✅ Complete |
| AI-powered Insights (GPT-4o-mini)          | ✅ Complete |
| SHA-256 Hash-based AI Cache                | ✅ Complete |
| Anonymous Community Posts                  | 🔮 Upcoming |
| Challenge System                           | 🔮 Upcoming |
| WebSocket Real-time Updates (Socket.io)    | 🔮 Upcoming |
| Redis Caching                              | 🔮 Upcoming |
| Docker Containerization                    | 🔮 Upcoming |
| AWS Deployment                             | 🔮 Upcoming |

---

# 🔮 Upcoming Features

**Redis Caching** — Analytics endpoints (`/analytics`, `/streak`, `/heatmap`) are read-heavy. Redis will cache results with a short TTL, invalidated on every `addMood()` or `completeHabit()` call, eliminating redundant recalculations at scale.

**Anonymous Community Posts** — Users can share habit milestones or mood reflections anonymously. Stored in MongoDB for flexible schema. Includes an upvote system.

**Challenge System** — Time-boxed group challenges (e.g. "30-day meditation challenge") with shared leaderboards and progress tracking that links directly to the existing habit engine.

**WebSocket Real-time Updates** — Streak milestones and habit completion events pushed to the frontend in real time via Socket.io, enabling live celebration animations without polling.

**Docker + AWS** — Full containerisation with Docker Compose (Node, PostgreSQL, MongoDB, Redis) and AWS ECS deployment with RDS and DocumentDB.

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
