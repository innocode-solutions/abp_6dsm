export interface ILlmService {
  generate(prompt: string): Promise<string>;
}
