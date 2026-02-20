import { prisma } from "../../config/db";

/**
 * Create new user in database
 */
export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
}) => {
  return prisma.user.create({
    data,
  });
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};
