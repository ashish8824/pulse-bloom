import dotenv from "dotenv";

/**
 * Load environment variables from .env file
 */
dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL as string,
  MONGO_URI: process.env.MONGO_URI as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
};
