import mongoose, { Schema } from "mongoose";

/**
 * Armazena a sessão do WhatsApp Web para persistência entre deploys.
 *
 * O campo `data` contém o arquivo .zip da sessão gerado pelo RemoteAuth do
 * whatsapp-web.js. O limite de 16 MB por documento no MongoDB é suficiente
 * para sessões típicas de 2–5 MB.
 */
const WhatsappSessionSchema = new Schema(
  {
    session:   { type: String, required: true, unique: true },
    data:      { type: Buffer, required: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { collection: "whatsapp_sessions" }
);

export const WhatsappSessionModel = mongoose.model(
  "WhatsappSession",
  WhatsappSessionSchema
);
