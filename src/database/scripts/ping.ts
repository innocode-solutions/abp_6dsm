import "dotenv/config";
import mongoose from "mongoose";

import { connectMongo, disconnectMongo, isMongoConfigured } from "../connection";

async function main(): Promise<void> {
  if (!isMongoConfigured()) {
    console.error(
      "Defina MONGODB_URI no ambiente ou no arquivo .env na raiz do projeto."
    );
    process.exitCode = 1;
    return;
  }

  try {
    await connectMongo();
    const admin = mongoose.connection.db?.admin();
    const ping = await admin?.ping();
    if (!ping?.ok) {
      throw new Error("Resposta de ping inválida do servidor MongoDB.");
    }
    console.log("Ping OK: conexão com MongoDB validada.");
  } catch (error) {
    console.error("Falha ao validar conexão com MongoDB:", error);
    process.exitCode = 1;
  } finally {
    await disconnectMongo();
  }
}

void main();
