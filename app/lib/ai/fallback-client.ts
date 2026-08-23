import type { ChatCompletionClient } from "./client";

export class FallbackChatCompletionClient implements ChatCompletionClient {
  constructor(private readonly clients: ChatCompletionClient[]) {}

  async complete(prompt: string): Promise<string> {
    let lastError: unknown;
    for (const client of this.clients) {
      try {
        return await client.complete(prompt);
      } catch (error) {
        console.error("Chat completion client failed, trying next", error);
        lastError = error;
      }
    }
    throw lastError;
  }
}
