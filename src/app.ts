import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/error.middleware";

import authRoutes from "./modules/auth/auth.routes";
import moodRoutes from "./modules/mood/mood.routes";

const app = express();

/**
 * Global Middlewares
 */
app.use(express.json());
app.use(cors());
app.use(helmet());

/**
 * Rate Limiter
 * Prevents abuse of API
 */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),
);

/**
 * Swagger API Documentation Route
 */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Health Check Route
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "PulseBloom API running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/mood", moodRoutes);

// Must be after routes
app.use(errorHandler);

export default app;
