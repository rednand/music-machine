import { describe, expect, it, vi } from "vitest";
import { translateTitles } from "./translate";

describe("translateTitles", () => {
  it("returns the translated titles in the same order", async () => {
    const gptClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({ translations: ["Janet Jackson anuncia turnê de relançamento", "Obituário de Paul Jackson"] })
      )
    };

    const result = await translateTitles(
      ["Janet Jackson announces reissue tour", "Paul Jackson obituary"],
      gptClient
    );

    expect(result).toEqual(["Janet Jackson anuncia turnê de relançamento", "Obituário de Paul Jackson"]);
  });

  it("returns an empty array without calling the AI client when there are no titles", async () => {
    const gptClient = { complete: vi.fn() };

    const result = await translateTitles([], gptClient);

    expect(result).toEqual([]);
    expect(gptClient.complete).not.toHaveBeenCalled();
  });

  it("falls back to the original titles when the model returns malformed JSON", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue("isso não é um JSON válido") };

    const result = await translateTitles(["Janet Jackson announces reissue tour"], gptClient);

    expect(result).toEqual(["Janet Jackson announces reissue tour"]);
  });

  it("falls back to the original titles when the translation count doesn't match", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(JSON.stringify({ translations: ["Só uma tradução"] })) };

    const result = await translateTitles(
      ["Janet Jackson announces reissue tour", "Paul Jackson obituary"],
      gptClient
    );

    expect(result).toEqual(["Janet Jackson announces reissue tour", "Paul Jackson obituary"]);
  });

  it("falls back to the original titles when the AI client itself throws", async () => {
    const gptClient = { complete: vi.fn().mockRejectedValue(new Error("Groq returned an empty completion")) };

    const result = await translateTitles(["Janet Jackson announces reissue tour"], gptClient);

    expect(result).toEqual(["Janet Jackson announces reissue tour"]);
  });

  it("keeps the original title for any individual entry the model returns blank", async () => {
    const gptClient = {
      complete: vi.fn().mockResolvedValue(JSON.stringify({ translations: ["Tradução válida", ""] }))
    };

    const result = await translateTitles(["Valid headline", "Untranslated headline"], gptClient);

    expect(result).toEqual(["Tradução válida", "Untranslated headline"]);
  });
});
