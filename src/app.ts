// src/app.ts

import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middlewares/error.middleware";
import { globalLimiter } from "./middlewares/rateLimiter"; // ← now imported from rateLimiter.ts

import authRoutes from "./modules/auth/auth.routes";
import moodRoutes from "./modules/mood/mood.routes";
import habitRoutes from "./modules/habits/habit.routes";

const app = express();

// ─────────────────────────────────────────────────────────────────
// GLOBAL MIDDLEWARES
// (order matters — these run for every single request)
// ─────────────────────────────────────────────────────────────────
app.use(express.json());

app.use(
  cors({
    // In production, replace * with your actual frontend origin:
    // origin: "https://yourfrontend.com"
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet()); // Sets security headers (X-Frame-Options, CSP, etc.)

// Global rate limiter — 100 req / 15 min per IP across ALL routes.
// Auth-specific routes have additional tighter limiters applied directly in auth.routes.ts.
app.use(globalLimiter);

// ─────────────────────────────────────────────────────────────────
// SWAGGER API DOCUMENTATION
// ─────────────────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "PulseBloom API running",
  });
});

// ─────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/ai", require("./modules/ai/ai.routes").default);

// ─────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER — must always be the LAST middleware
// ─────────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
