import mongoose, { type ConnectOptions } from "mongoose";

import { getMongoEnv } from "./env";
import "./models/chat-message.model";
import "./models/chat-session.model";

let didConnect = false;

export function isMongoConfigured(): boolean {
  return Boolean(getMongoEnv().uri);
}

export async function connectMongo(): Promise<void> {
  const { uri, dbName } = getMongoEnv();

  if (!uri) {
    throw new Error("MONGODB_URI não configurada.");
  }

  const options: ConnectOptions = {};
  if (dbName) {
    options.dbName = dbName;
  }

  await mongoose.connect(uri, options);
  didConnect = true;
  console.log("MongoDB conectado.");
}

export async function disconnectMongo(): Promise<void> {
  if (!didConnect) {
    return;
  }

  await mongoose.disconnect();
  didConnect = false;
}
