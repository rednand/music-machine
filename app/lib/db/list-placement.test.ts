import { describe, expect, it } from "vitest";
import { normalizeForMatch, createListPlacementRepository } from "./list-placement";
import { createFakeSupabase } from "./test-helpers";

describe("normalizeForMatch", () => {
  it("lowercases, strips accents, and collapses punctuation to single spaces", () => {
    expect(normalizeForMatch("Sinéad O'Connor")).toBe("sinead o connor");
    expect(normalizeForMatch("Björk")).toBe("bjork");
    expect(normalizeForMatch("What's Going On")).toBe("what s going on");
  });

  it("trims surrounding whitespace produced by punctuation stripping", () => {
    expect(normalizeForMatch("  (Heroes)  ")).toBe("heroes");
  });
});

describe("createListPlacementRepository", () => {
  it("finds every list placement matching the normalized artist and title", async () => {
    const supabase = createFakeSupabase({
      list_placements: [
        {
          id: "1",
          list_slug: "rs500",
          list_name: "Rolling Stone's 500 Greatest Albums of All Time",
          position: 78,
          artist_name: "Beyoncé",
          album_title: "Renaissance",
          normalized_artist: "beyonce",
          normalized_title: "renaissance"
        },
        {
          id: "2",
          list_slug: "apple-music-100",
          list_name: "Apple Music: 100 Best Albums",
          position: 10,
          artist_name: "Beyoncé",
          album_title: "Lemonade",
          normalized_artist: "beyonce",
          normalized_title: "lemonade"
        }
      ]
    });
    const repo = createListPlacementRepository(supabase as never);

    const results = await repo.findByAlbum("Beyoncé", "Renaissance");

    expect(results).toEqual([
      expect.objectContaining({ list_slug: "rs500", position: 78 })
    ]);
  });

  it("returns an empty array when the album is on no list", async () => {
    const supabase = createFakeSupabase({ list_placements: [] });
    const repo = createListPlacementRepository(supabase as never);

    expect(await repo.findByAlbum("Unknown Artist", "Unknown Album")).toEqual([]);
  });

  it("findAll returns every placement across every list", async () => {
    const supabase = createFakeSupabase({
      list_placements: [
        {
          id: "1",
          list_slug: "rs500",
          list_name: "Rolling Stone's 500 Greatest Albums of All Time",
          position: 78,
          artist_name: "Beyoncé",
          album_title: "Renaissance",
          normalized_artist: "beyonce",
          normalized_title: "renaissance"
        },
        {
          id: "2",
          list_slug: "apple-music-100",
          list_name: "Apple Music: 100 Best Albums",
          position: 10,
          artist_name: "Beyoncé",
          album_title: "Lemonade",
          normalized_artist: "beyonce",
          normalized_title: "lemonade"
        }
      ]
    });
    const repo = createListPlacementRepository(supabase as never);

    expect(await repo.findAll()).toHaveLength(2);
  });
});
