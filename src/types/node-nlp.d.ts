declare module "node-nlp" {
  export class NlpManager {
    constructor(options?: Record<string, unknown>);
    addDocument(locale: string, utterance: string, intent: string): void;
    train(): Promise<void>;
    process(locale: string, utterance: string): Promise<{
      intent?: string;
      score?: number;
      [key: string]: unknown;
    }>;
  }
}
