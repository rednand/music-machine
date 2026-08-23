import { describe, expect, it, vi } from "vitest";
import { FallbackChatCompletionClient } from "./fallback-client";
import type { ChatCompletionClient } from "./client";

function fakeClient(result: string | Error): ChatCompletionClient {
  return {
    complete: result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result)
  };
}

describe("FallbackChatCompletionClient", () => {
  it("returns the first client's completion when it succeeds", async () => {
    const first = fakeClient("resposta principal");
    const second = fakeClient("resposta secundaria");
    const client = new FallbackChatCompletionClient([first, second]);

    const result = await client.complete("prompt");

    expect(result).toBe("resposta principal");
    expect(second.complete).not.toHaveBeenCalled();
  });

  it("falls back to the next client when the first one throws", async () => {
    const first = fakeClient(new Error("primary unavailable"));
    const second = fakeClient("resposta secundaria");
    const client = new FallbackChatCompletionClient([first, second]);

    const result = await client.complete("prompt");

    expect(result).toBe("resposta secundaria");
  });

  it("falls through more than two clients in order", async () => {
    const first = fakeClient(new Error("first down"));
    const second = fakeClient(new Error("second down"));
    const third = fakeClient("resposta terciaria");
    const client = new FallbackChatCompletionClient([first, second, third]);

    expect(await client.complete("prompt")).toBe("resposta terciaria");
  });

  it("throws the last client's error when every client fails", async () => {
    const first = fakeClient(new Error("first down"));
    const second = fakeClient(new Error("second down"));
    const client = new FallbackChatCompletionClient([first, second]);

    await expect(client.complete("prompt")).rejects.toThrow("second down");
  });
});
