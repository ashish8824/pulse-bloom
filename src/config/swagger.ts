import swaggerJsDoc from "swagger-jsdoc";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

// In prod, TypeScript source files don't exist — scan compiled JS instead
const apiPaths = isProduction
  ? [
      path.join(__dirname, "../../dist/modules/**/*.js"),
      path.join(__dirname, "../../dist/app.js"),
    ]
  : ["./src/modules/**/*.ts", "./src/app.ts"];

export const swaggerSpec = swaggerJsDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PulseBloom API",
      version: "1.0.0",
      description:
        "PulseBloom - AI Powered Mood & Habit Tracker Backend API Documentation",
      contact: {
        name: "PulseBloom Developer",
        email: "support@pulsebloom.dev",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server",
      },
      {
        url: "http://pulsebloom-alb-1830785026.ap-south-1.elb.amazonaws.com",
        description: "Production Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token in format: Bearer <your_token>",
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Access token is missing or invalid",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: apiPaths,
});
