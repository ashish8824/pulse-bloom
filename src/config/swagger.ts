import swaggerJsDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PulseBloom API",
      version: "1.0.0",
      description: "PulseBloom - AI Powered Mood & Habit Tracker Backend API",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
  },
  apis: ["./src/modules/**/*.ts"],
});
