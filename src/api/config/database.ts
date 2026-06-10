import mongoose from "mongoose";

import { env } from "./env.js";
import { getMongoConnectOptions } from "./mongoConnection.js";

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, getMongoConnectOptions());
}
