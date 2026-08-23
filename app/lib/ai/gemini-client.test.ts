import { describe, expect, it, vi } from "vitest";
import { GeminiClient, GeminiEmptyResponseError } from "./gemini-client";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("GeminiClient", () => {
  it("returns the completion text on success, using the default model list", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({ candidates: [{ content: { parts: [{ text: "resposta gemini" }] } }] })
    );
    const client = new GeminiClient({ apiKey: "test-key" }, fetchImpl as unknown as typeof fetch);

    const result = await client.complete("prompt");

    expect(result).toBe("resposta gemini");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("falls through all 10 default models before giving up", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    const client = new GeminiClient({ apiKey: "test-key" }, fetchImpl as unknown as typeof fetch);

    await expect(client.complete("prompt")).rejects.toThrow("Gemini request failed: 429");
    expect(fetchImpl).toHaveBeenCalledTimes(10);
  });

  it("uses a configured model list in order", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({ candidates: [{ content: { parts: [{ text: "ok" }] } }] })
    );
    const client = new GeminiClient({ apiKey: "test-key", models: ["gemini-3.6-flash"] }, fetchImpl as unknown as typeof fetch);

    await client.complete("prompt");

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("models/gemini-3.6-flash:generateContent"), expect.anything());
  });

  it("falls back to the next model when the first one fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ candidates: [{ content: { parts: [{ text: "resposta fallback" }] } }] }));
    const client = new GeminiClient(
      { apiKey: "test-key", models: ["gemini-3.5-flash-lite", "gemini-3.6-flash"] },
      fetchImpl as unknown as typeof fetch
    );

    const result = await client.complete("prompt");

    expect(result).toBe("resposta fallback");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenLastCalledWith(expect.stringContaining("models/gemini-3.6-flash:generateContent"), expect.anything());
  });

  it("tries every configured model in order until one succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ candidates: [{ content: { parts: [{ text: "resposta terceiro modelo" }] } }] }));
    const client = new GeminiClient(
      { apiKey: "test-key", models: ["model-1", "model-2", "model-3"] },
      fetchImpl as unknown as typeof fetch
    );

    const result = await client.complete("prompt");

    expect(result).toBe("resposta terceiro modelo");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws the last model's error when every model fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));
    const client = new GeminiClient(
      { apiKey: "invalid-key", models: ["gemini-3.5-flash-lite", "gemini-3.6-flash"] },
      fetchImpl as unknown as typeof fetch
    );

    await expect(client.complete("prompt")).rejects.toThrow("Gemini request failed: 400");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws GeminiEmptyResponseError when there is no candidate text", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ candidates: [] }));
    const client = new GeminiClient({ apiKey: "test-key", models: ["gemini-3.5-flash-lite"] }, fetchImpl as unknown as typeof fetch);

    await expect(client.complete("prompt")).rejects.toThrow(GeminiEmptyResponseError);
  });
});
