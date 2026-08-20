import { describe, expect, it, vi } from "vitest";
import { synthesizeCuriosities, synthesizeInfluence } from "./curiosity-influence";

const baseInput = {
  albumTitle: "Control",
  artistName: "Janet Jackson",
  sourceExcerpts: [{ id: "source-1", text: "Control was Janet Jackson's first album with full creative control over her sound." }]
};

function fakeItemResponse(text: string, sourceIds: string[] = ["source-1"]) {
  return JSON.stringify({ items: [{ text, kind: "fact", sourceIds }] });
}

describe("synthesizeCuriosities", () => {
  it("returns a validated item citing the source excerpt it came from", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeItemResponse("Foi o primeiro álbum com controle criativo total.")) };

    const result = await synthesizeCuriosities(baseInput, gptClient);

    expect(result.generationFailed).toBeUndefined();
    expect(result.items).toEqual([
      { text: "Foi o primeiro álbum com controle criativo total.", kind: "fact", sourceIds: ["source-1"] }
    ]);
  });

  it("returns no items when the model reports nothing distinctive", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(JSON.stringify({ items: [] })) };

    const result = await synthesizeCuriosities(baseInput, gptClient);

    expect(result.items).toEqual([]);
  });

  it("marks generationFailed instead of throwing on malformed JSON", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue("isso não é um JSON válido") };

    const result = await synthesizeCuriosities(baseInput, gptClient);

    expect(result).toEqual({ items: [], generationFailed: true });
  });

  it("marks generationFailed when the AI client itself throws", async () => {
    const gptClient = { complete: vi.fn().mockRejectedValue(new Error("Groq returned an empty completion")) };

    const result = await synthesizeCuriosities(baseInput, gptClient);

    expect(result).toEqual({ items: [], generationFailed: true });
  });

  it("requests pt-BR output naming the album and artist", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeItemResponse("x")) };

    await synthesizeCuriosities(baseInput, gptClient);

    const prompt = gptClient.complete.mock.calls[0][0];
    expect(prompt).toContain("pt-BR");
    expect(prompt).toContain("Control");
    expect(prompt).toContain("Janet Jackson");
  });
});

describe("synthesizeInfluence", () => {
  it("returns a validated item citing the source excerpt it came from", async () => {
    const gptClient = {
      complete: vi.fn().mockResolvedValue(fakeItemResponse("Influenciou diretamente artistas como Missy Elliott."))
    };

    const result = await synthesizeInfluence(baseInput, gptClient);

    expect(result.generationFailed).toBeUndefined();
    expect(result.items).toEqual([
      { text: "Influenciou diretamente artistas como Missy Elliott.", kind: "fact", sourceIds: ["source-1"] }
    ]);
  });

  it("returns no items when the sources describe no influence relationship", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(JSON.stringify({ items: [] })) };

    const result = await synthesizeInfluence(baseInput, gptClient);

    expect(result.items).toEqual([]);
  });

  it("marks generationFailed instead of throwing on malformed JSON", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue("isso não é um JSON válido") };

    const result = await synthesizeInfluence(baseInput, gptClient);

    expect(result).toEqual({ items: [], generationFailed: true });
  });

  it("marks generationFailed when the AI client itself throws", async () => {
    const gptClient = { complete: vi.fn().mockRejectedValue(new Error("Groq returned an empty completion")) };

    const result = await synthesizeInfluence(baseInput, gptClient);

    expect(result).toEqual({ items: [], generationFailed: true });
  });

  it("asks the model to name the other side of the relationship and its direction", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeItemResponse("x")) };

    await synthesizeInfluence(baseInput, gptClient);

    const prompt = gptClient.complete.mock.calls[0][0];
    expect(prompt).toContain("pt-BR");
    expect(prompt).toMatch(/direção/i);
    expect(prompt).toMatch(/nomear explicitamente/i);
  });

  it("includes Wikipedia-confirmed influence names in the prompt when provided", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeItemResponse("x")) };

    await synthesizeInfluence(
      {
        ...baseInput,
        confirmedInfluences: { influencedBy: ["Sly and the Family Stone"], influenced: ["Missy Elliott"] }
      },
      gptClient
    );

    const prompt = gptClient.complete.mock.calls[0][0];
    expect(prompt).toMatch(/Sly and the Family Stone/);
    expect(prompt).toMatch(/Missy Elliott/);
    expect(prompt).toMatch(/Wikipedia confirma/i);
  });

  it("omits the confirmed-influences block when no names are given", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeItemResponse("x")) };

    await synthesizeInfluence({ ...baseInput, confirmedInfluences: { influencedBy: [], influenced: [] } }, gptClient);

    const prompt = gptClient.complete.mock.calls[0][0];
    expect(prompt).not.toMatch(/Wikipedia confirma/i);
  });
});
