import mongoose, { Schema } from "mongoose";

/**
 * Raiz de conversa por utilizador: um documento com `_id` estável usado como
 * `sessionId` em logs de extração (independe de haver fluxo PROCON ativo).
 */
const conversationSessionRootSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true }
  },
  { timestamps: true, collection: "conversation_session_roots" }
);

export const ConversationSessionRootModel =
  mongoose.models.ConversationSessionRoot ??
  mongoose.model("ConversationSessionRoot", conversationSessionRootSchema);
