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
    findCredits: vi.fn().mockResolvedValue([]),
    persistCredits: vi.fn().mockResolvedValue([]),
    findAlbumsByArtistId: vi.fn().mockResolvedValue([album]),
    findPerformanceRecords: vi.fn().mockResolvedValue([]),
    findReviews: vi.fn().mockResolvedValue([]),
    findCuriosities: vi.fn().mockResolvedValue([]),
    findInfluences: vi.fn().mockResolvedValue([]),
    findSameEraAlbums: vi.fn().mockResolvedValue([{ title: "True Blue", artistName: "Madonna" }]),
    findHistoricalEvents: vi.fn().mockResolvedValue([]),
    ingestAlbum: vi.fn().mockResolvedValue({
      contextFacts: [{ text: "Control is Janet Jackson's third studio album.", source: { providerName: "encyclopedia", url: "x", retrievedAt: "now" } }],
      credits: []
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
    expect(deps.gptClient.complete).toHaveBeenCalledTimes(4);
    expect(deps.narrativeArticles.publish).toHaveBeenCalledTimes(4);
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
    expect(publish).toHaveBeenCalledTimes(3);
    if (result.state === "ready") {
      expect(result.body.worldContext).toEqual([]);
      expect(result.body.artistMoment).toHaveLength(1);
    }
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
    expect(deps.gptClient.complete).toHaveBeenCalledTimes(3);
    expect(findStatementsByArticleId).toHaveBeenCalledWith("article-artist_moment");
    expect(publish).not.toHaveBeenCalledWith("article-artist_moment", expect.anything());
    if (result.state === "ready") {
      expect(result.body.artistMoment).toEqual([expect.objectContaining({ text: "Já publicado." })]);
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

  it("populates otherAlbumsByArtist with the artist's other albums, excluding the current one", async () => {
    const trueBlue = { id: "album-2", artist_id: "artist-1", title: "True Blue", slug: "true-blue", release_date: "1986-06-30" };
    const deps = buildDeps({
      findAlbumsByArtistId: vi.fn().mockResolvedValue([album, trueBlue])
    });

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.otherAlbumsByArtist).toEqual([
        { albumId: "album-2", title: "True Blue", releaseYear: "1986" }
      ]);
    }
  });

  it("returns an empty otherAlbumsByArtist array when the artist has no other known albums", async () => {
    const deps = buildDeps();

    const result = await assembleAlbumContext("album-1", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.otherAlbumsByArtist).toEqual([]);
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
      ingestAlbum: vi.fn().mockResolvedValue({ contextFacts: [], credits: rawCredits })
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
        expect.objectContaining({ recommended_album_id: "album-2", reason: "same_era" })
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
