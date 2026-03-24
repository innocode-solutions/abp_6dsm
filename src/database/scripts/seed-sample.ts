import "dotenv/config";

import { connectMongo, disconnectMongo, isMongoConfigured } from "../connection";
import { ChatMessageModel } from "../models/chat-message.model";
import { ChatSessionModel } from "../models/chat-session.model";

/**
 * Insere documentos de exemplo para validar conexão e coleções (ex.: Atlas ou Mongo local).
 * Uso: defina MONGODB_URI no .env e rode `npm.cmd run db:seed-sample`.
 */
async function main(): Promise<void> {
  if (!isMongoConfigured()) {
    console.error(
      "Defina MONGODB_URI no .env (ex.: cluster gratuito no MongoDB Atlas)."
    );
    process.exitCode = 1;
    return;
  }

  try {
    await connectMongo();

    await ChatSessionModel.create({
      userId: "teste-seed-user-id",
      flowId: "cobranca-indevida",
      flowSession: {
        flowId: "cobranca-indevida",
        currentStepIndex: 0,
        answers: {},
        finished: false
      }
    });

    await ChatMessageModel.create({
      from: "teste-seed-user-id",
      direction: "in",
      body: "Mensagem de teste inserida pelo seed-sample.",
      clientTimestamp: new Date().toISOString()
    });

    console.log(
      "OK: documentos de exemplo inseridos em chat_sessions e chat_messages."
    );
  } catch (error) {
    console.error("Falha no seed:", error);
    process.exitCode = 1;
  } finally {
    await disconnectMongo();
  }
}

void main();
