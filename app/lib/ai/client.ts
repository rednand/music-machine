export interface ChatCompletionClient {
  complete(prompt: string): Promise<string>;
}

export interface GroqLikeClient {
  chat: {
    completions: {
      create(
        params: {
          model: string;
          messages: Array<{ role: "user"; content: string }>;
          max_completion_tokens?: number;
          response_format?: { type: "json_object" };
          reasoning_effort?: "low" | "medium" | "high";
        },
        options?: { timeout?: number }
      ): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

const REQUEST_TIMEOUT_MS = 20000;

export interface GroqClientConfig {
  models: string[];
}

export class GroqEmptyResponseError extends Error {
  constructor() {
    super("Groq returned an empty completion");
  }
}

export class GroqClient implements ChatCompletionClient {
  constructor(
    private readonly groq: GroqLikeClient,
    private readonly config: GroqClientConfig
  ) {}

  private async completeWithModel(model: string, prompt: string): Promise<string> {
    const response = await this.groq.chat.completions.create(
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 2048,
        response_format: { type: "json_object" },
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" as const } : {})
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new GroqEmptyResponseError();
    }
    return content;
  }

  async complete(prompt: string): Promise<string> {
    let lastError: unknown;
    for (const model of this.config.models) {
      try {
        return await this.completeWithModel(model, prompt);
      } catch (error) {
        console.error(`Groq model ${model} failed, trying next`, error);
        lastError = error;
      }
    }
    throw lastError;
  }
}
