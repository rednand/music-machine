import { describe, expect, it, vi } from "vitest";
import { synthesizeNarrative } from "./narrative";

const baseInput = {
  albumTitle: "Control",
  artistName: "Janet Jackson",
  structuredData: { releaseDate: "1986-02-04", label: "A&M Records" },
  sameEraAlbums: [{ title: "True Blue", artistName: "Madonna" }],
  historicalEvents: [{ title: "Challenger disaster", date: "1986-01-28" }],
  sourceExcerpts: [{ id: "source-1", text: "Control was released on February 4, 1986, by A&M Records." }]
};

function fakeGptResponseWithFacet(facet: string) {
  return JSON.stringify({
    statements: [
      {
        text: `Texto narrativo para ${facet}.`,
        kind: "fact",
        sourceIds: ["source-1"]
      }
    ]
  });
}

describe("synthesizeNarrative", () => {
  it("generates all four facets, each grounded in structured data with source citations", async () => {
    const gptClient = { complete: vi.fn().mockImplementation((prompt: string) => Promise.resolve(fakeGptResponseWithFacet(prompt))) };

    const result = await synthesizeNarrative(baseInput, gptClient);

    expect(Object.keys(result.facets).sort()).toEqual(
      ["artist_moment", "world_context", "musical_scene", "reception_vs_legacy"].sort()
    );
    for (const facet of Object.values(result.facets)) {
      for (const statement of facet.statements) {
        if (statement.kind === "fact") {
          expect(statement.sourceIds.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("includes real same-era album data in the musical_scene prompt, not just the album alone", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("musical_scene")) };

    await synthesizeNarrative(baseInput, gptClient);

    const musicalScenePrompt = gptClient.complete.mock.calls.find((call) =>
      call[0].includes("musical_scene")
    )?.[0];

    expect(musicalScenePrompt).toContain("True Blue");
    expect(musicalScenePrompt).toContain("Madonna");
  });

  it("includes historical events in the world_context prompt", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("world_context")) };

    await synthesizeNarrative(baseInput, gptClient);

    const worldContextPrompt = gptClient.complete.mock.calls.find((call) =>
      call[0].includes("world_context")
    )?.[0];

    expect(worldContextPrompt).toContain("Challenger disaster");
  });

  it("requests pt-BR output in every prompt", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("artist_moment")) };

    await synthesizeNarrative(baseInput, gptClient);

    for (const call of gptClient.complete.mock.calls) {
      expect(call[0]).toContain("pt-BR");
    }
  });

  it("marks a single facet as generationFailed on malformed JSON instead of throwing, leaving other facets intact", async () => {
    const gptClient = {
      complete: vi.fn().mockImplementation((prompt: string) =>
        Promise.resolve(
          prompt.includes("world_context")
            ? '{"statements":[{"text":"Resposta cortada pela metade'
            : fakeGptResponseWithFacet(prompt)
        )
      )
    };

    const result = await synthesizeNarrative(baseInput, gptClient);

    expect(result.facets.world_context).toEqual({ statements: [], generationFailed: true });
    expect(result.facets.artist_moment.statements).toHaveLength(1);
    expect(result.facets.artist_moment.generationFailed).toBeUndefined();
  });

  it("instructs the model to avoid repeating basic album facts already shown in the header, for every facet", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("artist_moment")) };

    await synthesizeNarrative(baseInput, gptClient);

    for (const call of gptClient.complete.mock.calls) {
      expect(call[0]).toMatch(/não repita essas informações básicas/i);
    }
  });

  it("instructs only artist_moment and musical_scene to write connected prose", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("artist_moment")) };

    await synthesizeNarrative(baseInput, gptClient);

    const artistMomentPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: artist_moment"))?.[0];
    const musicalScenePrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: musical_scene"))?.[0];
    const worldContextPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: world_context"))?.[0];
    const receptionPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: reception_vs_legacy"))?.[0];

    expect(artistMomentPrompt).toMatch(/texto corrido e conectado/i);
    expect(musicalScenePrompt).toMatch(/texto corrido e conectado/i);
    expect(worldContextPrompt).not.toMatch(/texto corrido e conectado/i);
    expect(receptionPrompt).not.toMatch(/texto corrido e conectado/i);
  });

  it("gives each facet a distinct focus instruction so sections don't overlap", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("world_context")) };

    await synthesizeNarrative(baseInput, gptClient);

    const worldContextPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: world_context"))?.[0];
    const artistMomentPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: artist_moment"))?.[0];

    expect(worldContextPrompt).toMatch(/não repita a biografia do artista/i);
    expect(artistMomentPrompt).toMatch(/não fale do mundo/i);
  });

  it("instructs world_context to also cover popular culture and contemporary trends, not just politics/technology", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("world_context")) };

    await synthesizeNarrative(baseInput, gptClient);

    const worldContextPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: world_context"))?.[0];

    expect(worldContextPrompt).toMatch(/cultura pop/i);
    expect(worldContextPrompt).toMatch(/política.*eventos históricos/i);
    expect(worldContextPrompt).toMatch(/tecnologia/i);
  });

  it("instructs world_context to return a fixed number of standalone statements, not connected prose", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("world_context")) };

    await synthesizeNarrative(baseInput, gptClient);

    const worldContextPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: world_context"))?.[0];
    const artistMomentPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("Seção: artist_moment"))?.[0];

    expect(worldContextPrompt).toMatch(/exatamente 3 statements/i);
    expect(worldContextPrompt).toMatch(/bloco independente e autocontido/i);
    expect(artistMomentPrompt).toMatch(/texto corrido e conectado/i);
  });

  it("asks the AI two separate, narrowly-scoped questions for reception_vs_legacy so it can't conflate the two periods in one answer", async () => {
    const gptClient = { complete: vi.fn().mockResolvedValue(fakeGptResponseWithFacet("reception_vs_legacy")) };

    await synthesizeNarrative(baseInput, gptClient, ["reception_vs_legacy"]);

    expect(gptClient.complete).toHaveBeenCalledTimes(2);
    const launchPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("(no lançamento)"))?.[0];
    const todayPrompt = gptClient.complete.mock.calls.find((call) => call[0].includes("(hoje)"))?.[0];

    expect(launchPrompt).toMatch(/momento do lançamento/i);
    expect(launchPrompt).not.toMatch(/percepção e reavaliação atuais/i);
    expect(todayPrompt).toMatch(/avaliado.*—.*percepção e reavaliação atuais/i);
    expect(todayPrompt).not.toMatch(/momento do lançamento/i);
  });

  it("keeps reception_vs_legacy's launch and today statements in the right slots, each answered independently", async () => {
    const gptClient = {
      complete: vi.fn().mockImplementation((prompt: string) =>
        Promise.resolve(
          JSON.stringify({
            statements: [
              {
                text: prompt.includes("(no lançamento)") ? "No lançamento, a crítica foi mista." : "Hoje, o álbum é visto como um clássico.",
                kind: "fact",
                sourceIds: ["source-1"]
              }
            ]
          })
        )
      )
    };

    const result = await synthesizeNarrative(baseInput, gptClient, ["reception_vs_legacy"]);

    expect(result.facets.reception_vs_legacy.statements[0].text).toBe("No lançamento, a crítica foi mista.");
    expect(result.facets.reception_vs_legacy.statements[1].text).toBe("Hoje, o álbum é visto como um clássico.");
  });

  it("marks reception_vs_legacy as generationFailed instead of producing a broken statement when the model returns zero statements for just one of the two periods", async () => {
    const gptClient = {
      complete: vi.fn().mockImplementation((prompt: string) =>
        Promise.resolve(
          prompt.includes("(no lançamento)")
            ? JSON.stringify({ statements: [] })
            : JSON.stringify({ statements: [{ text: "Hoje, o álbum é visto como um clássico.", kind: "fact", sourceIds: ["source-1"] }] })
        )
      )
    };

    const result = await synthesizeNarrative(baseInput, gptClient, ["reception_vs_legacy"]);

    expect(result.facets.reception_vs_legacy).toEqual({ statements: [], generationFailed: true });
  });

  it("only generates the requested subset of facets, leaving the rest absent", async () => {
    const gptClient = { complete: vi.fn().mockImplementation((prompt: string) => Promise.resolve(fakeGptResponseWithFacet(prompt))) };

    const result = await synthesizeNarrative(baseInput, gptClient, ["artist_moment", "world_context"]);

    expect(gptClient.complete).toHaveBeenCalledTimes(2);
    expect(Object.keys(result.facets).sort()).toEqual(["artist_moment", "world_context"]);
  });

  it("marks a facet as generationFailed when the AI client itself throws (e.g. both models fail)", async () => {
    const gptClient = {
      complete: vi.fn().mockImplementation((prompt: string) =>
        prompt.includes("reception_vs_legacy")
          ? Promise.reject(new Error("Groq returned an empty completion"))
          : Promise.resolve(fakeGptResponseWithFacet(prompt))
      )
    };

    const result = await synthesizeNarrative(baseInput, gptClient);

    expect(result.facets.reception_vs_legacy).toEqual({ statements: [], generationFailed: true });
    expect(result.facets.musical_scene.statements).toHaveLength(1);
  });
});
