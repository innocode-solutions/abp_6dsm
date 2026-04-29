import mongoose, { Schema } from "mongoose";

const structuralEntitySub = new Schema(
  {
    type: { type: String, required: true },
    value: { type: String, required: true },
    rawMatch: { type: String, required: true }
  },
  { _id: false }
);

const conversationExtractionLogSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    body: { type: String, required: true },
    flowId: { type: String, required: false, index: true },
    structuralEntities: { type: [structuralEntitySub], default: [] },
    nlpClassification: {
      intent: { type: String },
      score: { type: Number }
    }
  },
  { timestamps: true, collection: "conversation_extraction_logs" }
);

export const ConversationExtractionLogModel =
  mongoose.models.ConversationExtractionLog ??
  mongoose.model("ConversationExtractionLog", conversationExtractionLogSchema);
