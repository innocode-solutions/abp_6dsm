/**
 * Script de pré-computação do índice semântico do CDC.
 *
 * Uso: npm run rag:index
 *
 * - Lê docs/knowledge/cdc.md
 * - Gera embeddings via Gemini API (respeitando rate limit de 100 req/min)
 * - Salva o índice em src/knowledge/cdc-index.json
 * - Commitá o JSON para que o servidor carregue sem chamar a API na subida.
 */

import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { MarkdownCdcRepository } from "../knowledge/markdown-cdc.repository";
import { GeminiEmbeddingService } from "./gemini-embedding.service";

const OUTPUT_PATH = resolve(process.cwd(), "src", "knowledge", "cdc-index.json");
// 700ms entre requests → ~85 req/min (abaixo do limite de 100/min)
const DELAY_MS = 700;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Erro: GEMINI_API_KEY não definida no .env");
    process.exit(1);
  }

  const repository = new MarkdownCdcRepository();
  // Acessa entries via cast (são protected, mas aqui é um script utilitário)
  const entries = (repository as unknown as { entries: Array<{ id: string; title: string; body: string }> }).entries;

  console.log(`Gerando embeddings para ${entries.length} artigos do CDC...`);
  console.log(`Rate limit: 1 req/${DELAY_MS}ms (~${Math.floor(60000 / DELAY_MS)} req/min)`);
  console.log(`Tempo estimado: ~${Math.ceil((entries.length * DELAY_MS) / 1000)}s\n`);

  const embeddingService = new GeminiEmbeddingService(apiKey);
  const index: Array<{ id: string; title: string; body: string; embedding: number[] }> = [];

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

  writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2), "utf-8");
  console.log(`\nÍndice salvo em: ${OUTPUT_PATH}`);
  console.log(`Total: ${index.length} artigos indexados.`);
}

main().catch((err) => {
  console.error("Erro ao gerar índice:", err);
  process.exit(1);
});
