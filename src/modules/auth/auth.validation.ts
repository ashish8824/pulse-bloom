import { z } from "zod";

/**
 * Register validation schema
 */
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
