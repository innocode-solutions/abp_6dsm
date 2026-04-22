import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IEmbeddingService } from "./embedding.interface";

export class GeminiEmbeddingService implements IEmbeddingService {
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async embed(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
