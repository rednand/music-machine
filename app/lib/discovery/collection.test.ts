import { describe, expect, it, vi } from "vitest";
import { buildDiscoveryPage } from "./collection";

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
      findArtistById: vi.fn(),
      deriveHook: vi.fn()
    };

    expect(await buildDiscoveryPage(deps)).toEqual({ state: "empty" });
  });

  it("builds a featured entry and a collection including it, in the given order", async () => {
    const deps = {
      findAlbumsOrderedByCreatedAt: vi.fn().mockResolvedValue([
        album({ id: "album-2", title: "True Blue" }),
        album({ id: "album-1", title: "Control", release_date: "1986-02-04" })
      ]),
      findArtistById: vi.fn().mockImplementation((artistId: string) =>
        Promise.resolve({ id: artistId, name: artistId === "artist-1" ? "Madonna" : "Janet Jackson" })
      ),
      deriveHook: vi.fn().mockResolvedValue("O disco em que a estrela pop virou autora.")
    };

    const result = await buildDiscoveryPage(deps);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.featured.albumId).toBe("album-2");
      expect(result.collection.map((entry) => entry.albumId)).toEqual(["album-2", "album-1"]);
      expect(result.collection[0]).toEqual(result.featured);
      expect(result.featured.releaseYear).toBe("1986");
      expect(result.featured.hook).toBe("O disco em que a estrela pop virou autora.");
    }
  });

  it("renders a single-album catalog as both the featured entry and the sole collection entry", async () => {
    const deps = {
      findAlbumsOrderedByCreatedAt: vi.fn().mockResolvedValue([album()]),
      findArtistById: vi.fn().mockResolvedValue({ id: "artist-1", name: "Madonna" }),
      deriveHook: vi.fn().mockResolvedValue(null)
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
      findArtistById: vi.fn().mockResolvedValue({ id: "artist-1", name: "Madonna" }),
      deriveHook: vi.fn().mockResolvedValue(null)
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
      findArtistById: vi.fn().mockResolvedValue(null),
      deriveHook: vi.fn().mockResolvedValue(null)
    };

    const result = await buildDiscoveryPage(deps);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.collection[0]).toEqual(expect.objectContaining({ artistName: "", title: "True Blue" }));
    }
  });
});
