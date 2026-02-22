# 🌸 PulseBloom Backend

> Track your pulse. Bloom with intention.

PulseBloom is a production-grade, AI-ready behavioral analytics backend designed for high-performance professionals managing stress, productivity, and emotional well-being.

This backend powers a modern SaaS-style platform capable of mood tracking, statistical analytics, trend detection, and burnout risk modeling.

Built with scalable architecture, advanced backend logic, and production-level engineering standards.

---

# 🚀 Product Vision

PulseBloom transforms simple mood logging into actionable behavioral intelligence.

Instead of basic CRUD tracking, it provides:

- 📊 Advanced Mood Analytics
- 📈 Weekly Trend Analysis
- 📉 Rolling 7-Day Moving Averages
- 🔥 Burnout Risk Scoring
- 🔐 Secure JWT-based APIs
- 🗄 Hybrid Database Architecture
- 📘 Fully documented OpenAPI (Swagger)

This is not a tutorial backend.
This is a SaaS-ready behavioral analytics engine.

---

# 🏗 Architecture

PulseBloom follows a **Modular Monolith + Clean Architecture pattern**:

Route → Controller → Service → Repository → Database

This ensures:

- Clear separation of concerns
- Scalable feature modules
- Testable business logic
- Easy future migration to microservices
- Production maintainability

## Folder Structure

src/├── config/ # Environment, DB, Swagger config├── modules/ # Feature-based modules│ ├── auth/│ ├── mood/│ ├── habits/ (Upcoming)│ ├── ai/ (Upcoming)│ ├── community/ (Upcoming)│ └── challenges/ (Upcoming)├── middlewares/ # Auth, rate limit, error handling├── websocket/ # Real-time features (Upcoming)├── utils/ # JWT helpers, utilities├── types/ # TypeScript extensions├── app.ts└── server.ts

---

# 🔐 Authentication

PulseBloom uses JWT-based authentication.

### Register

POST /api/auth/register

### Login

POST /api/auth/login

All protected routes require:

Authorization: Bearer <token>

- Access token expiry: 15 minutes
- Password hashing: bcrypt (salt rounds: 10)

---

# 📊 Mood Module (Fully Implemented)

The Mood Module is production-ready and analytics-enabled.

## 1️⃣ Create Mood Entry

POST /api/mood

Body:
{
"moodScore": 4,
"emoji": "😊",
"journalText": "Had a productive day."
}

Stores:

- Mood score (1–5)
- Emoji
- Journal text (MongoDB)
- Structured relational record (PostgreSQL)

---

## 2️⃣ Paginated Mood History

GET /api/mood?page=1&limit=10

Includes:

- Offset pagination
- Metadata:
  - total
  - page
  - limit
  - totalPages

---

## 3️⃣ Date Filtering

GET /api/mood?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD

Supports:

- startDate only
- endDate only
- combined filtering
- pagination + filtering together

---

# 📈 Analytics Engine

PulseBloom includes real behavioral analytics.

## Mood Analytics

GET /api/mood/analytics

Returns:

- totalEntries
- averageMood
- highestMood
- lowestMood
- mostFrequentMood
- mood distribution (1–5 count)

Example:
{
"totalEntries": 20,
"averageMood": 3.8,
"highestMood": 5,
"lowestMood": 1,
"mostFrequentMood": 4,
"distribution": {
"1": 2,
"2": 3,
"3": 5,
"4": 6,
"5": 4
}
}

---

## Weekly Trend Analysis

GET /api/mood/trends/weekly

Provides:

- ISO week grouping
- Weekly average scores
- Entry count per week
- Dashboard-ready data

---

## Rolling 7-Day Average

GET /api/mood/trends/rolling

Returns smoothed moving averages for time-series visualization:

{
"rollingAverage": [
{
"date": "2026-02-10",
"averageMood": 3.57
}
]
}

---

## Burnout Risk Scoring 🔥

GET /api/mood/burnout-risk

Risk model considers:

- Low mood frequency
- Mood volatility
- Average mood trend
- Emotional instability patterns

Example response:
{
"riskScore": 8.5,
"riskLevel": "Moderate",
"metrics": {
"averageMood": 2.9,
"lowMoodDays": 4,
"volatility": 3
}
}

Risk Levels:

- 0–5 → Low
- 6–10 → Moderate
- 10+ → High

This converts raw mood logs into predictive behavioral intelligence.

---

# 🗄 Hybrid Database Architecture

## PostgreSQL (Structured Data)

Stores:

- Users
- Mood entries
- Aggregation-ready records
- Future streak logic

Used for:

- Filtering
- Pagination
- Statistical calculations
- Analytics

## MongoDB (Unstructured Data)

Stores:

- Journal entries
- AI-ready text
- Future insights cache
- Community posts (Upcoming)

Optimized for:

- Flexible schemas
- Text-heavy storage
- AI model integration

---

# 🛡 Security & Reliability

- bcrypt password hashing
- JWT-based authentication
- Route-level protection middleware
- Global centralized error handler
- Express rate limiting (100 req / 15 min)
- Helmet security headers
- CORS enabled
- Environment variable protection

---

# 📘 API Documentation

Interactive Swagger documentation:

http://localhost:5000/api-docs

Features:

- Bearer token authentication
- Structured request/response schemas
- Organized by feature module
- Real-time API testing

---


---

# 🛠 Local Development Setup

## 1️⃣ Clone Repository

git clone <your-repository-url>
cd pulsebloom-backend

## 2️⃣ Install Dependencies

npm install

## 3️⃣ Setup PostgreSQL

CREATE DATABASE pulsebloom;

Run migration:
npx prisma migrate dev --name init

## 4️⃣ Start MongoDB

Ensure MongoDB is running locally.

## 5️⃣ Start Development Server

npm run dev

Server runs at:
http://localhost:5000

---

# 📦 Current Feature Status

Authentication — ✅ Complete  
Protected Routes — ✅ Complete  
Mood CRUD — ✅ Complete  
Pagination — ✅ Complete  
Date Filtering — ✅ Complete  
Analytics — ✅ Complete  
Weekly Trends — ✅ Complete  
Rolling Average — ✅ Complete  
Burnout Risk Scoring — ✅ Complete  
Swagger Documentation — ✅ Complete  
Hybrid DB Architecture — ✅ Complete

---

# 🔮 Upcoming Features

- Habit tracking with streak engine
- AI-powered personalized insights
- Anonymous community posts
- Challenge system
- WebSocket real-time updates
- Docker containerization
- AWS deployment
- Redis caching

---

# 📈 Resume Impact

PulseBloom demonstrates:

- Clean architecture design
- Hybrid database strategy
- Time-series analytics
- Statistical modeling
- Burnout risk prediction
- Production-level API documentation
- Scalable backend engineering

This is beyond CRUD.
This is behavioral analytics backend engineering.

---

# 👨‍💻 Author

Ashish Anand  
Backend / MERN Developer

---

# 📜 License

MIT License

---

# 🌸 PulseBloom

Track your pulse. Bloom with intention.
