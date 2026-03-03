// src/app.ts

import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middlewares/error.middleware";
import { globalLimiter } from "./middlewares/rateLimiter";

import authRoutes from "./modules/auth/auth.routes";
import moodRoutes from "./modules/mood/mood.routes";
import habitRoutes from "./modules/habits/habit.routes";
import billingRoutes from "./modules/billing/billing.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import milestoneRoutes from "./modules/milestones/milestone.routes";

const app = express();

// ─────────────────────────────────────────────────────────────────
// GLOBAL MIDDLEWARES
// ─────────────────────────────────────────────────────────────────
app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());
app.use(globalLimiter);

// ─────────────────────────────────────────────────────────────────
// SWAGGER
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
app.use("/api/billing", billingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/milestones", milestoneRoutes);

// ─────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER — must always be the LAST middleware
// ─────────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
