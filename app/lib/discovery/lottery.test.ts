import { describe, expect, it, vi } from "vitest";
import {
  availableDecades,
  availableGenres,
  buildLotteryPool,
  entryDecade,
  filterLotteryPool,
  groupPlacementsIntoPool,
  pickRandom,
  type LotteryCatalogEntry,
  type LotteryPlacementInput
} from "./lottery";

function placement(overrides: Partial<LotteryPlacementInput>): LotteryPlacementInput {
  return {
    list_slug: "rs500",
    list_name: "Rolling Stone's 500 Greatest Albums of All Time",
    position: 1,
    artist_name: "Beyoncé",
    album_title: "Lemonade",
    normalized_artist: "beyonce",
    normalized_title: "lemonade",
    ...overrides
  };
}

describe("groupPlacementsIntoPool", () => {
  it("groups placements for the same album across multiple lists into one entry", () => {
    const placements = [
      placement({ list_slug: "rs500", list_name: "Rolling Stone 500", position: 32 }),
      placement({ list_slug: "apple-music-100", list_name: "Apple Music 100", position: 10 })
    ];

    const pool = groupPlacementsIntoPool(placements, []);

    expect(pool).toHaveLength(1);
    expect(pool[0].artistName).toBe("Beyoncé");
    expect(pool[0].albumTitle).toBe("Lemonade");
    expect(pool[0].placements).toEqual([
      { listName: "Rolling Stone 500", position: 32 },
      { listName: "Apple Music 100", position: 10 }
    ]);
  });

  it("keeps distinct albums as separate entries", () => {
    const placements = [
      placement({ artist_name: "Beyoncé", album_title: "Lemonade", normalized_artist: "beyonce", normalized_title: "lemonade" }),
      placement({ artist_name: "Janet Jackson", album_title: "Control", normalized_artist: "janet jackson", normalized_title: "control" })
    ];

    const pool = groupPlacementsIntoPool(placements, []);

    expect(pool).toHaveLength(2);
  });

  it("attaches albumId, genre and releaseYear when the album is already in the local catalog", () => {
    const placements = [placement({})];
    const catalog: LotteryCatalogEntry[] = [
      { albumId: "album-1", title: "Lemonade", artistName: "Beyoncé", releaseYear: "2016", genre: "R&B" }
    ];

    const pool = groupPlacementsIntoPool(placements, catalog);

    expect(pool[0].albumId).toBe("album-1");
    expect(pool[0].genre).toBe("R&B");
    expect(pool[0].releaseYear).toBe("2016");
  });

  it("leaves albumId, genre and releaseYear null when the album has never been ingested locally", () => {
    const pool = groupPlacementsIntoPool([placement({})], []);

    expect(pool[0].albumId).toBeNull();
    expect(pool[0].genre).toBeNull();
    expect(pool[0].releaseYear).toBeNull();
  });

  it("matches catalog entries despite diacritics and casing differences", () => {
    const placements = [
      placement({ artist_name: "Beyonce", album_title: "LEMONADE", normalized_artist: "beyonce", normalized_title: "lemonade" })
    ];
    const catalog: LotteryCatalogEntry[] = [
      { albumId: "album-1", title: "Lemonade", artistName: "Beyoncé", releaseYear: "2016", genre: "R&B" }
    ];

    const pool = groupPlacementsIntoPool(placements, catalog);

    expect(pool[0].albumId).toBe("album-1");
  });
});

describe("buildLotteryPool", () => {
  it("wires deps together and groups the resulting placements against the catalog", async () => {
    const pool = await buildLotteryPool({
      findAllPlacements: async () => [placement({})],
      findAllAlbums: async () => [
        {
          id: "album-1",
          artist_id: "artist-1",
          title: "Lemonade",
          slug: "beyonce-lemonade",
          release_date: "2016-04-23",
          genre: "R&B"
        }
      ],
      findArtistsByIds: async (ids) => (ids.includes("artist-1") ? [{ id: "artist-1", name: "Beyoncé", slug: "beyonce" }] : [])
    });

    expect(pool).toHaveLength(1);
    expect(pool[0].albumId).toBe("album-1");
    expect(pool[0].genre).toBe("R&B");
    expect(pool[0].releaseYear).toBe("2016");
  });

  it("returns entries with no catalog match when no albums are ingested yet", async () => {
    const pool = await buildLotteryPool({
      findAllPlacements: async () => [placement({})],
      findAllAlbums: async () => [],
      findArtistsByIds: async () => []
    });

    expect(pool[0].albumId).toBeNull();
  });
});

describe("entryDecade", () => {
  it("derives the decade label from the release year", () => {
    expect(entryDecade({ key: "k", artistName: "a", albumTitle: "b", placements: [], albumId: null, genre: null, releaseYear: "1986" })).toBe(
      "1980s"
    );
  });

  it("returns null when there is no release year", () => {
    expect(entryDecade({ key: "k", artistName: "a", albumTitle: "b", placements: [], albumId: null, genre: null, releaseYear: null })).toBeNull();
  });
});

describe("availableGenres / availableDecades", () => {
  it("collects unique, sorted genres and decades from entries that have them", () => {
    const pool = [
      { key: "1", artistName: "a", albumTitle: "b", placements: [], albumId: "1", genre: "Rock", releaseYear: "1996" },
      { key: "2", artistName: "c", albumTitle: "d", placements: [], albumId: "2", genre: "Pop", releaseYear: "1986" },
      { key: "3", artistName: "e", albumTitle: "f", placements: [], albumId: null, genre: null, releaseYear: null },
      { key: "4", artistName: "g", albumTitle: "h", placements: [], albumId: "4", genre: "Rock", releaseYear: "1991" }
    ];

    expect(availableGenres(pool)).toEqual(["Pop", "Rock"]);
    expect(availableDecades(pool)).toEqual(["1980s", "1990s"]);
  });
});

describe("filterLotteryPool", () => {
  const pool = [
    { key: "1", artistName: "a", albumTitle: "b", placements: [], albumId: "1", genre: "Rock", releaseYear: "1996" },
    { key: "2", artistName: "c", albumTitle: "d", placements: [], albumId: "2", genre: "Pop", releaseYear: "1986" },
    { key: "3", artistName: "e", albumTitle: "f", placements: [], albumId: null, genre: null, releaseYear: null }
  ];

  it("returns the full pool when no filter is set", () => {
    expect(filterLotteryPool(pool, null, null)).toHaveLength(3);
  });

  it("filters by genre only", () => {
    expect(filterLotteryPool(pool, "Rock", null).map((e) => e.key)).toEqual(["1"]);
  });

  it("filters by decade only", () => {
    expect(filterLotteryPool(pool, null, "1980s").map((e) => e.key)).toEqual(["2"]);
  });

  it("combines genre and decade filters", () => {
    expect(filterLotteryPool(pool, "Rock", "1990s").map((e) => e.key)).toEqual(["1"]);
    expect(filterLotteryPool(pool, "Rock", "1980s")).toHaveLength(0);
  });

  it("excludes entries with no local catalog match once any filter is active", () => {
    expect(filterLotteryPool(pool, "Rock", null).some((e) => e.key === "3")).toBe(false);
  });
});

describe("pickRandom", () => {
  it("returns null for an empty list", () => {
    expect(pickRandom([])).toBeNull();
  });

  it("returns an item from the list", () => {
    const items = ["a", "b", "c"];
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(pickRandom(items)).toBe("b");
    spy.mockRestore();
  });
});
