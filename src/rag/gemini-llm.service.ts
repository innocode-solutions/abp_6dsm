import type { ILlmService } from "./llm.interface";

const LLM_MODEL = "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type ApiError = { error?: { message?: string } };

export class GeminiLlmService implements ILlmService {
  constructor(private readonly apiKey: string) {}

  async generate(prompt: string): Promise<string> {
    const url = `${API_BASE}/${LLM_MODEL}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Temperatura baixa = respostas mais factuais, menos alucinação
        generationConfig: { temperature: 0.1 }
      })
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as ApiError;
      throw new Error(
        `[GeminiLLM] ${response.status} ${response.statusText}: ${
          error.error?.message ?? "unknown error"
        }`
      );
    }

    const data = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    return data.candidates[0].content.parts[0].text;
  }
}
