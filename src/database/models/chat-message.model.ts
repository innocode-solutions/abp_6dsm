import mongoose, { Schema } from "mongoose";

/**
 * Registro de mensagens do canal (entrada/saída) para auditoria ou análise.
 * Campos base alinhados a `IncomingMessageLog` em `message-log.service.ts`.
 */
const chatMessageSchema = new Schema(
  {
    from: { type: String, required: true, index: true },
    direction: {
      type: String,
      enum: ["in", "out"],
      required: true,
      index: true
    },
    body: { type: String, required: true },
    /** Texto original enviado pelo canal (ex.: timestamp ISO da mensagem). */
    clientTimestamp: { type: String, required: true }
  },
  { timestamps: true, collection: "chat_messages" }
);

export const ChatMessageModel =
  mongoose.models.ChatMessage ??
  mongoose.model("ChatMessage", chatMessageSchema);
