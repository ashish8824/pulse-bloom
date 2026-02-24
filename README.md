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
- 🧘 Full Habit Tracking Engine with Streak System
- 📅 Habit Heatmaps, Monthly Summaries & Consistency Scoring
- 🔐 Secure JWT-based APIs
- 🗄 Hybrid Database Architecture (PostgreSQL + MongoDB)
- 📘 Fully documented OpenAPI (Swagger)

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
│   │   │   ├── auth.controller.ts       # HTTP layer — parses req, calls service, sends res
│   │   │   ├── auth.service.ts          # Business logic — register, login, password hashing
│   │   │   ├── auth.repository.ts       # DB layer — findUserByEmail, createUser (Prisma)
│   │   │   ├── auth.routes.ts           # POST /api/auth/register, POST /api/auth/login
│   │   │   └── auth.validation.ts       # Zod schemas — registerSchema, loginSchema
│   │   │
│   │   ├── mood/                        # ✅ Mood Tracking + Analytics Module
│   │   │   ├── mood.controller.ts       # HTTP layer for all mood endpoints
│   │   │   ├── mood.service.ts          # Analytics engine — trends, rolling avg, burnout risk
│   │   │   ├── mood.repository.ts       # DB layer — PostgreSQL (mood entries) + MongoDB (journals)
│   │   │   ├── mood.routes.ts           # GET/POST /api/mood + all analytics routes
│   │   │   ├── mood.validation.ts       # Zod schemas — createMoodSchema
│   │   │   └── mood.model.ts            # Mongoose schema for journal entries (MongoDB)
│   │   │
│   │   ├── habits/                      # ✅ Full Habit Engine Module
│   │   │   ├── habit.controller.ts      # HTTP layer — all 15 habit endpoints
│   │   │   ├── habit.service.ts         # Business logic:
│   │   │   │                            #   • createHabit (duplicate guard)
│   │   │   │                            #   • archiveHabit / restoreHabit (soft-delete)
│   │   │   │                            #   • completeHabit (period normalization)
│   │   │   │                            #   • undoLastCompletion
│   │   │   │                            #   • reorderHabits (atomic transaction)
│   │   │   │                            #   • calculateHabitStreak (DST-safe algorithm)
│   │   │   │                            #   • calculateHabitAnalytics (consistency score)
│   │   │   │                            #   • getMonthlyHabitSummary
│   │   │   │                            #   • generateHabitHeatmap
│   │   │   │                            #   • fetchPaginatedLogs
│   │   │   │                            #   • updateReminder
│   │   │   ├── habit.repository.ts      # DB layer — all Prisma queries (habits + logs)
│   │   │   ├── habit.routes.ts          # All 15 routes with full Swagger JSDoc annotations
│   │   │   └── habit.validation.ts      # Zod schemas:
│   │   │                                #   • createHabitSchema
│   │   │                                #   • updateHabitSchema
│   │   │                                #   • completeHabitSchema
│   │   │                                #   • reorderHabitsSchema
│   │   │                                #   • reminderSchema
│   │   │
│   │   ├── ai/                          # 🔮 Upcoming — AI Insights Module
│   │   │   └── (planned)               #   • GPT-powered habit + mood correlation analysis
│   │   │                               #   • Personalized behavioral recommendations
│   │   │                               #   • Burnout prediction model
│   │   │
│   │   ├── community/                   # 🔮 Upcoming — Anonymous Community Module
│   │   │   └── (planned)               #   • Anonymous mood/habit milestone sharing
│   │   │                               #   • Stored in MongoDB (flexible schema)
│   │   │                               #   • Upvote system
│   │   │
│   │   └── challenges/                  # 🔮 Upcoming — Challenge System Module
│   │       └── (planned)               #   • Time-boxed group challenges (30-day meditation)
│   │                                   #   • Leaderboards + progress tracking
│   │                                   #   • Links to existing habit engine
│   │
│   ├── jobs/                            # ✅ Background Jobs (Cron)
│   │   └── reminder.cron.ts             # node-cron job — runs every minute
│   │                                   #   • Fetches habits with reminderOn: true
│   │                                   #   • Compares reminderTime to current HH:MM
│   │                                   #   • Checks if habit already completed today
│   │                                   #   • Sends email via Nodemailer if not completed
│   │                                   #   • Graceful error handling per habit (one fail ≠ all fail)
│   │
│   ├── middlewares/                     # Global Express middlewares
│   │   ├── auth.middleware.ts           # JWT verification → attaches req.userId
│   │   ├── error.middleware.ts          # Global error handler:
│   │   │                               #   • ZodError → 400 with field-level issues array
│   │   │                               #   • Known AppErrors → correct HTTP status (404, 409, etc.)
│   │   │                               #   • Unknown errors → 500 (never leaks internals)
│   │   └── rateLimiter.ts              # express-rate-limit (100 req / 15 min globally)
│   │
│   ├── websocket/                       # 🔮 Upcoming — Real-time Layer
│   │   └── socket.ts                   # Socket.io server setup
│   │                                   #   • Real-time streak milestone events
│   │                                   #   • Live habit completion notifications
│   │                                   #   • Community post broadcast
│   │
│   ├── utils/                           # Shared utility functions
│   │   ├── jwt.ts                      # generateToken(payload) + verifyToken(token)
│   │   ├── date.utils.ts               # normalizeDailyDate() — midnight today
│   │   │                               # normalizeWeeklyDate() — Monday midnight of ISO week
│   │   ├── logger.ts                   # Structured logger (console → Winston in prod)
│   │   └── helpers.ts                  # Shared helper functions
│   │
│   ├── types/                           # TypeScript global type extensions
│   │   └── express.d.ts                # Extends Express Request with req.userId: string
│   │
│   ├── app.ts                           # Express app setup:
│   │                                   #   • Global middlewares (json, cors, helmet)
│   │                                   #   • Rate limiter
│   │                                   #   • Swagger UI route (/api-docs)
│   │                                   #   • Health check (/health)
│   │                                   #   • Module routes (/api/auth, /api/mood, /api/habits)
│   │                                   #   • Global error handler (must be last)
│   │
│   └── server.ts                        # Entry point:
│                                        #   • Connects MongoDB
│                                        #   • Starts reminder cron job
│                                        #   • Starts Express on PORT
│
├── prisma/
│   ├── schema.prisma                    # DB schema:
│   │                                   #   Models: User, MoodEntry, Habit, HabitLog
│   │                                   #   Enums: HabitFrequency, HabitCategory
│   │                                   #   Constraints: @@unique, @@index
│   └── migrations/                     # Auto-generated SQL migration history
│
├── tests/                               # 🔮 Upcoming — Test Suite
│   ├── unit/                           #   • habit.service.test.ts
│   │                                   #   • date.utils.test.ts
│   └── integration/                    #   • habit.routes.test.ts (supertest)
│
├── .env                                 # Environment variables (never commit)
│                                       #   PORT, DATABASE_URL, MONGO_URI
│                                       #   JWT_SECRET
│                                       #   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
│                                       #   EMAIL_FROM
│
├── .env.example                         # Safe template to commit (no real values)
├── .gitignore                           # node_modules, .env, dist
├── docker-compose.yml                   # 🔮 Upcoming — PostgreSQL + MongoDB + Node containers
├── tsconfig.json                        # TypeScript config (strict mode, paths, outDir: dist)
├── package.json                         # Dependencies + npm scripts
└── README.md                            # Full API documentation
```

---

# 🔐 Authentication

PulseBloom uses **JWT-based authentication**.

### Register

```
POST /api/auth/register
```

```json
{
  "name": "Ashish Anand",
  "email": "ashish@example.com",
  "password": "securepassword"
}
```

### Login

```
POST /api/auth/login
```

```json
{
  "email": "ashish@example.com",
  "password": "securepassword"
}
```

All protected routes require:

```
Authorization: Bearer <token>
```

- Access token expiry: `1 day`
- Password hashing: `bcrypt` (salt rounds: 10)

---

# 📊 Mood Module

The Mood Module is production-ready and analytics-enabled.

## Create Mood Entry

```
POST /api/mood
```

```json
{
  "moodScore": 4,
  "emoji": "😊",
  "journalText": "Had a productive day."
}
```

Stores mood score + emoji in **PostgreSQL** and journal text in **MongoDB**.

## Paginated Mood History

```
GET /api/mood?page=1&limit=10
```

## Date Filtering

```
GET /api/mood?startDate=2026-01-01&endDate=2026-01-31
```

## Mood Analytics

```
GET /api/mood/analytics
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

## Weekly Trend Analysis

```
GET /api/mood/trends/weekly
```

Returns ISO week groupings with weekly average and entry count.

## Rolling 7-Day Average

```
GET /api/mood/trends/rolling
```

```json
{
  "rollingAverage": [{ "date": "2026-02-10", "averageMood": 3.57 }]
}
```

## Burnout Risk Scoring

```
GET /api/mood/burnout-risk
```

```json
{
  "riskScore": 8.5,
  "riskLevel": "Moderate",
  "metrics": { "averageMood": 2.9, "lowMoodDays": 4, "volatility": 3 }
}
```

Risk Levels: `0–5 → Low` | `6–10 → Moderate` | `10+ → High`

---

# 🧘 Habits Module (Fully Implemented)

The Habits Module is the core of PulseBloom's behavioral intelligence layer.

It provides a complete habit tracking engine with:

- Full CRUD with soft-delete (archive/restore)
- Daily and weekly frequency support with period normalization
- Duplicate prevention (case-insensitive, per user)
- Streak engine with DST-safe calculations
- Comprehensive analytics with consistency scoring
- GitHub-style heatmap data
- Monthly calendar summaries
- Milestone detection and gamification
- Drag-and-drop reordering support
- Reminder settings per habit
- Category, color, and icon organization
- Paginated log history
- Undo last completion

---

## 📋 Habit CRUD

### Create Habit

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
| `targetPerWeek` | integer 1–7         | ❌       | Weekly goal (affects completion rate calculation)                        |
| `reminderTime`  | `HH:MM`             | ❌       | 24-hour format                                                           |
| `reminderOn`    | boolean             | ❌       | Toggle reminder                                                          |

**Response:**

```json
{
  "id": "uuid",
  "title": "Morning Meditation",
  "frequency": "daily",
  "category": "mindfulness",
  "color": "#7C3AED",
  "icon": "🧘",
  "targetPerWeek": 5,
  "sortOrder": 0,
  "isArchived": false,
  "reminderTime": "08:00",
  "reminderOn": true,
  "userId": "uuid",
  "createdAt": "2026-02-23T00:00:00.000Z",
  "updatedAt": "2026-02-23T00:00:00.000Z"
}
```

---

### Get All Active Habits

```
GET /api/habits
GET /api/habits?category=mindfulness
```

Returns all non-archived habits ordered by `sortOrder`, then `createdAt`.
Optional `?category=` filter to get habits by life area.

---

### Get Archived Habits

```
GET /api/habits/archived
```

Returns all soft-deleted habits with full history intact.
These can be restored at any time.

---

### Update Habit (PATCH)

```
PATCH /api/habits/:id
```

```json
{
  "title": "Evening Meditation",
  "color": "#10B981"
}
```

True PATCH semantics — only provided fields are changed.
If title or frequency changes, a duplicate check is re-run against other active habits (excluding the current one).

---

### Archive Habit (Soft Delete)

```
DELETE /api/habits/:id
```

Marks the habit as archived. It disappears from all lists but **all completion log history is fully preserved**. Streak history and analytics remain intact.

> **Why soft delete?** Hard-deleting a habit would cascade-delete all HabitLog rows via `onDelete: Cascade`, permanently destroying streak history and behavioral data.

---

### Restore Habit

```
PATCH /api/habits/:id/restore
```

Brings an archived habit back to active.
Blocked if a duplicate active habit now exists — returns an error asking the user to rename first.

---

### Reorder Habits

```
PATCH /api/habits/reorder
```

```json
{
  "habits": [
    { "id": "uuid-1", "sortOrder": 0 },
    { "id": "uuid-2", "sortOrder": 1 },
    { "id": "uuid-3", "sortOrder": 2 }
  ]
}
```

Updates `sortOrder` for multiple habits in a **single atomic database transaction**.
If any update fails, all changes are rolled back — the list can never end up in a partially reordered state.

---

## ✅ Habit Completion

### Mark as Completed

```
POST /api/habits/:id/complete
```

```json
{
  "note": "Felt really focused today"
}
```

Note is optional (max 300 chars).

**Period normalization:**

- `daily` → normalized to midnight of today
- `weekly` → normalized to Monday midnight of the current ISO week

This means completing a habit at 9am and 11pm on the same day maps to the same date, preventing duplicates. The `@@unique([habitId, date])` DB constraint enforces this at the database level.

**Response includes streak milestone detection:**

```json
{
  "message": "Habit marked as completed",
  "log": {
    "id": "uuid",
    "date": "2026-02-23T00:00:00.000Z",
    "note": "Felt really focused today"
  },
  "currentStreak": 7,
  "milestone": {
    "days": 7,
    "message": "Amazing! You hit a 7-day streak!"
  }
}
```

`milestone` is `null` if no milestone was hit. Milestones trigger at: **7, 14, 21, 30, 60, 90, 100, 180, 365 days.**

---

### Undo Last Completion

```
DELETE /api/habits/:id/complete
```

Removes the most recent completion log.
**Only allowed if the latest log is from the current period** — you cannot undo a log from a previous day or week.

---

## 🔔 Reminders

### Update Reminder Settings

```
PATCH /api/habits/:id/reminder
```

```json
{
  "reminderOn": true,
  "reminderTime": "08:00"
}
```

- `reminderOn: true` requires a `reminderTime` — either now or already saved
- `reminderOn: false` disables without clearing the time (re-enabling reuses the saved time)

---

## 📈 Habit Analytics

### Current Streak

```
GET /api/habits/:id/streak
```

```json
{
  "currentStreak": 7
}
```

**Streak algorithm:**

- Fetches logs in DESC order (most recent first)
- Starts counting from the most recent log, NOT from today
- This means a 10-day streak through yesterday returns `10`, not `0`
- A streak only breaks if a full period was genuinely skipped
- 60-second DST tolerance prevents false breaks at daylight saving time boundaries

---

### Full Analytics

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

**Field explanations:**

| Field              | What It Means                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `completionRate`   | % of periods completed. If `targetPerWeek` is set, calculated against the target rather than every possible day |
| `currentStreak`    | Consecutive periods completed right now                                                                         |
| `longestStreak`    | Personal best consecutive run ever                                                                              |
| `bestDayOfWeek`    | Day of week the user completes this habit most (behavioral insight)                                             |
| `consistencyScore` | 0–100 composite score: 50% completion rate + 30% streak normalized to personal best + 20% recency               |

> **Why consistencyScore?** A user with 60% completion rate and a 30-day active streak is performing much better than one with 60% rate who hasn't done it in 2 weeks. The composite score captures this nuance.

---

### Monthly Summary

```
GET /api/habits/:id/summary?month=2026-02
```

Defaults to current month if `month` not provided.

```json
{
  "month": "2026-02",
  "completionsThisMonth": 18,
  "completionRate": 64.29,
  "calendar": [
    { "date": "2026-02-01", "completed": true },
    { "date": "2026-02-02", "completed": false },
    { "date": "2026-02-03", "completed": true }
  ]
}
```

One entry per day. Used for calendar UI views on the frontend.

---

### Heatmap Data

```
GET /api/habits/:id/heatmap?days=365
```

Max 730 days (2 years). Defaults to 365.

```json
{
  "heatmap": [
    { "date": "2025-02-23", "completed": 0 },
    { "date": "2025-02-24", "completed": 1 }
  ]
}
```

`completed: 0 | 1` — maps directly to GitHub-style color intensity on the frontend.

---

### Paginated Log History

```
GET /api/habits/:id/logs?page=1&limit=20
```

```json
{
  "logs": [
    {
      "id": "uuid",
      "date": "2026-02-23T00:00:00.000Z",
      "note": "Great session",
      "completed": true
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

> **Why pagination?** A habit tracked daily for 2 years has 730 log rows. Loading all of them on every request is wasteful. Pagination loads only what the UI needs.

---

## 🗄 Database Schema (Habits)

```prisma
model Habit {
  id           String         @id @default(uuid())
  title        String
  description  String?
  frequency    HabitFrequency          // daily | weekly
  category     HabitCategory           // health | fitness | learning | ...
  color        String?                 // #7C3AED
  icon         String?                 // 🧘
  targetPerWeek Int?                   // optional weekly goal
  sortOrder    Int            @default(0)
  isArchived   Boolean        @default(false)
  reminderTime String?                 // "08:00"
  reminderOn   Boolean        @default(false)
  userId       String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@unique([userId, title, frequency])  // prevents duplicates at DB level
  @@index([userId])
}

model HabitLog {
  id        String   @id @default(uuid())
  habitId   String
  date      DateTime                    // normalized period timestamp
  completed Boolean  @default(true)
  note      String?
  createdAt DateTime @default(now())

  @@unique([habitId, date])             // one log per period per habit
  @@index([habitId])
}
```

---

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

# 🗄 Hybrid Database Architecture

## PostgreSQL (Structured Data)

Managed via **Prisma ORM** with a `pg` connection pool.

Stores:

- Users
- Mood entries
- Habits + HabitLogs (all analytics data)

Used for:

- Filtering, pagination, sorting
- Statistical calculations
- Streak and analytics queries
- Transactional operations (reordering)

## MongoDB (Unstructured Data)

Managed via **Mongoose**.

Stores:

- Journal entries (mood text)
- Future AI insights cache
- Community posts (upcoming)

Optimized for:

- Flexible schemas
- Text-heavy storage
- AI model integration

---

# 🛡 Security & Reliability

- `bcrypt` password hashing (salt rounds: 10)
- JWT-based stateless authentication
- Route-level `protect` middleware
- Global centralized error handler with typed error responses
- ZodError handled distinctly (field-level validation errors)
- `express-rate-limit` (100 req / 15 min globally)
- `helmet` security headers
- CORS enabled
- Environment variable validation on startup
- Atomic DB transactions for multi-row operations
- Soft-delete pattern preserves all historical data
- DB-level unique constraints as safety net for race conditions
- `@@index` on hot query columns for performance

---

# 📘 API Documentation

Interactive Swagger UI available at:

```
http://localhost:5000/api-docs
```

Features:

- Bearer token authentication
- All request/response schemas documented
- Organized by feature module
- Real-time API testing

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
JWT_SECRET=your_super_secret_key
```

## 4. Setup PostgreSQL

```sql
CREATE DATABASE pulsebloom;
```

Run migrations:

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

---

# 📦 Feature Status

| Feature                             | Status      |
| ----------------------------------- | ----------- |
| Authentication (Register/Login)     | ✅ Complete |
| Protected Routes (JWT middleware)   | ✅ Complete |
| Mood CRUD                           | ✅ Complete |
| Mood Pagination + Date Filtering    | ✅ Complete |
| Mood Analytics Engine               | ✅ Complete |
| Weekly Trend Analysis               | ✅ Complete |
| Rolling 7-Day Average               | ✅ Complete |
| Burnout Risk Scoring                | ✅ Complete |
| Swagger Documentation               | ✅ Complete |
| Hybrid DB Architecture (PG + Mongo) | ✅ Complete |
| Habit CRUD (Create, Read, Update)   | ✅ Complete |
| Habit Soft Delete + Restore         | ✅ Complete |
| Habit Duplicate Prevention          | ✅ Complete |
| Habit Categories, Color, Icon       | ✅ Complete |
| Habit Reordering (Drag & Drop)      | ✅ Complete |
| Habit Completion + Undo             | ✅ Complete |
| Streak Engine (DST-safe)            | ✅ Complete |
| Streak Milestone Detection          | ✅ Complete |
| Habit Analytics + Consistency Score | ✅ Complete |
| Best Day of Week Insight            | ✅ Complete |
| Monthly Calendar Summary            | ✅ Complete |
| GitHub-style Heatmap                | ✅ Complete |
| Paginated Log History               | ✅ Complete |
| Reminder Settings                   | ✅ Complete |
| targetPerWeek Goal Support          | ✅ Complete |
| Global Error Handler (Zod + App)    | ✅ Complete |
| AI-powered Insights                 | 🔮 Upcoming |
| Anonymous Community Posts           | 🔮 Upcoming |
| Challenge System                    | 🔮 Upcoming |
| WebSocket Real-time Updates         | 🔮 Upcoming |
| Reminder Cron Job (node-cron)       | 🔮 Upcoming |
| Redis Caching                       | 🔮 Upcoming |
| Docker Containerization             | 🔮 Upcoming |
| AWS Deployment                      | 🔮 Upcoming |

---

# 🔮 Upcoming Features

**Reminder Cron Job** — A `node-cron` background job that runs every minute, checks `reminderTime` against the current time, and sends push notifications to users who haven't completed their habit yet.

**AI-Powered Insights** — Uses mood + habit data together to generate personalized behavioral insights ("You tend to have lower mood on weeks you miss meditation more than 2 days").

**Redis Caching** — Analytics endpoints (`/analytics`, `/streak`, `/heatmap`) are read-heavy. Redis caching with a 5-minute TTL will eliminate redundant recalculations. Cache is invalidated on every `completeHabit()` call.

**Anonymous Community Posts** — Users can share habit milestones or mood reflections anonymously. Stored in MongoDB.

**Challenge System** — Time-boxed challenges (e.g. "30-day meditation challenge") that multiple users can join, with a shared leaderboard.

**WebSocket Real-time Updates** — Streak updates and milestone achievements pushed to the frontend in real time via Socket.io.

**Docker + AWS** — Full containerization with Docker Compose (Node, PostgreSQL, MongoDB, Redis) and AWS ECS deployment with RDS and DocumentDB.

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
