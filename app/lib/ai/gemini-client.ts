import type { ChatCompletionClient } from "./client";

export interface GeminiClientConfig {
  apiKey: string;
  models?: string[];
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

export class GeminiEmptyResponseError extends Error {
  constructor() {
    super("Gemini returned an empty completion");
  }
}

const DEFAULT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-pro-latest"
];

export class GeminiClient implements ChatCompletionClient {
  constructor(
    private readonly config: GeminiClientConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private async completeWithModel(model: string, prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new GeminiEmptyResponseError();
    }
    return text;
  }

  async complete(prompt: string): Promise<string> {
    let lastError: unknown;
    for (const model of this.config.models ?? DEFAULT_MODELS) {
      try {
        return await this.completeWithModel(model, prompt);
      } catch (error) {
        console.error(`Gemini model ${model} failed, trying next`, error);
        lastError = error;
      }
    }
    throw lastError;
  }
}
