import mongoose from "mongoose";

import { env } from "./env";

const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 5_000,
} as const;

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGO_URI, CONNECT_OPTIONS);
}
