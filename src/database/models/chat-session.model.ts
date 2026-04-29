import mongoose, { Schema } from "mongoose";

/** Espelha `FlowSession` (fluxo em andamento) para persistência. */
const flowSessionSchema = new Schema(
  {
    flowId: { type: String, required: true },
    currentStepIndex: { type: Number, required: true },
    answers: { type: Schema.Types.Mixed, default: () => ({}) },
    finished: { type: Boolean, required: true }
  },
  { _id: false }
);

/**
 * Uma sessão de conversa ativa por usuário do canal (ex.: WhatsApp).
 * Alinhado a `UserFlowSession` em `src/sessions/user-flow-session.ts`.
 */
const chatSessionSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    flowId: { type: String, required: true },
    flowSession: { type: flowSessionSchema, required: true }
  },
  { timestamps: true, collection: "chat_sessions" }
);

export const ChatSessionModel =
  mongoose.models.ChatSession ??
  mongoose.model("ChatSession", chatSessionSchema);
