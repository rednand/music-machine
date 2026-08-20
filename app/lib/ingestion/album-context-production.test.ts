import { describe, expect, it, vi } from "vitest";
import {
  findArtistDiscographyForProduction,
  findSameEraAlbumsForProduction,
  persistCuriositiesForProduction,
  persistInfluenceForProduction,
  resolveRealSourceId
} from "./album-context-production";
import type { SourceExcerptRef } from "./album-context";
import { createAlbumRepository } from "../db/album";
import { createCuriosityRepository } from "../db/curiosity";
import { createInfluenceRepository } from "../db/influence";
import { createSourceRepository } from "../db/source";
import { toSupabaseLike } from "../db/supabase-like";
import { createFakeSupabase, type FakeSupabaseTables } from "../db/test-helpers";

describe("findSameEraAlbumsForProduction", () => {
  it("returns the album id, title, artist name, and release year for each same-era match", async () => {
    const tables: FakeSupabaseTables = {
      artists: [{ id: "artist-2", name: "Madonna", slug: "madonna" }],
      albums: [
        { id: "album-1", artist_id: "artist-1", title: "Control", slug: "control", release_date: "1986-02-04" },
        { id: "album-2", artist_id: "artist-2", title: "True Blue", slug: "true-blue", release_date: "1986-06-30" }
      ]
    };
    const supabase = createFakeSupabase(tables);
    const albumRepo = createAlbumRepository(toSupabaseLike(supabase as never));
    const subject = { id: "album-1", artist_id: "artist-1", title: "Control", slug: "control", release_date: "1986-02-04" };

    const result = await findSameEraAlbumsForProduction(subject, albumRepo);

    expect(result).toEqual([
      { albumId: "album-2", title: "True Blue", artistName: "Madonna", releaseYear: "1986" }
    ]);
  });
});

describe("findArtistDiscographyForProduction", () => {
  const madonna = { id: "artist-row-1", name: "Madonna", slug: "madonna" };

  function fakeCache(cached: unknown = null) {
    return { findByArtistId: vi.fn().mockResolvedValue(cached), save: vi.fn() };
  }

  function fakeAlbumRepo() {
    return { setArtistSpotifyId: vi.fn() };
  }

  it("returns the cached discography without calling Spotify at all", async () => {
    const cached = [{ title: "True Blue", releaseYear: "1986", externalId: "album-original" }];
    const cache = fakeCache(cached);
    const catalog = { searchArtist: vi.fn(), fetchArtistAlbums: vi.fn() };
    const albumRepo = fakeAlbumRepo();

    const result = await findArtistDiscographyForProduction(madonna, catalog as never, albumRepo as never, cache as never);

    expect(result).toEqual(cached);
    expect(catalog.searchArtist).not.toHaveBeenCalled();
    expect(catalog.fetchArtistAlbums).not.toHaveBeenCalled();
  });

  it("returns an empty array when the artist can't be resolved on Spotify", async () => {
    const cache = fakeCache();
    const catalog = { searchArtist: vi.fn().mockResolvedValue(null), fetchArtistAlbums: vi.fn() };
    const albumRepo = fakeAlbumRepo();

    const result = await findArtistDiscographyForProduction(madonna, catalog as never, albumRepo as never, cache as never);

    expect(result).toEqual([]);
    expect(catalog.fetchArtistAlbums).not.toHaveBeenCalled();
    expect(cache.save).not.toHaveBeenCalled();
  });

  it("returns an empty array without caching when Spotify fails to fetch the albums (e.g. rate limited), so the next visit retries", async () => {
    const cache = fakeCache();
    const catalog = { searchArtist: vi.fn().mockResolvedValue("spotify-artist-1"), fetchArtistAlbums: vi.fn().mockResolvedValue(null) };
    const albumRepo = fakeAlbumRepo();

    const result = await findArtistDiscographyForProduction(madonna, catalog as never, albumRepo as never, cache as never);

    expect(result).toEqual([]);
    expect(cache.save).not.toHaveBeenCalled();
  });

  it("dedupes reissues/remasters by normalized title, keeping the earliest release date, and caches the result", async () => {
    const cache = fakeCache();
    const catalog = {
      searchArtist: vi.fn().mockResolvedValue("spotify-artist-1"),
      fetchArtistAlbums: vi.fn().mockResolvedValue([
        { title: "True Blue", externalId: "album-original", artistName: "Madonna", releaseDate: "1986-06-30", source: { providerName: "catalog", url: "x", retrievedAt: "now" } },
        { title: "True Blue (Remastered)", externalId: "album-remaster", artistName: "Madonna", releaseDate: "2001-01-01", source: { providerName: "catalog", url: "x", retrievedAt: "now" } },
        { title: "Like a Prayer", externalId: "album-2", artistName: "Madonna", releaseDate: "1989-03-21", source: { providerName: "catalog", url: "x", retrievedAt: "now" } }
      ])
    };
    const albumRepo = fakeAlbumRepo();

    const result = await findArtistDiscographyForProduction(madonna, catalog as never, albumRepo as never, cache as never);

    expect(catalog.searchArtist).toHaveBeenCalledWith("Madonna");
    expect(catalog.fetchArtistAlbums).toHaveBeenCalledWith("spotify-artist-1");
    expect(result).toEqual([
      { title: "True Blue", releaseYear: "1986", externalId: "album-original" },
      { title: "Like a Prayer", releaseYear: "1989", externalId: "album-2" }
    ]);
    expect(cache.save).toHaveBeenCalledWith(madonna.id, result);
  });

  it("sorts the discography chronologically by release year", async () => {
    const cache = fakeCache();
    const catalog = {
      searchArtist: vi.fn().mockResolvedValue("spotify-artist-1"),
      fetchArtistAlbums: vi.fn().mockResolvedValue([
        { title: "MDNA", externalId: "album-2", artistName: "Madonna", releaseDate: "2012-03-23", source: { providerName: "catalog", url: "x", retrievedAt: "now" } },
        { title: "Like a Virgin", externalId: "album-1", artistName: "Madonna", releaseDate: "1984-11-12", source: { providerName: "catalog", url: "x", retrievedAt: "now" } }
      ])
    };
    const albumRepo = fakeAlbumRepo();

    const result = await findArtistDiscographyForProduction(madonna, catalog as never, albumRepo as never, cache as never);

    expect(result.map((entry) => entry.title)).toEqual(["Like a Virgin", "MDNA"]);
  });

  it("persists the resolved Spotify artist id when the artist doesn't have one yet", async () => {
    const cache = fakeCache();
    const catalog = { searchArtist: vi.fn().mockResolvedValue("spotify-artist-1"), fetchArtistAlbums: vi.fn().mockResolvedValue([]) };
    const albumRepo = fakeAlbumRepo();

    await findArtistDiscographyForProduction(madonna, catalog as never, albumRepo as never, cache as never);

    expect(albumRepo.setArtistSpotifyId).toHaveBeenCalledWith(madonna.id, "spotify-artist-1");
  });

  it("reuses the already-known Spotify artist id instead of searching again", async () => {
    const cache = fakeCache();
    const catalog = { searchArtist: vi.fn(), fetchArtistAlbums: vi.fn().mockResolvedValue([]) };
    const albumRepo = fakeAlbumRepo();
    const artistWithSpotifyId = { ...madonna, spotify_artist_id: "spotify-artist-1" };

    await findArtistDiscographyForProduction(artistWithSpotifyId, catalog as never, albumRepo as never, cache as never);

    expect(catalog.searchArtist).not.toHaveBeenCalled();
    expect(catalog.fetchArtistAlbums).toHaveBeenCalledWith("spotify-artist-1");
    expect(albumRepo.setArtistSpotifyId).not.toHaveBeenCalled();
  });
});

describe("resolveRealSourceId", () => {
  it("creates a real source row for a context excerpt and returns its id, not the synthetic excerpt id", async () => {
    const supabase = createFakeSupabase({});
    const sourceRepo = createSourceRepository(supabase as never);
    const sourceRefs: SourceExcerptRef[] = [
      { id: "ctx-0", kind: "context", source: { providerName: "encyclopedia", url: "https://x", retrievedAt: "now" } }
    ];

    const resolved = await resolveRealSourceId("ctx-0", sourceRefs, sourceRepo);

    expect(resolved).not.toBe("ctx-0");
    expect(resolved).toMatch(/^sources-/);
  });

  it("reuses the review's existing source id without creating a new source row", async () => {
    const supabase = createFakeSupabase({});
    const sourceRepo = createSourceRepository(supabase as never);
    const sourceRefs: SourceExcerptRef[] = [{ id: "review-0", kind: "review", sourceId: "existing-source-1" }];

    const resolved = await resolveRealSourceId("review-0", sourceRefs, sourceRepo);

    expect(resolved).toBe("existing-source-1");
  });

  it("throws when no source excerpt matches the cited id", async () => {
    const supabase = createFakeSupabase({});
    const sourceRepo = createSourceRepository(supabase as never);

    await expect(resolveRealSourceId("ctx-99", [], sourceRepo)).rejects.toThrow();
  });

  it("reuses a cached resolution instead of creating a duplicate source row for the same excerpt", async () => {
    const tables: FakeSupabaseTables = {};
    const supabase = createFakeSupabase(tables);
    const sourceRepo = createSourceRepository(supabase as never);
    const sourceRefs: SourceExcerptRef[] = [
      { id: "ctx-0", kind: "context", source: { providerName: "encyclopedia", url: "https://x", retrievedAt: "now" } }
    ];
    const cache = new Map<string, Promise<string>>();

    const [first, second] = await Promise.all([
      resolveRealSourceId("ctx-0", sourceRefs, sourceRepo, cache),
      resolveRealSourceId("ctx-0", sourceRefs, sourceRepo, cache)
    ]);

    expect(first).toBe(second);
    expect(tables["sources"]).toHaveLength(1);
  });
});

describe("persistCuriositiesForProduction", () => {
  it("persists a curiosity with a real uuid-shaped source_id resolved from the context excerpt", async () => {
    const tables: FakeSupabaseTables = {};
    const supabase = createFakeSupabase(tables);
    const curiosityRepo = createCuriosityRepository(supabase as never);
    const admin = toSupabaseLike(supabase);
    const sourceRefs: SourceExcerptRef[] = [
      { id: "ctx-0", kind: "context", source: { providerName: "encyclopedia", url: "https://x", retrievedAt: "now" } }
    ];

    const [created] = await persistCuriositiesForProduction(
      "album-1",
      [{ text: "Fato curioso.", kind: "fact", sourceIds: ["ctx-0"] }],
      sourceRefs,
      curiosityRepo,
      admin
    );

    expect(created.source_id).not.toBe("ctx-0");
    expect(tables["sources"]).toHaveLength(1);
  });

  it("persists the valid items and skips one citing an unknown excerpt, without losing the valid ones", async () => {
    const tables: FakeSupabaseTables = {};
    const supabase = createFakeSupabase(tables);
    const curiosityRepo = createCuriosityRepository(supabase as never);
    const admin = toSupabaseLike(supabase);
    const sourceRefs: SourceExcerptRef[] = [
      { id: "ctx-0", kind: "context", source: { providerName: "encyclopedia", url: "https://x", retrievedAt: "now" } }
    ];
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const created = await persistCuriositiesForProduction(
      "album-1",
      [
        { text: "Fato válido.", kind: "fact", sourceIds: ["ctx-0"] },
        { text: "Fato com citação inventada.", kind: "fact", sourceIds: ["ctx-99"] }
      ],
      sourceRefs,
      curiosityRepo,
      admin
    );

    expect(created).toHaveLength(1);
    expect(created[0].summary).toBe("Fato válido.");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe("persistInfluenceForProduction", () => {
  it("persists an influence relationship reusing an existing review's source_id without creating a new source row", async () => {
    const tables: FakeSupabaseTables = {};
    const supabase = createFakeSupabase(tables);
    const influenceRepo = createInfluenceRepository(supabase as never);
    const admin = toSupabaseLike(supabase);
    const sourceRefs: SourceExcerptRef[] = [{ id: "review-0", kind: "review", sourceId: "existing-source-1" }];

    const [created] = await persistInfluenceForProduction(
      "album-1",
      [{ text: "Influenciou Missy Elliott.", kind: "fact", sourceIds: ["review-0"] }],
      sourceRefs,
      influenceRepo,
      admin
    );

    expect(created.source_id).toBe("existing-source-1");
    expect(created.from_album_id).toBe("album-1");
    expect(tables["sources"] ?? []).toHaveLength(0);
  });
});
