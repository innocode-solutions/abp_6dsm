import "dotenv/config";

import { ChatMessageModel } from "../models/chat-message.model";
import { ChatSessionModel } from "../models/chat-session.model";
import { connectMongo, disconnectMongo, isMongoConfigured } from "../connection";

interface ChatSessionSummary {
  userId: string;
  flowId: string;
  flowSession?: {
    currentStepIndex?: number;
    finished?: boolean;
  };
}

interface ChatMessageSummary {
  from: string;
  direction: "in" | "out";
  body: string;
  clientTimestamp: string;
}

async function main(): Promise<void> {
  if (!isMongoConfigured()) {
    console.error(
      "Defina MONGODB_URI, MONGO_URL ou equivalente no ambiente ou no arquivo .env."
    );
    process.exitCode = 1;
    return;
  }

  try {
    await connectMongo();

    const [sessionCount, messageCount, sampleSession, sampleMessage] = await Promise.all([
      ChatSessionModel.countDocuments(),
      ChatMessageModel.countDocuments(),
      ChatSessionModel.findOne().sort({ updatedAt: -1 }).lean<ChatSessionSummary | null>(),
      ChatMessageModel.findOne().sort({ createdAt: -1 }).lean<ChatMessageSummary | null>()
    ]);

    console.log("Mongo inspect OK.");
    console.log(`chat_sessions: ${sessionCount}`);
    console.log(`chat_messages: ${messageCount}`);

    if (sampleSession) {
      console.log(
        "latest chat_session:",
        JSON.stringify({
          userId: sampleSession.userId,
          flowId: sampleSession.flowId,
          currentStepIndex: sampleSession.flowSession?.currentStepIndex,
          finished: sampleSession.flowSession?.finished
        })
      );
    }

    if (sampleMessage) {
      console.log(
        "latest chat_message:",
        JSON.stringify({
          from: sampleMessage.from,
          direction: sampleMessage.direction,
          body: sampleMessage.body,
          clientTimestamp: sampleMessage.clientTimestamp
        })
      );
    }
  } catch (error) {
    console.error("Falha ao inspecionar MongoDB:", error);
    process.exitCode = 1;
  } finally {
    await disconnectMongo();
  }
}

void main();
