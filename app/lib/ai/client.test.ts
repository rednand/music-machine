import { describe, expect, it, vi } from "vitest";
import { GroqClient, GroqEmptyResponseError, type GroqLikeClient } from "./client";

function fakeGroq(response: string | null): GroqLikeClient {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({ choices: [{ message: { content: response } }] })
      }
    }
  };
}

describe("GroqClient", () => {
  const config = { models: ["primary-model", "fallback-model"] };

  it("returns the primary model's completion when it succeeds", async () => {
    const groq = fakeGroq("resposta primaria");
    const client = new GroqClient(groq, config);

    const result = await client.complete("prompt");

    expect(result).toBe("resposta primaria");
    expect(groq.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "primary-model" })
    );
  });

  it("falls back to the fallback model when the primary call throws", async () => {
    const groq: GroqLikeClient = {
      chat: {
        completions: {
          create: vi
            .fn()
            .mockRejectedValueOnce(new Error("primary unavailable"))
            .mockResolvedValueOnce({ choices: [{ message: { content: "resposta fallback" } }] })
        }
      }
    };
    const client = new GroqClient(groq, config);

    const result = await client.complete("prompt");

    expect(result).toBe("resposta fallback");
    expect(groq.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("falls back when the primary model returns an empty completion", async () => {
    const groq: GroqLikeClient = {
      chat: {
        completions: {
          create: vi
            .fn()
            .mockResolvedValueOnce({ choices: [{ message: { content: null } }] })
            .mockResolvedValueOnce({ choices: [{ message: { content: "resposta fallback" } }] })
        }
      }
    };
    const client = new GroqClient(groq, config);

    expect(await client.complete("prompt")).toBe("resposta fallback");
  });

  it("throws GroqEmptyResponseError when both models return empty completions", async () => {
    const groq = fakeGroq(null);
    const client = new GroqClient(groq, config);

    await expect(client.complete("prompt")).rejects.toThrow(GroqEmptyResponseError);
  });

  it("tries every configured model in order until one succeeds", async () => {
    const groq: GroqLikeClient = {
      chat: {
        completions: {
          create: vi
            .fn()
            .mockRejectedValueOnce(new Error("first model unavailable"))
            .mockRejectedValueOnce(new Error("second model unavailable"))
            .mockResolvedValueOnce({ choices: [{ message: { content: "resposta terceiro modelo" } }] })
        }
      }
    };
    const client = new GroqClient(groq, { models: ["model-1", "model-2", "model-3"] });

    const result = await client.complete("prompt");

    expect(result).toBe("resposta terceiro modelo");
    expect(groq.chat.completions.create).toHaveBeenCalledTimes(3);
    expect(groq.chat.completions.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: "model-3" })
    );
  });
});
