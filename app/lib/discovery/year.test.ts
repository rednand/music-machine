import { describe, expect, it, vi } from "vitest";
import { buildYearPage } from "./year";

function album(overrides: Record<string, unknown> = {}) {
  return {
    id: "album-1",
    artist_id: "artist-1",
    title: "Rhythm Nation 1814",
    slug: "rhythm-nation-1814",
    release_date: "1989-09-19",
    cover_art_url: "https://example.com/cover.jpg",
    ...overrides
  };
}

function buildDeps(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findAlbumsByReleaseYear: vi.fn().mockResolvedValue([]),
    findArtistById: vi.fn().mockResolvedValue(null),
    deriveHook: vi.fn().mockResolvedValue(null),
    findHistoricalEvents: vi.fn().mockResolvedValue([]),
    ...overrides
  };
}

describe("buildYearPage", () => {
  it("returns invalid for a year that isn't exactly 4 digits", async () => {
    const deps = buildDeps();

    expect(await buildYearPage("89", deps as never)).toEqual({ state: "invalid" });
    expect(await buildYearPage("abcd", deps as never)).toEqual({ state: "invalid" });
    expect(deps.findAlbumsByReleaseYear).not.toHaveBeenCalled();
  });

  it("returns invalid for a year outside the plausible release range", async () => {
    const deps = buildDeps();

    expect(await buildYearPage("1899", deps as never)).toEqual({ state: "invalid" });
    expect(await buildYearPage(String(new Date().getFullYear() + 1), deps as never)).toEqual({ state: "invalid" });
  });

  it("builds album entries with the year's artist and hook", async () => {
    const deps = buildDeps({
      findAlbumsByReleaseYear: vi.fn().mockResolvedValue([album()]),
      findArtistById: vi.fn().mockResolvedValue({ id: "artist-1", name: "Janet Jackson" }),
      deriveHook: vi.fn().mockResolvedValue("O disco que redefiniu o new jack swing.")
    });

    const result = await buildYearPage("1989", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.year).toBe("1989");
      expect(result.albums).toEqual([
        expect.objectContaining({
          albumId: "album-1",
          title: "Rhythm Nation 1814",
          artistName: "Janet Jackson",
          releaseYear: "1989",
          hook: "O disco que redefiniu o new jack swing."
        })
      ]);
    }
  });

  it("merges and deduplicates historical events fetched from two points in the year", async () => {
    const deps = buildDeps({
      findHistoricalEvents: vi.fn().mockImplementation((date: string) =>
        Promise.resolve(
          date === "1989-03-01"
            ? [{ title: "Queda do Muro de Berlim", date: "1989-11-09" }]
            : [
                { title: "Queda do Muro de Berlim", date: "1989-11-09" },
                { title: "Massacre da Praça Tiananmen", date: "1989-06-04" }
              ]
        )
      )
    });

    const result = await buildYearPage("1989", deps as never);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.historicalEvents).toHaveLength(2);
      expect(result.historicalEvents.map((e) => e.title)).toEqual([
        "Queda do Muro de Berlim",
        "Massacre da Praça Tiananmen"
      ]);
    }
  });

  it("returns an empty album list and empty events for a valid year with nothing on record", async () => {
    const deps = buildDeps();

    const result = await buildYearPage("1901", deps as never);

    expect(result).toEqual({ state: "ready", year: "1901", albums: [], historicalEvents: [] });
  });
});
