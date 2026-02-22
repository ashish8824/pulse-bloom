# 🌸 PulseBloom Backend

> Track your pulse. Bloom with intention.

PulseBloom is a modern, AI-ready behavioral analytics backend built for high-performance professionals managing stress, productivity, and mental well-being.

This backend powers a full-stack SaaS platform designed to:

- Track daily mood trends
- Analyze emotional patterns
- Detect burnout risk early
- Provide actionable behavioral insights

Built with scalable architecture, real analytics, and production-grade backend engineering.

# 🚀 What Makes PulseBloom Different?

Unlike basic CRUD trackers, PulseBloom includes:

- 📊 Advanced Mood Analytics
- 📈 Weekly Trend Analysis
- 📉 Rolling 7-Day Averages
- 🔥 Burnout Risk Scoring
- 🔐 Secure JWT-based APIs
- 🗄 Hybrid Database Architecture
- 📘 Full OpenAPI (Swagger) Documentation

This is not a demo project.This is a backend designed like a real SaaS product.

# 🏗 Architecture Overview

PulseBloom follows a **Modular Monolith + Clean Architecture pattern**.

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Route → Controller → Service → Repository → Database   `

This ensures:

- Clear separation of concerns
- Testable business logic
- Easy future microservice migration
- Production maintainability

# 🧠 Core Capabilities

## 🔐 Authentication

- JWT-based authentication
- 15-minute access tokens
- Route-level protection middleware
- Secure password hashing (bcrypt)

Endpoints:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   POST /api/auth/registerPOST /api/auth/login   `

## 📊 Mood Tracking Engine

### Create Mood Entry

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   POST /api/mood   `

Stores:

- Mood score (1–5)
- Emoji representation
- Journal entry (MongoDB)
- Timestamped relational record (PostgreSQL)

## 📄 Paginated Mood History

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GET /api/mood?page=1&limit=10   `

Includes:

- Offset pagination
- Metadata (total, totalPages)
- Date-based filtering support

## 📅 Date Filtering

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GET /api/mood?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD   `

Supports:

- Partial filtering
- Combined with pagination
- Analytics-aware filtering

# 📈 Analytics Engine

PulseBloom includes real analytical capabilities.

## 1️⃣ Mood Analytics

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GET /api/mood/analytics   `

Returns:

- Total entries
- Average mood
- Highest & lowest score
- Most frequent mood
- Distribution map (1–5)

## 2️⃣ Weekly Trend Analysis

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GET /api/mood/trends/weekly   `

Provides:

- ISO week grouping
- Weekly average scores
- Dashboard-ready trend data

## 3️⃣ Rolling 7-Day Average

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GET /api/mood/trends/rolling   `

Returns:

- Smoothed moving average
- Time-series visualization data
- Ideal for productivity dashboards

## 4️⃣ Burnout Risk Scoring 🔥

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GET /api/mood/burnout-risk   `

Risk model considers:

- Low mood frequency
- Mood volatility
- Average mood trend
- Behavioral instability patterns

Response:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {  "riskScore": 8.5,  "riskLevel": "Moderate",  "metrics": {    "averageMood": 2.9,    "lowMoodDays": 4,    "volatility": 3  }}   `

Risk Levels:

- 0–5 → Low
- 6–10 → Moderate
- 10+ → High

This transforms simple mood logging into behavioral intelligence.

# 🗄 Hybrid Database Architecture

## PostgreSQL (Structured Analytics)

Stores:

- Users
- Mood entries
- Aggregation-ready records
- Future streak logic

Ideal for:

- Pagination
- Filtering
- Statistical computation

## MongoDB (Flexible Journaling)

Stores:

- Journal text
- AI-ready content
- Future insight cache
- Community posts (upcoming)

Optimized for:

- Text-heavy data
- AI model integration
- Flexible schema evolution

# 🔐 Security & Reliability

- bcrypt hashing (salt rounds: 10)
- JWT access control
- Express rate limiting (100 req / 15 min)
- Helmet security headers
- CORS support
- Centralized global error handler
- Environment variable isolation

# 📘 API Documentation

Interactive Swagger UI available at:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   http://localhost:5000/api-docs   `

Features:

- Bearer token authorization
- Structured request/response models
- Organized by feature modules
- Real-time API testing

# ⚙ Local Development Setup

## 1️⃣ Clone

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   git clone cd pulsebloom-backend   `

## 2️⃣ Install

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   npm install   `

## 3️⃣ Setup Environment

Create .env:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   PORT=5000DATABASE_URL=postgresql://postgres:password@localhost:5432/pulsebloomMONGO_URI=mongodb://localhost:27017/pulsebloomJWT_SECRET=supersecretkey   `

## 4️⃣ Run Migration

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   npx prisma migrate dev --name init   `

## 5️⃣ Start Server

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   npm run dev   `

Server runs at:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   http://localhost:5000   `

# 📦 Current Feature Status

FeatureStatusAuthentication✅ CompleteProtected Routes✅ CompleteMood CRUD✅ CompletePagination✅ CompleteDate Filtering✅ CompleteAnalytics✅ CompleteWeekly Trends✅ CompleteRolling Average✅ CompleteBurnout Risk Scoring✅ CompleteSwagger Docs✅ CompleteHybrid DB Architecture✅ Complete

# 🔮 Upcoming Product Evolution

- Habit Tracking Engine (Streak Logic)
- AI-Powered Personalized Insights
- Community Posting System
- Challenge & Goal System
- WebSocket Real-Time Updates
- Docker Containerization
- AWS Deployment
- Redis Caching Layer

# 📈 Resume Impact

PulseBloom demonstrates:

- Clean architecture design
- Hybrid database strategy
- Analytical backend logic
- Statistical modeling
- Production-level API documentation
- Scalable backend engineering

This is beyond CRUD.This is behavioral analytics backend engineering.

# 👨‍💻 Author

Ashish AnandBackend / MERN Developer

# 📜 License

MIT License

# 🌸 PulseBloom

Track your pulse. Bloom with intention.
