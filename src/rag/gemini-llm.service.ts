import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ILlmService } from "./llm.interface";

export class GeminiLlmService implements ILlmService {
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
