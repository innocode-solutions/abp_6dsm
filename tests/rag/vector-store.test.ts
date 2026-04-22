import { describe, expect, it, beforeEach } from "vitest";
import { VectorStore } from "../../src/rag/vector-store";
import type { KnowledgeEntry } from "../../src/knowledge/knowledge-entry";

const makeEntry = (id: string, title: string): KnowledgeEntry => ({
  id,
  title,
  body: `Conteúdo do ${title}`
});

// Vetores simples para testes determinísticos
const vecA = [1, 0, 0]; // aponta para eixo X
const vecB = [0, 1, 0]; // aponta para eixo Y (ortogonal a A)
const vecC = [0.9, 0.1, 0]; // quase paralelo a A (alta similaridade)
const vecD = [0, 0, 1]; // aponta para eixo Z (ortogonal a A e B)

describe("VectorStore", () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  it("deve iniciar vazio", () => {
    expect(store.size).toBe(0);
  });

  it("deve incrementar tamanho ao adicionar entradas", () => {
    store.add(makeEntry("1", "Art. 1°"), vecA);
    store.add(makeEntry("2", "Art. 2°"), vecB);
    expect(store.size).toBe(2);
  });

  it("deve retornar o item mais similar ao query", () => {
    store.add(makeEntry("1", "Art. 1°"), vecA);
    store.add(makeEntry("2", "Art. 2°"), vecB);
    store.add(makeEntry("3", "Art. 3°"), vecC);

    // Query próxima de vecA → deve retornar Art. 1° ou Art. 3° primeiro
    const hits = store.search(vecA, 1, 0);
    expect(hits).toHaveLength(1);
    // Art. 1° tem cosine similarity 1.0 com vecA
    expect(hits[0].entry.id).toBe("1");
    expect(hits[0].score).toBeCloseTo(1.0, 5);
  });

  it("deve ordenar resultados por similaridade decrescente", () => {
    store.add(makeEntry("A", "Distante"), vecB);  // ortogonal: score 0
    store.add(makeEntry("C", "Próximo"), vecC);   // alta similaridade
    store.add(makeEntry("Z", "Idêntico"), vecA);  // score 1.0

    const hits = store.search(vecA, 3, 0);
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[1].score);
    if (hits[2]) {
      expect(hits[1].score).toBeGreaterThanOrEqual(hits[2].score);
    }
  });

  it("deve respeitar o limite topK", () => {
    store.add(makeEntry("1", "Art. 1°"), vecA);
    store.add(makeEntry("2", "Art. 2°"), vecC);
    store.add(makeEntry("3", "Art. 3°"), vecD);

    const hits = store.search(vecA, 2, 0);
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("deve filtrar resultados abaixo do minScore", () => {
    store.add(makeEntry("1", "Relevante"), vecA);
    store.add(makeEntry("2", "Irrelevante"), vecB); // cosine com vecA = 0

    const hits = store.search(vecA, 3, 0.5);
    expect(hits.every((h) => h.score >= 0.5)).toBe(true);
  });

  it("deve retornar lista vazia quando store está vazio", () => {
    const hits = store.search(vecA, 3, 0);
    expect(hits).toHaveLength(0);
  });

  it("deve calcular cosine similarity 0 para vetores ortogonais", () => {
    store.add(makeEntry("1", "Ortogonal"), vecB);
    const hits = store.search(vecA, 1, 0);
    expect(hits[0].score).toBeCloseTo(0, 5);
  });
});
