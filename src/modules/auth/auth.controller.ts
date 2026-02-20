import { Request, Response } from "express";
import { registerUser, loginUser } from "./auth.service";
import { registerSchema, loginSchema } from "./auth.validation";

/**
 * Register Controller
 */
export const register = async (req: Request, res: Response) => {
  try {
    const validated = registerSchema.parse(req.body);

    const result = await registerUser(
      validated.email,
      validated.password,
      validated.name,
    );

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Login Controller
 */
export const login = async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);

    const result = await loginUser(validated.email, validated.password);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
