import mongoose from "mongoose";
import { env } from "./env";

export const connectMongo = async () => {
  try {
    await mongoose.connect(env.MONGO_URI); // ← use env.MONGO_URI not process.env.MONGO_URI
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Failed", error);
  }
};
