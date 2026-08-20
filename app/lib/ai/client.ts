export interface ChatCompletionClient {
  complete(prompt: string): Promise<string>;
}

export interface GroqLikeClient {
  chat: {
    completions: {
      create(params: {
        model: string;
        messages: Array<{ role: "user"; content: string }>;
        max_completion_tokens?: number;
      }): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

export interface GroqClientConfig {
  primaryModel: string;
  fallbackModel: string;
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
    const response = await this.groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 4096
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new GroqEmptyResponseError();
    }
    return content;
  }

  async complete(prompt: string): Promise<string> {
    try {
      return await this.completeWithModel(this.config.primaryModel, prompt);
    } catch (error) {
      console.error(`Groq primary model ${this.config.primaryModel} failed, falling back to ${this.config.fallbackModel}`, error);
      return await this.completeWithModel(this.config.fallbackModel, prompt);
    }
  }
}
