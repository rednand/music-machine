import { describe, expect, it, vi } from "vitest";
import { ingestSingleCandidate, slugify } from "./search-fallback";

function rawAlbum(overrides: Record<string, unknown> = {}) {
  return {
    title: "Rhythm Nation 1814",
    externalId: "cat-2",
    artistName: "Janet Jackson",
    releaseDate: "1989-09-19",
    trackCount: 20,
    coverArtUrl: "https://example.com/rn1814.jpg",
    source: { providerName: "catalog", url: "https://catalog.example/x", retrievedAt: "now" },
    ...overrides
  };
}

describe("slugify", () => {
  it("lowercases, strips accents, and hyphenates", () => {
    expect(slugify("Beyoncé - Renaissance")).toBe("beyonce-renaissance");
  });

  it("trims leading/trailing hyphens produced by punctuation", () => {
    expect(slugify("!!Control!!")).toBe("control");
  });
});

describe("ingestSingleCandidate", () => {
  it("creates a new artist and album from a selected provider candidate", async () => {
    const deps = {
      findArtistByName: vi.fn().mockResolvedValue(null),
      createArtist: vi.fn().mockResolvedValue({ id: "artist-new", name: "Janet Jackson", slug: "janet-jackson" }),
      findAlbumBySlug: vi.fn().mockResolvedValue(null),
      createAlbum: vi.fn().mockResolvedValue({
        id: "album-new",
        artist_id: "artist-new",
        title: "Rhythm Nation 1814",
        slug: "janet-jackson-rhythm-nation-1814",
        release_date: "1989-09-19"
      })
    };

    const result = await ingestSingleCandidate(rawAlbum(), deps);

    expect(deps.createArtist).toHaveBeenCalledWith({ name: "Janet Jackson", slug: "janet-jackson" });
    expect(deps.createAlbum).toHaveBeenCalledWith(
      expect.objectContaining({ artist_id: "artist-new", title: "Rhythm Nation 1814" })
    );
    expect(result?.title).toBe("Rhythm Nation 1814");
  });

  it("reuses an existing artist instead of creating a duplicate", async () => {
    const deps = {
      findArtistByName: vi.fn().mockResolvedValue({ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" }),
      createArtist: vi.fn(),
      findAlbumBySlug: vi.fn().mockResolvedValue(null),
      createAlbum: vi.fn().mockResolvedValue({
        id: "album-new",
        artist_id: "artist-1",
        title: "Rhythm Nation 1814",
        slug: "janet-jackson-rhythm-nation-1814",
        release_date: "1989-09-19"
      })
    };

    await ingestSingleCandidate(rawAlbum(), deps);

    expect(deps.createArtist).not.toHaveBeenCalled();
    expect(deps.createAlbum).toHaveBeenCalledWith(expect.objectContaining({ artist_id: "artist-1" }));
  });

  it("returns the already-existing album instead of creating a duplicate (FR-006)", async () => {
    const existingAlbum = {
      id: "album-existing",
      artist_id: "artist-1",
      title: "Rhythm Nation 1814",
      slug: "janet-jackson-rhythm-nation-1814",
      release_date: "1989-09-19"
    };
    const deps = {
      findArtistByName: vi.fn(),
      createArtist: vi.fn(),
      findAlbumBySlug: vi.fn().mockResolvedValue(existingAlbum),
      createAlbum: vi.fn()
    };

    const result = await ingestSingleCandidate(rawAlbum(), deps);

    expect(result).toEqual(existingAlbum);
    expect(deps.findArtistByName).not.toHaveBeenCalled();
    expect(deps.createAlbum).not.toHaveBeenCalled();
  });

  it("returns null for a candidate missing the minimum required fields", async () => {
    const deps = {
      findArtistByName: vi.fn(),
      createArtist: vi.fn(),
      findAlbumBySlug: vi.fn(),
      createAlbum: vi.fn()
    };

    const result = await ingestSingleCandidate(rawAlbum({ releaseDate: "" }), deps);

    expect(result).toBeNull();
    expect(deps.createAlbum).not.toHaveBeenCalled();
  });
});
