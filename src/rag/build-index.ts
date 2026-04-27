/**
 * Script de pré-computação do índice semântico do CDC.
 *
 * Uso:
 *   npm run rag:index          → gera cdc-index.json (desenvolvimento local)
 *   npm run rag:index          → se MONGODB_URI estiver definido, também salva no MongoDB
 *
 * No Railway:
 *   railway run npm run rag:index   → salva no MongoDB (Railway não tem filesystem persistente)
 *
 * Fluxo:
 *   - Lê docs/knowledge/cdc.md e filtra artigos vetados
 *   - Gera embeddings via Gemini API (respeitando rate limit de 100 req/min)
 *   - Salva em src/knowledge/cdc-index.json
 *   - Se MONGODB_URI configurado: também persiste na coleção rag_index_entries
 */

import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { connectMongo, disconnectMongo, isMongoConfigured } from "../database/connection";
import { RagIndexEntryModel } from "../database/models/rag-index.model";
import { MarkdownCdcRepository } from "../knowledge/markdown-cdc.repository";
import { GeminiEmbeddingService } from "./gemini-embedding.service";

const OUTPUT_PATH = resolve(process.cwd(), "src", "knowledge", "cdc-index.json");
// 700ms entre requests → ~85 req/min (abaixo do limite de 100/min do Gemini free tier)
const DELAY_MS = 700;

type IndexEntry = { id: string; title: string; body: string; embedding: number[] };

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function saveToMongo(index: IndexEntry[]): Promise<void> {
  console.log("\nSalvando índice no MongoDB...");
  await RagIndexEntryModel.deleteMany({});
  await RagIndexEntryModel.insertMany(
    index.map((e) => ({
      entryId: e.id,
      title: e.title,
      body: e.body,
      embedding: e.embedding
    }))
  );
  console.log(`[MongoDB] ${index.length} artigos salvos na coleção rag_index_entries.`);
}

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Erro: GEMINI_API_KEY não definida no .env");
    process.exit(1);
  }

  // Conectar ao MongoDB se configurado (para salvar o índice lá também)
  const usesMongo = isMongoConfigured();
  if (usesMongo) {
    await connectMongo();
    console.log("[MongoDB] Conectado — índice será salvo no banco além do arquivo JSON.\n");
  }

  const repository = new MarkdownCdcRepository();
  // Acessa entries via cast (são protected, mas aqui é um script utilitário)
  const entries = (repository as unknown as {
    entries: Array<{ id: string; title: string; body: string }>;
  }).entries;

  console.log(`Gerando embeddings para ${entries.length} artigos do CDC...`);
  console.log(`Rate limit: 1 req/${DELAY_MS}ms (~${Math.floor(60000 / DELAY_MS)} req/min)`);
  console.log(`Tempo estimado: ~${Math.ceil((entries.length * DELAY_MS) / 1000)}s\n`);

  const embeddingService = new GeminiEmbeddingService(apiKey);
  const index: IndexEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const text = `${entry.title} ${entry.body}`;

    process.stdout.write(`[${i + 1}/${entries.length}] ${entry.title.slice(0, 50)}... `);

    const embedding = await embeddingService.embed(text);
    index.push({ ...entry, embedding });

    console.log(`OK (${embedding.length} dims)`);

    // Delay entre requests para respeitar rate limit (exceto no último)
    if (i < entries.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // Salvar como JSON (para desenvolvimento local e fallback no deploy)
  writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2), "utf-8");
  console.log(`\nÍndice salvo em arquivo: ${OUTPUT_PATH}`);

  // Salvar no MongoDB se disponível
  if (usesMongo) {
    await saveToMongo(index);
    await disconnectMongo();
  }

  console.log(`\nTotal: ${index.length} artigos indexados.`);
}

main().catch((err) => {
  console.error("Erro ao gerar índice:", err);
  process.exit(1);
});
