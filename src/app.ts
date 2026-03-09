// src/app.ts
// Updated for Phase 4 — Gamification
// Changes from previous version marked with ← PHASE 4

import express from "express";
import cors from "cors";
import helmet from "helmet";
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
import badgeRoutes from "./modules/badges/badge.routes"; // ← PHASE 4
import challengeRoutes from "./modules/challenges/challenge.routes"; // ← PHASE 4
import communityRoutes from "./modules/community/community.routes"; // ← PHASE 4

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

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "*"],
      },
    },
  }),
);

app.use(globalLimiter);

// ─────────────────────────────────────────────────────────────────
// SWAGGER — served via CDN to avoid ERR_EMPTY_RESPONSE on static assets
// ─────────────────────────────────────────────────────────────────
app.get("/api-docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.get("/api-docs", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
  <head>
    <title>PulseBloom API Docs</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: "/api-docs/swagger.json",
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        deepLinking: true
      });
    </script>
  </body>
</html>`);
});

// ─────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
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
app.use("/api/badges", badgeRoutes); // ← PHASE 4
app.use("/api/challenges", challengeRoutes); // ← PHASE 4
app.use("/api/community", communityRoutes); // ← PHASE 4

// ─────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER — must always be the LAST middleware
// ─────────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
