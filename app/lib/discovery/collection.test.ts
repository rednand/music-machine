import { describe, expect, it, vi } from "vitest";
import { buildDiscoveryPage, shuffleEntries } from "./collection";
import type { DiscoveryPageEntry } from "./collection";

function album(overrides: Record<string, unknown> = {}) {
  return {
    id: "album-1",
    artist_id: "artist-1",
    title: "True Blue",
    slug: "true-blue",
    release_date: "1986-06-30",
    cover_art_url: "https://example.com/cover.jpg",
    ...overrides
  };
}

describe("buildDiscoveryPage", () => {
  it("returns the empty state when the catalog has zero albums", async () => {
    const deps = {
      findAlbumsOrderedByCreatedAt: vi.fn().mockResolvedValue([]),
      findArtistsByIds: vi.fn(),
      deriveHooksBatch: vi.fn()
    };

    expect(await buildDiscoveryPage(deps)).toEqual({ state: "empty" });
    expect(deps.findArtistsByIds).not.toHaveBeenCalled();
    expect(deps.deriveHooksBatch).not.toHaveBeenCalled();
  });

  it("builds a featured entry and a collection including it, in the given order", async () => {
    const deps = {
      findAlbumsOrderedByCreatedAt: vi.fn().mockResolvedValue([
        album({ id: "album-2", title: "True Blue" }),
        album({ id: "album-1", title: "Control", release_date: "1986-02-04" })
      ]),
      findArtistsByIds: vi.fn().mockResolvedValue([
        { id: "artist-1", name: "Madonna" },
        { id: "artist-2", name: "Janet Jackson" }
      ]),
      deriveHooksBatch: vi
        .fn()
        .mockResolvedValue(new Map([["album-1", "O disco em que a estrela pop virou autora."], ["album-2", null]]))
    };

    const result = await buildDiscoveryPage(deps);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.featured.albumId).toBe("album-2");
      expect(result.collection.map((entry) => entry.albumId)).toEqual(["album-2", "album-1"]);
      expect(result.collection[0]).toEqual(result.featured);
      expect(result.featured.releaseYear).toBe("1986");
      expect(result.collection[1].hook).toBe("O disco em que a estrela pop virou autora.");
    }
  });

  it("fetches artists and hooks in a single batched call each, not once per album", async () => {
    const deps = {
      findAlbumsOrderedByCreatedAt: vi.fn().mockResolvedValue([album({ id: "album-1" }), album({ id: "album-2" })]),
      findArtistsByIds: vi.fn().mockResolvedValue([{ id: "artist-1", name: "Madonna" }]),
      deriveHooksBatch: vi.fn().mockResolvedValue(new Map())
    };

    await buildDiscoveryPage(deps);

    expect(deps.findArtistsByIds).toHaveBeenCalledTimes(1);
    expect(deps.findArtistsByIds).toHaveBeenCalledWith(["artist-1"]);
    expect(deps.deriveHooksBatch).toHaveBeenCalledTimes(1);
    expect(deps.deriveHooksBatch).toHaveBeenCalledWith(["album-1", "album-2"]);
  });

  it("renders a single-album catalog as both the featured entry and the sole collection entry", async () => {
    const deps = {
      findAlbumsOrderedByCreatedAt: vi.fn().mockResolvedValue([album()]),
      findArtistsByIds: vi.fn().mockResolvedValue([{ id: "artist-1", name: "Madonna" }]),
      deriveHooksBatch: vi.fn().mockResolvedValue(new Map())
    };

    const result = await buildDiscoveryPage(deps);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.collection).toHaveLength(1);
      expect(result.featured).toEqual(result.collection[0]);
    }
  });

  it("sets hook to null and still renders the entry when the album has no usable narrative yet", async () => {
    const deps = {
      findAlbumsOrderedByCreatedAt: vi.fn().mockResolvedValue([album()]),
      findArtistsByIds: vi.fn().mockResolvedValue([{ id: "artist-1", name: "Madonna" }]),
      deriveHooksBatch: vi.fn().mockResolvedValue(new Map())
    };

    const result = await buildDiscoveryPage(deps);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.collection[0].hook).toBeNull();
      expect(result.collection[0].title).toBe("True Blue");
    }
  });

  it("still renders an entry when the artist has no resolvable name", async () => {
    const deps = {
      findAlbumsOrderedByCreatedAt: vi.fn().mockResolvedValue([album()]),
      findArtistsByIds: vi.fn().mockResolvedValue([]),
      deriveHooksBatch: vi.fn().mockResolvedValue(new Map())
    };

    const result = await buildDiscoveryPage(deps);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.collection[0]).toEqual(expect.objectContaining({ artistName: "", title: "True Blue" }));
    }
  });
});

describe("shuffleEntries", () => {
  function entry(albumId: string): DiscoveryPageEntry {
    return { albumId, title: albumId, artistName: "Artist", releaseYear: "1999", hook: null };
  }

  it("returns the requested number of entries, all sourced from the collection", () => {
    const collection = [entry("a"), entry("b"), entry("c"), entry("d"), entry("e")];

    const result = shuffleEntries(collection, 3);

    expect(result).toHaveLength(3);
    expect(new Set(result.map((r) => r.albumId)).size).toBe(3);
    result.forEach((r) => expect(collection).toContainEqual(r));
  });

  it("does not mutate the original collection", () => {
    const collection = [entry("a"), entry("b"), entry("c")];
    const original = [...collection];

    shuffleEntries(collection, 2);

    expect(collection).toEqual(original);
  });

  it("caps the result at the collection size when count exceeds it", () => {
    const collection = [entry("a"), entry("b")];

    const result = shuffleEntries(collection, 4);

    expect(result).toHaveLength(2);
  });

  it("shuffles the whole collection when count is omitted", () => {
    const collection = [entry("a"), entry("b"), entry("c")];

    const result = shuffleEntries(collection);

    expect(result).toHaveLength(3);
    expect(new Set(result.map((r) => r.albumId))).toEqual(new Set(["a", "b", "c"]));
  });

  it("can select different subsets across calls", () => {
    const collection = Array.from({ length: 20 }, (_, i) => entry(`album-${i}`));
    const randomSpy = vi.spyOn(Math, "random");

    randomSpy.mockReturnValue(0);
    const first = shuffleEntries(collection, 4).map((e) => e.albumId);

    randomSpy.mockReturnValue(0.99);
    const second = shuffleEntries(collection, 4).map((e) => e.albumId);

    expect(first).not.toEqual(second);

    randomSpy.mockRestore();
  });
});
