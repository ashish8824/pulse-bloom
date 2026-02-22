import swaggerJsDoc from "swagger-jsdoc";

/**
 * Swagger configuration for PulseBloom Backend API
 * Provides API documentation using OpenAPI 3.0 specification
 */
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
        url: "https://your-production-domain.com",
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

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  /**
   * Paths to files containing Swagger annotations
   * Automatically scans all modules
   */
  apis: ["./src/modules/**/*.ts", "./src/app.ts"],
});
