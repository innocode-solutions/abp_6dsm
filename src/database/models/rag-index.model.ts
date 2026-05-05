import mongoose, { Schema } from "mongoose";

/**
 * Armazena o índice semântico do CDC no MongoDB.
 *
 * Cada documento corresponde a um artigo do CDC com seu embedding pré-computado.
 * Populado pelo script `npm run rag:index` e lido por SemanticCdcRepository
 * na inicialização (tem precedência sobre o arquivo cdc-index.json).
 */
const RagIndexEntrySchema = new Schema(
  {
    entryId: { type: String, required: true, index: true },
    title:   { type: String, required: true },
    body:    { type: String, required: true },
    embedding: { type: [Number], required: true }
  },
  { collection: "rag_index_entries" }
);

export const RagIndexEntryModel = mongoose.model(
  "RagIndexEntry",
  RagIndexEntrySchema
);
