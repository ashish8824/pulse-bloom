# 🌸 PulseBloom Backend

AI-Powered Mood & Habit Tracking Platform Backend

PulseBloom is a privacy-focused, AI-enhanced behavioral tracking system designed for high-performance professionals managing stress, habits, and productivity.

This repository contains the backend API built using Node.js, Express, TypeScript, PostgreSQL, MongoDB, and Swagger.

---

# 🚀 Tech Stack

## Core Backend

- Node.js
- Express.js
- TypeScript

## Databases

- PostgreSQL (Relational Data)
- Prisma ORM
- MongoDB (Unstructured Data / AI Cache)
- Mongoose

## Security

- JWT Authentication
- bcrypt Password Hashing
- Helmet
- CORS
- Express Rate Limiting

## Documentation

- Swagger (OpenAPI 3.0)

## Real-time (Upcoming)

- Socket.io

---

# 🏗 Architecture

PulseBloom follows a **Modular Monolith + Clean Architecture pattern**.

Route → Controller → Service → Repository → Database

Folder Structure:
src/
│
├── config/ # DB, environment, swagger configuration
├── modules/ # Feature-based modules (auth, mood, habits, etc.)
│ ├── auth/
│ ├── mood/
│ ├── habits/
│ ├── ai/
│ ├── community/
│ └── challenges/
│
├── middlewares/ # Auth, error handling, rate limiting
├── websocket/ # Socket.io setup
├── utils/ # JWT, helpers, logger
├── types/ # Express extensions
│
├── app.ts # Express app configuration
└── server.ts # Server entry point

This structure ensures:

- Scalability
- Maintainability
- Clear separation of concerns
- Production readiness
- Easy transition to microservices in future

---

# 🔐 Authentication

PulseBloom uses JWT-based authentication.

## Register

POST /api/auth/register

## Login

POST /api/auth/login

All protected routes require:

Authorization: Bearer <token>

Token expiration: 15 minutes.

Protected routes are secured using middleware that verifies and decodes JWT tokens.

---

# 📘 API Documentation

Swagger UI available at:

http://localhost:5000/api-docs

Features:

- Interactive API testing
- Bearer token authentication support
- Request/response schema documentation
- Organized tags per module

---

# 🗄 Database Design

## PostgreSQL (Structured Data)

Stores:

- Users
- Habits
- Habit Logs
- Mood Entries
- Challenges
- Challenge Participants

Managed using Prisma ORM.

Benefits:

- Strong relational queries
- Efficient streak calculations
- Aggregations & reporting

## MongoDB (Unstructured Data)

Stores:

- Journal entries
- AI insights cache
- Community posts
- AI moderation flags

Benefits:

- Flexible schema
- Optimized for text-heavy AI inputs
- Fast caching of generated insights

---

# 🛡 Security Features

- Password hashing with bcrypt (salt rounds: 10)
- JWT-based authentication
- Route protection middleware
- Global centralized error handler
- Rate limiting (100 requests / 15 minutes)
- Helmet security headers
- CORS enabled
- Environment variable protection

---

# ⚙ Environment Variables

Create a `.env` file in the root directory:

PORT=5000  
DATABASE_URL=postgresql://postgres:password@localhost:5432/pulsebloom  
MONGO_URI=mongodb://localhost:27017/pulsebloom  
JWT_SECRET=supersecretkey

Never commit `.env` to GitHub.

---

# 🛠 Installation & Setup

## 1️⃣ Clone Repository

git clone <your-repository-url>  
cd pulsebloom-backend

## 2️⃣ Install Dependencies

npm install

## 3️⃣ Setup PostgreSQL Database

Ensure PostgreSQL is running.

Create database:

CREATE DATABASE pulsebloom;

Run Prisma migration:

npx prisma migrate dev --name init

## 4️⃣ Start MongoDB

Ensure MongoDB service is running locally.

## 5️⃣ Start Development Server

npm run dev

Server runs at:

http://localhost:5000

---

# 🧪 Testing with Postman

## 1. Register User

POST /api/auth/register

Body:
{
"email": "test@gmail.com",
"password": "123456",
"name": "Ashish"
}

## 2. Login

POST /api/auth/login

Body:
{
"email": "test@gmail.com",
"password": "123456"
}

Copy returned JWT token.

## 3. Access Protected Route

GET /api/protected

Header:
Authorization: Bearer <token>

---

# 📊 Current Features

✅ Industry-standard folder structure  
✅ JWT Authentication  
✅ Protected routes  
✅ Swagger documentation  
✅ PostgreSQL integration  
✅ MongoDB integration  
✅ Rate limiting  
✅ Global error handling  
✅ Clean architecture pattern

---

# 🔜 Upcoming Features

- Mood logging system
- Habit tracking with streak logic
- AI-powered insights (Gemini + HuggingFace)
- Anonymous community posts
- Challenge system with WebSocket updates
- Docker containerization
- AWS EC2 deployment
- Redis caching (future scaling)

---

# 🧠 Why Hybrid Database Architecture?

PostgreSQL is ideal for structured, relational data such as streak calculations and user relationships.

MongoDB is better suited for AI-generated content and flexible journal structures.

This hybrid approach balances:

- Performance
- Scalability
- Flexibility
- Cost optimization

---

# 📈 Resume Highlight

Built a production-grade backend for an AI-powered behavioral tracking platform using Node.js, TypeScript, PostgreSQL (Prisma), MongoDB (Mongoose), JWT authentication, Swagger documentation, and scalable modular architecture.

---

# 🧑‍💻 Author

Ashish Anand  
Backend / MERN Developer

---

# 📜 License

MIT License

---

# 🌸 PulseBloom

Track your pulse. Bloom with intention.
