import bcrypt from "bcrypt";
import { createUser, findUserByEmail } from "./auth.repository";
import { generateToken } from "../../utils/jwt";

/**
 * Register new user
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string,
) => {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password before storing
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await createUser({
    email,
    password: hashedPassword,
    name,
  });

  const token = generateToken({ userId: user.id });

  return { user, token };
};

/**
 * Login user
 */
export const loginUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken({ userId: user.id });

  return { user, token };
};
