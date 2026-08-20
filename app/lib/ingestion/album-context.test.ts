import { describe, expect, it, vi } from "vitest";
import { assembleAlbumContext } from "./album-context";

const album = {
  id: "album-1",
  artist_id: "artist-1",
  title: "Control",
  slug: "janet-jackson-control",
  release_date: "1986-02-04",
  genre: "Funk / Soul",
  label: "A&M Records",
  track_count: 9,
  cover_art_url: "https://example.com/cover.jpg"
};
const artist = { id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" };

function publishedArticle(facet: string) {
  return { id: `article-${facet}`, album_id: album.id, facet, status: "published" };
}

function buildDeps(overrides: Partial<Record<string, unknown>> = {}) {
  const narrativeArticles = {
    findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
      Promise.resolve(publishedArticle(facet))
    ),
    findStatementsByArticleId: vi
      .fn()
      .mockResolvedValue([{ text: "x", kind: "fact", sourceIds: ["source-1"] }]),
    createPending: vi.fn(),
    publish: vi.fn(),
    markFailedValidation: vi.fn()
  };

  return {
    findAlbum: vi.fn().mockResolvedValue(album),
    findArtistById: vi.fn().mockResolvedValue(artist),
    findTracks: vi.fn().mockResolvedValue([]),
    persistTracks: vi.fn().mockResolvedValue([]),
    fetchTracks: vi.fn().mockResolvedValue([]),
    findCredits: vi.fn().mockResolvedValue([]),
    persistCredits: vi.fn().mockResolvedValue([]),
    findAlbumsByArtistId: vi.fn().mockResolvedValue([album]),
    findPerformanceRecords: vi.fn().mockResolvedValue([]),
    persistPerformanceRecords: vi.fn().mockResolvedValue([]),
    findReviews: vi.fn().mockResolvedValue([]),
    findCuriosities: vi.fn().mockResolvedValue([]),
    persistCuriosities: vi.fn().mockResolvedValue([]),
    findInfluences: vi.fn().mockResolvedValue([]),
    persistInfluence: vi.fn().mockResolvedValue([]),
    findSameEraAlbums: vi.fn().mockResolvedValue([{ title: "True Blue", artistName: "Madonna" }]),
    findHistoricalEvents: vi.fn().mockResolvedValue([]),
    findArtistDiscography: vi.fn().mockResolvedValue([]),
    ingestAlbum: vi.fn().mockResolvedValue({
      contextFacts: [{ text: "Control is Janet Jackson's third studio album.", source: { providerName: "encyclopedia", url: "x", retrievedAt: "now" } }],
      credits: [],
      performanceRecords: [],
      externalId: "cat-1",
      artistProfile: { summary: null, influencedBy: [], influenced: [] }
    }),
    gptClient: { complete: vi.fn() },
    narrativeArticles,
    findRecommendationCandidates: vi.fn().mockResolvedValue([]),
    findDirectlyInfluencedAlbumIds: vi.fn().mockResolvedValue(new Set()),
    recommendations: {
      findBySubjectAlbumId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((input) => Promise.resolve({ id: "rec-1", ...input }))
    },
    ...overrides
  };
}

describe("assembleAlbumContext", () => {
  it("returns not_found when the album does not exist", async () => {
    const deps = buildDeps({ findAlbum: vi.fn().mockResolvedValue(null) });

    expect(await assembleAlbumContext("missing", deps as never)).toEqual({ state: "not_found" });
  });

  it("returns pending when any facet is still generating", async () => {
    const deps = buildDeps();
    deps.narrativeArticles.findByAlbumAndFacet = vi
      .fn()
      .mockResolvedValueOnce({ id: "a1", status: "pending" })
      .mockResolvedValue(publishedArticle("world_context"));

    expect(await assembleAlbumContext("album-1", deps as never)).toEqual({ state: "pending" });
  });

  it("reuses existing published statements without calling Groq again (FR-017)", async () => {
    const deps = buildDeps();

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(deps.gptClient.complete).not.toHaveBeenCalled();
    if (result.state === "ready") {
      expect(result.body.artistMoment).toEqual([expect.objectContaining({ text: "x" })]);
    }
  });

  it("generates and publishes narrative facets on a first-ever view", async () => {
    const deps = buildDeps({
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
        findStatementsByArticleId: vi.fn(),
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" })),
        markFailedValidation: vi.fn()
      }
    });
    deps.gptClient.complete = vi.fn().mockResolvedValue(
      JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: ["ctx-0"] }] })
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(deps.gptClient.complete).toHaveBeenCalledTimes(7);
    expect(deps.narrativeArticles.publish).toHaveBeenCalledTimes(5);
  });

  it("marks a failed-to-generate facet as failed_validation instead of crashing or publishing empty content", async () => {
    const markFailedValidation = vi.fn();
    const publish = vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" }));
    const deps = buildDeps({
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
        findStatementsByArticleId: vi.fn(),
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish,
        markFailedValidation
      }
    });
    deps.gptClient.complete = vi.fn().mockImplementation((prompt: string) =>
      Promise.resolve(
        prompt.includes("world_context")
          ? "isso não é um JSON válido"
          : JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: ["ctx-0"] }] })
      )
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(markFailedValidation).toHaveBeenCalledWith("new-world_context");
    expect(publish).toHaveBeenCalledTimes(4);
    if (result.state === "ready") {
      expect(result.body.worldContext).toEqual([]);
      expect(result.body.artistMoment).toHaveLength(1);
    }
  });

  it("marks a facet as failed_validation instead of publishing when the model returns zero statements, so it can be retried later", async () => {
    const markFailedValidation = vi.fn();
    const publish = vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" }));
    const deps = buildDeps({
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
        findStatementsByArticleId: vi.fn(),
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish,
        markFailedValidation
      }
    });
    deps.gptClient.complete = vi.fn().mockImplementation((prompt: string) =>
      Promise.resolve(
        prompt.includes("world_context")
          ? JSON.stringify({ statements: [] })
          : JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: ["ctx-0"] }] })
      )
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(markFailedValidation).toHaveBeenCalledWith("new-world_context");
    expect(publish).not.toHaveBeenCalledWith("new-world_context", expect.anything());
    if (result.state === "ready") {
      expect(result.body.worldContext).toEqual([]);
    }
  });

  it("fetches historical events when world_context needs generation", async () => {
    const deps = buildDeps({
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
        findStatementsByArticleId: vi.fn(),
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" })),
        markFailedValidation: vi.fn()
      }
    });
    deps.gptClient.complete = vi.fn().mockResolvedValue(
      JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: ["ctx-0"] }] })
    );

    await assembleAlbumContext("album-1", deps as never);

    expect(deps.findHistoricalEvents).toHaveBeenCalledWith(album.release_date);
  });

  it("skips fetching historical events when world_context is already resolved but another facet needs generation", async () => {
    const deps = buildDeps({
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
          Promise.resolve(facet === "world_context" ? publishedArticle("world_context") : null)
        ),
        findStatementsByArticleId: vi.fn().mockResolvedValue([{ text: "x", kind: "fact", sourceIds: ["source-1"] }]),
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" })),
        markFailedValidation: vi.fn()
      }
    });
    deps.gptClient.complete = vi.fn().mockResolvedValue(
      JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: ["ctx-0"] }] })
    );

    await assembleAlbumContext("album-1", deps as never);

    expect(deps.findHistoricalEvents).not.toHaveBeenCalled();
  });

  it("reuses an already-published facet's stored statements instead of regenerating and republishing it", async () => {
    const publish = vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" }));
    const findStatementsByArticleId = vi.fn().mockResolvedValue([{ text: "Já publicado.", kind: "fact", sourceIds: ["source-1"] }]);
    const deps = buildDeps({
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
          Promise.resolve(facet === "artist_moment" ? publishedArticle("artist_moment") : null)
        ),
        findStatementsByArticleId,
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish,
        markFailedValidation: vi.fn()
      }
    });
    deps.gptClient.complete = vi.fn().mockResolvedValue(
      JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: ["ctx-0"] }] })
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(deps.gptClient.complete).toHaveBeenCalledTimes(6);
    expect(findStatementsByArticleId).toHaveBeenCalledWith("article-artist_moment");
    expect(publish).not.toHaveBeenCalledWith("article-artist_moment", expect.anything());
    if (result.state === "ready") {
      expect(result.body.artistMoment).toEqual([expect.objectContaining({ text: "Já publicado." })]);
    }
  });

  it("treats a failed_validation facet as terminal instead of retrying it on every later visit", async () => {
    const findStatementsByArticleId = vi.fn().mockResolvedValue([{ text: "x", kind: "fact", sourceIds: ["source-1"] }]);
    const createPending = vi.fn();
    const deps = buildDeps({
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
          Promise.resolve(
            facet === "world_context" ? { id: "article-world_context", status: "failed_validation" } : publishedArticle(facet)
          )
        ),
        findStatementsByArticleId,
        createPending,
        publish: vi.fn(),
        markFailedValidation: vi.fn()
      }
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(deps.gptClient.complete).not.toHaveBeenCalled();
    expect(createPending).not.toHaveBeenCalled();
    expect(findStatementsByArticleId).not.toHaveBeenCalledWith("article-world_context");
    if (result.state === "ready") {
      expect(result.body.worldContext).toEqual([]);
      expect(result.body.artistMoment).toEqual([expect.objectContaining({ text: "x" })]);
    }
  });

  it("populates tracks from findTracks, defaulting to an empty array when none exist", async () => {
    const deps = buildDeps({
      findTracks: vi.fn().mockResolvedValue([{ id: "track-1", album_id: "album-1", title: "Control", track_number: 1 }])
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.tracks).toEqual([expect.objectContaining({ title: "Control" })]);
    }

    const emptyDeps = buildDeps();
    const emptyResult = await assembleAlbumContext("album-1", emptyDeps as never);
    if (emptyResult.state === "ready") {
      expect(emptyResult.body.tracks).toEqual([]);
    }
  });

  it("persists tracks found during first-ever ingestion, and returns them in the body", async () => {
    const rawTracks = [
      { title: "Control", position: "1", durationSeconds: 239, source: { providerName: "discography", url: "x", retrievedAt: "now" } }
    ];
    const persistedTracks = [{ id: "track-1", album_id: "album-1", title: "Control", track_number: 1, duration_seconds: 239 }];
    const persistTracks = vi.fn().mockResolvedValue(persistedTracks);
    const deps = buildDeps({
      findTracks: vi.fn().mockResolvedValue([]),
      persistTracks,
      fetchTracks: vi.fn().mockResolvedValue(rawTracks),
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
        findStatementsByArticleId: vi.fn(),
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" })),
        markFailedValidation: vi.fn()
      },
      ingestAlbum: vi.fn().mockResolvedValue({
        contextFacts: [],
        credits: [],
        performanceRecords: [],
        externalId: "cat-1",
        artistProfile: { summary: null, influencedBy: [], influenced: [] }
      })
    });
    deps.gptClient.complete = vi.fn().mockResolvedValue(
      JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: [] }] })
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistTracks).toHaveBeenCalledWith("album-1", rawTracks);
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.tracks).toEqual(persistedTracks);
    }
  });

  it("does not re-fetch or re-persist tracks that already exist", async () => {
    const existingTracks = [{ id: "track-1", album_id: "album-1", title: "Control", track_number: 1 }];
    const persistTracks = vi.fn();
    const deps = buildDeps({ findTracks: vi.fn().mockResolvedValue(existingTracks), persistTracks });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistTracks).not.toHaveBeenCalled();
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.tracks).toEqual(existingTracks);
    }
  });

  it("persists performance records found during first-ever ingestion, and returns them in the body", async () => {
    const rawRecords = [
      { kind: "chart_position", label: "Billboard 200", value: "1", source: { providerName: "encyclopedia", url: "x", retrievedAt: "now" } }
    ];
    const persistedRecords = [{ id: "perf-1", album_id: "album-1", kind: "chart_position", label: "Billboard 200", value: "1", source_id: "s1" }];
    const persistPerformanceRecords = vi.fn().mockResolvedValue(persistedRecords);
    const deps = buildDeps({
      findPerformanceRecords: vi.fn().mockResolvedValue([]),
      persistPerformanceRecords,
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
        findStatementsByArticleId: vi.fn(),
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" })),
        markFailedValidation: vi.fn()
      },
      ingestAlbum: vi.fn().mockResolvedValue({
        contextFacts: [],
        credits: [],
        tracks: [],
        performanceRecords: rawRecords,
        artistProfile: { summary: null, influencedBy: [], influenced: [] }
      })
    });
    deps.gptClient.complete = vi.fn().mockResolvedValue(
      JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: [] }] })
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistPerformanceRecords).toHaveBeenCalledWith("album-1", rawRecords);
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.performance).toEqual(persistedRecords);
    }
  });

  it("does not re-fetch or re-persist performance records that already exist", async () => {
    const existingRecords = [{ id: "perf-1", album_id: "album-1", kind: "chart_position", label: "Billboard 200", value: "1", source_id: "s1" }];
    const persistPerformanceRecords = vi.fn();
    const deps = buildDeps({
      findPerformanceRecords: vi.fn().mockResolvedValue(existingRecords),
      persistPerformanceRecords
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistPerformanceRecords).not.toHaveBeenCalled();
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.performance).toEqual(existingRecords);
    }
  });

  function buildFirstEverNarrativeArticles() {
    return {
      findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
      findStatementsByArticleId: vi.fn(),
      createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
      publish: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" })),
      markFailedValidation: vi.fn()
    };
  }

  function narrativeAndFactGptClient(curiosityItems: unknown[], influenceItems: unknown[]) {
    return vi.fn().mockImplementation((prompt: string) => {
      if (prompt.includes("sintetizador de curiosidades")) {
        return Promise.resolve(JSON.stringify({ items: curiosityItems }));
      }
      if (prompt.includes("sintetizador de relações de influência")) {
        return Promise.resolve(JSON.stringify({ items: influenceItems }));
      }
      return Promise.resolve(JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: ["ctx-0"] }] }));
    });
  }

  it("persists a curiosity synthesized from grounded source material on first-ever ingestion", async () => {
    const persistCuriosities = vi.fn().mockResolvedValue([{ id: "cur-1", album_id: "album-1", summary: "Fato curioso.", status: "unconfirmed", source_id: "ctx-0" }]);
    const deps = buildDeps({
      findCuriosities: vi.fn().mockResolvedValue([]),
      persistCuriosities,
      narrativeArticles: buildFirstEverNarrativeArticles()
    });
    deps.gptClient.complete = narrativeAndFactGptClient(
      [{ text: "Fato curioso.", kind: "fact", sourceIds: ["ctx-0"] }],
      []
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistCuriosities).toHaveBeenCalledWith(
      "album-1",
      [{ text: "Fato curioso.", kind: "fact", sourceIds: ["ctx-0"] }],
      [{ id: "ctx-0", kind: "context", source: { providerName: "encyclopedia", url: "x", retrievedAt: "now" } }]
    );
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.curiosities).toHaveLength(1);
    }
  });

  it("does not resynthesize or re-persist curiosities that already exist", async () => {
    const existingCuriosities = [{ id: "cur-1", album_id: "album-1", summary: "x", status: "unconfirmed", source_id: "s1" }];
    const persistCuriosities = vi.fn();
    const deps = buildDeps({ findCuriosities: vi.fn().mockResolvedValue(existingCuriosities), persistCuriosities });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistCuriosities).not.toHaveBeenCalled();
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.curiosities).toEqual(existingCuriosities);
    }
  });

  it("does not persist a curiosity that fails the no-fabrication validation gate (missing source)", async () => {
    const persistCuriosities = vi.fn();
    const deps = buildDeps({
      findCuriosities: vi.fn().mockResolvedValue([]),
      persistCuriosities,
      narrativeArticles: buildFirstEverNarrativeArticles()
    });
    deps.gptClient.complete = narrativeAndFactGptClient([{ text: "Fato sem fonte.", kind: "fact", sourceIds: [] }], []);

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistCuriosities).not.toHaveBeenCalled();
    if (result.state === "ready") {
      expect(result.body.curiosities).toEqual([]);
    }
  });

  it("persists an influence relationship synthesized from grounded source material, with the current album on the from side", async () => {
    const persistInfluence = vi.fn().mockResolvedValue([{ id: "inf-1", from_album_id: "album-1", explanation: "Influenciou Missy Elliott.", source_id: "ctx-0" }]);
    const deps = buildDeps({
      findInfluences: vi.fn().mockResolvedValue([]),
      persistInfluence,
      narrativeArticles: buildFirstEverNarrativeArticles()
    });
    deps.gptClient.complete = narrativeAndFactGptClient(
      [],
      [{ text: "Influenciou Missy Elliott.", kind: "fact", sourceIds: ["ctx-0"] }]
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistInfluence).toHaveBeenCalledWith(
      "album-1",
      [{ text: "Influenciou Missy Elliott.", kind: "fact", sourceIds: ["ctx-0"] }],
      [{ id: "ctx-0", kind: "context", source: { providerName: "encyclopedia", url: "x", retrievedAt: "now" } }]
    );
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.influence).toHaveLength(1);
    }
  });

  it("does not resynthesize or re-persist influence relationships that already exist", async () => {
    const existingInfluence = [
      { id: "inf-1", from_album_id: "album-1", to_album_id: "album-2", explanation: "x", source_id: "s1" }
    ];
    const persistInfluence = vi.fn();
    const deps = buildDeps({ findInfluences: vi.fn().mockResolvedValue(existingInfluence), persistInfluence });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistInfluence).not.toHaveBeenCalled();
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.influence).toEqual([
        { id: "inf-1", artistName: "Janet Jackson", explanation: "x", albumId: "album-2" }
      ]);
    }
  });

  it("does not persist an influence relationship that fails the no-fabrication validation gate (missing source)", async () => {
    const persistInfluence = vi.fn();
    const deps = buildDeps({
      findInfluences: vi.fn().mockResolvedValue([]),
      persistInfluence,
      narrativeArticles: buildFirstEverNarrativeArticles()
    });
    deps.gptClient.complete = narrativeAndFactGptClient([], [{ text: "Influência sem fonte.", kind: "fact", sourceIds: [] }]);

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistInfluence).not.toHaveBeenCalled();
    if (result.state === "ready") {
      expect(result.body.influence).toEqual([]);
    }
  });

  it("still persists tracks, performance, and narrative facets when curiosity/influence generation fails (FR-012)", async () => {
    const rawTracks = [
      { title: "Control", position: "1", durationSeconds: 239, source: { providerName: "discography", url: "x", retrievedAt: "now" } }
    ];
    const rawRecords = [
      { kind: "chart_position", label: "Billboard 200", value: "1", source: { providerName: "encyclopedia", url: "x", retrievedAt: "now" } }
    ];
    const persistedTracks = [{ id: "track-1", album_id: "album-1", title: "Control", track_number: 1, duration_seconds: 239 }];
    const persistedRecords = [{ id: "perf-1", album_id: "album-1", kind: "chart_position", label: "Billboard 200", value: "1", source_id: "s1" }];
    const persistTracks = vi.fn().mockResolvedValue(persistedTracks);
    const persistPerformanceRecords = vi.fn().mockResolvedValue(persistedRecords);
    const persistCuriosities = vi.fn();
    const persistInfluence = vi.fn();
    const deps = buildDeps({
      findTracks: vi.fn().mockResolvedValue([]),
      persistTracks,
      fetchTracks: vi.fn().mockResolvedValue(rawTracks),
      findPerformanceRecords: vi.fn().mockResolvedValue([]),
      persistPerformanceRecords,
      findCuriosities: vi.fn().mockResolvedValue([]),
      persistCuriosities,
      findInfluences: vi.fn().mockResolvedValue([]),
      persistInfluence,
      narrativeArticles: buildFirstEverNarrativeArticles(),
      ingestAlbum: vi.fn().mockResolvedValue({
        contextFacts: [{ text: "Control is Janet Jackson's third studio album.", source: { providerName: "encyclopedia", url: "x", retrievedAt: "now" } }],
        credits: [],
        performanceRecords: rawRecords,
        externalId: "cat-1",
        artistProfile: { summary: null, influencedBy: [], influenced: [] }
      })
    });
    deps.gptClient.complete = vi.fn().mockImplementation((prompt: string) => {
      if (prompt.includes("sintetizador de curiosidades") || prompt.includes("sintetizador de relações de influência")) {
        return Promise.resolve("isso não é um JSON válido");
      }
      return Promise.resolve(JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: ["ctx-0"] }] }));
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(persistTracks).toHaveBeenCalledWith("album-1", rawTracks);
    expect(persistPerformanceRecords).toHaveBeenCalledWith("album-1", rawRecords);
    expect(persistCuriosities).not.toHaveBeenCalled();
    expect(persistInfluence).not.toHaveBeenCalled();
    if (result.state === "ready") {
      expect(result.body.tracks).toEqual(persistedTracks);
      expect(result.body.performance).toEqual(persistedRecords);
      expect(result.body.curiosities).toEqual([]);
      expect(result.body.influence).toEqual([]);
      expect(result.body.artistMoment).toHaveLength(1);
    }
  });

  it("still synthesizes narrative facets, curiosities, and influence when persisting tracks fails (FR-012)", async () => {
    const rawTracks = [
      { title: "Control", position: "1", durationSeconds: 239, source: { providerName: "discography", url: "x", retrievedAt: "now" } }
    ];
    const persistTracks = vi.fn().mockRejectedValue(new Error("db unavailable"));
    const persistCuriosities = vi
      .fn()
      .mockResolvedValue([{ id: "cur-1", album_id: "album-1", summary: "Fato curioso.", status: "unconfirmed", source_id: "ctx-0" }]);
    const persistInfluence = vi
      .fn()
      .mockResolvedValue([{ id: "inf-1", from_album_id: "album-1", explanation: "Influenciou Missy Elliott.", source_id: "ctx-0" }]);
    const deps = buildDeps({
      findTracks: vi.fn().mockResolvedValue([]),
      persistTracks,
      fetchTracks: vi.fn().mockResolvedValue(rawTracks),
      findCuriosities: vi.fn().mockResolvedValue([]),
      persistCuriosities,
      findInfluences: vi.fn().mockResolvedValue([]),
      persistInfluence,
      narrativeArticles: buildFirstEverNarrativeArticles(),
      ingestAlbum: vi.fn().mockResolvedValue({
        contextFacts: [],
        credits: [],
        performanceRecords: [],
        externalId: "cat-1",
        artistProfile: { summary: null, influencedBy: [], influenced: [] }
      })
    });
    deps.gptClient.complete = narrativeAndFactGptClient(
      [{ text: "Fato curioso.", kind: "fact", sourceIds: ["ctx-0"] }],
      [{ text: "Influenciou Missy Elliott.", kind: "fact", sourceIds: ["ctx-0"] }]
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(persistTracks).toHaveBeenCalledWith("album-1", rawTracks);
    if (result.state === "ready") {
      expect(result.body.tracks).toEqual([]);
      expect(result.body.curiosities).toHaveLength(1);
      expect(result.body.influence).toHaveLength(1);
      expect(result.body.artistMoment).toHaveLength(1);
    }
  });

  it("populates otherAlbumsByArtist with the full discography, marking the current album as isCurrent", async () => {
    const trueBlue = { id: "album-2", artist_id: "artist-1", title: "True Blue", slug: "true-blue", release_date: "1986-06-30" };
    const deps = buildDeps({
      findAlbumsByArtistId: vi.fn().mockResolvedValue([album, trueBlue])
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.otherAlbumsByArtist).toEqual([
        { albumId: "album-1", title: "Control", releaseYear: "1986", isCurrent: true, description: "x" },
        { albumId: "album-2", title: "True Blue", releaseYear: "1986", isCurrent: false, description: "x" }
      ]);
    }
  });

  it("merges Spotify-only discography entries into the timeline, without a local albumId, deduping against already-known albums", async () => {
    const deps = buildDeps({
      findArtistDiscography: vi.fn().mockResolvedValue([
        { title: "Control", releaseYear: "1986", externalId: "spotify-control" },
        { title: "Rhythm Nation 1814", releaseYear: "1989", externalId: "spotify-rn1814" }
      ])
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.otherAlbumsByArtist).toEqual([
        { albumId: "album-1", title: "Control", releaseYear: "1986", isCurrent: true, description: "x" },
        {
          title: "Rhythm Nation 1814",
          releaseYear: "1989",
          isCurrent: false,
          description: null,
          externalId: "spotify-rn1814",
          query: "Janet Jackson Rhythm Nation 1814"
        }
      ]);
    }
  });

  it("returns just the current album, marked isCurrent, when the artist has no other known albums", async () => {
    const deps = buildDeps();

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.otherAlbumsByArtist).toEqual([
        { albumId: "album-1", title: "Control", releaseYear: "1986", isCurrent: true, description: "x" }
      ]);
    }
  });

  it("populates the header's hook from the album's own published narrative, null when none exists", async () => {
    const deps = buildDeps();
    const result = await assembleAlbumContext("album-1", deps as never);
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.header.hook).toBe("x");
    }

    const noHookDeps = buildDeps({
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
        findStatementsByArticleId: vi.fn(),
        createPending: vi.fn().mockResolvedValue({ id: "new", status: "pending" }),
        publish: vi.fn().mockResolvedValue({ id: "new", status: "published" }),
        markFailedValidation: vi.fn()
      }
    });
    const noHookResult = await assembleAlbumContext("album-1", noHookDeps as never);
    if (noHookResult.state === "ready") {
      expect(noHookResult.body.header.hook).toBeNull();
    }
  });

  it("returns existing credits without re-persisting when they already exist", async () => {
    const existingCredits = [{ id: "credit-1", album_id: "album-1", person_name: "Jimmy Jam", role: "Producer", source_id: "s1" }];
    const persistCredits = vi.fn();
    const deps = buildDeps({ findCredits: vi.fn().mockResolvedValue(existingCredits), persistCredits });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(persistCredits).not.toHaveBeenCalled();
    if (result.state === "ready") {
      expect(result.body.credits).toEqual(existingCredits);
    }
  });

  it("persists credits found during first-ever ingestion, and returns them in the body", async () => {
    const rawCredits = [{ personName: "Jimmy Jam", role: "Producer", source: { providerName: "discography", url: "x", retrievedAt: "now" } }];
    const persistedCredits = [{ id: "credit-1", album_id: "album-1", person_name: "Jimmy Jam", role: "Producer", source_id: "s1" }];
    const persistCredits = vi.fn().mockResolvedValue(persistedCredits);
    const deps = buildDeps({
      findCredits: vi.fn().mockResolvedValue([]),
      persistCredits,
      narrativeArticles: {
        findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
        findStatementsByArticleId: vi.fn(),
        createPending: vi.fn().mockImplementation((_albumId, facet) => Promise.resolve({ id: `new-${facet}`, facet, status: "pending" })),
        publish: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: "published" })),
        markFailedValidation: vi.fn()
      },
      ingestAlbum: vi.fn().mockResolvedValue({
        contextFacts: [],
        credits: rawCredits,
        tracks: [],
        performanceRecords: [],
        artistProfile: { summary: null, influencedBy: [], influenced: [] }
      })
    });
    deps.gptClient.complete = vi.fn().mockResolvedValue(
      JSON.stringify({ statements: [{ text: "Novo texto narrativo.", kind: "fact", sourceIds: [] }] })
    );

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(persistCredits).toHaveBeenCalledWith("album-1", rawCredits);
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.credits).toEqual(persistedCredits);
    }
  });

  it("assembles performance as null when no records exist, and populates header/curiosities/influence", async () => {
    const deps = buildDeps({
      findCuriosities: vi.fn().mockResolvedValue([{ id: "c1", summary: "x", status: "unconfirmed" }]),
      findInfluences: vi.fn().mockResolvedValue([{ id: "i1", to_album_id: "album-2", explanation: "x" }])
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.performance).toBeNull();
      expect(result.body.header).toEqual(expect.objectContaining({ title: "Control", artist: "Janet Jackson" }));
      expect(result.body.curiosities).toHaveLength(1);
      expect(result.body.influence).toHaveLength(1);
    }
  });

  it("derives and persists fresh recommendations when none exist yet", async () => {
    const trueBlue = { id: "album-2", title: "True Blue", releaseDate: new Date("1986-06-30"), genre: "Pop" };
    const deps = buildDeps({
      findRecommendationCandidates: vi.fn().mockResolvedValue([trueBlue])
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    expect(deps.recommendations.create).toHaveBeenCalledWith(
      expect.objectContaining({ subject_album_id: "album-1", recommended_album_id: "album-2", reason: "same_era" })
    );
    if (result.state === "ready") {
      expect(result.body.recommendations).toEqual([
        expect.objectContaining({ albumId: "album-2", reason: "same_era", title: "Control", artistName: "Janet Jackson" })
      ]);
    }
  });

  it("reuses previously persisted recommendations without deriving them again", async () => {
    const deps = buildDeps({
      recommendations: {
        findBySubjectAlbumId: vi
          .fn()
          .mockResolvedValue([{ id: "rec-1", subject_album_id: "album-1", recommended_album_id: "album-2", reason: "same_era", explanation: "x" }]),
        create: vi.fn()
      }
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(deps.recommendations.create).not.toHaveBeenCalled();
    if (result.state === "ready") {
      expect(result.body.recommendations).toHaveLength(1);
    }
  });
});
