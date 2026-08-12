import { describe, expect, it, vi } from "vitest";
import { ingestAlbum } from "./ingest-album";

const query = { artistName: "Janet Jackson", albumTitle: "Control" };

describe("ingestAlbum", () => {
  it("aggregates catalog data, credits, tags, and encyclopedia facts from every provider", async () => {
    const catalog = {
      providerName: "catalog",
      searchAlbum: vi.fn().mockResolvedValue([
        {
          title: "Control",
          externalId: "cat-1",
          artistName: "Janet Jackson",
          releaseDate: "1986-02-04",
          trackCount: 9,
          coverArtUrl: "https://example.com/cover.jpg",
          source: { providerName: "catalog", url: "https://catalog.example/x", retrievedAt: "now" }
        }
      ])
    };
    const discography = {
      providerName: "discography",
      fetchCredits: vi.fn().mockResolvedValue([
        { personName: "Jimmy Jam", role: "Producer", source: { providerName: "discography", url: "https://disco.example/x", retrievedAt: "now" } }
      ])
    };
    const popularity = {
      providerName: "popularity",
      fetchTags: vi.fn().mockResolvedValue(["funk", "pop"])
    };
    const encyclopedia = {
      providerName: "encyclopedia",
      fetchContextFacts: vi.fn().mockResolvedValue([
        { text: "Control is Janet Jackson's third studio album.", source: { providerName: "encyclopedia", url: "https://enc.example/x", retrievedAt: "now" } }
      ]),
      fetchPerformanceRecords: vi.fn().mockResolvedValue([
        { kind: "chart_position", label: "Billboard 200", value: "1", source: { providerName: "encyclopedia", url: "https://enc.example/x", retrievedAt: "now" } }
      ])
    };

    const result = await ingestAlbum(query, { catalog, discography, popularity, encyclopedia } as never);

    expect(result.title).toBe("Control");
    expect(result.artistName).toBe("Janet Jackson");
    expect(result.releaseDate).toEqual({ value: "1986-02-04", discrepancy: false });
    expect(result.trackCount).toBe(9);
    expect(result.coverArtUrl).toBe("https://example.com/cover.jpg");
    expect(result.credits).toHaveLength(1);
    expect(result.tags).toEqual(["funk", "pop"]);
    expect(result.contextFacts).toHaveLength(1);
    expect(result.performanceRecords).toHaveLength(1);
  });

  it("still produces a result when some providers return nothing", async () => {
    const catalog = { providerName: "catalog", searchAlbum: vi.fn().mockResolvedValue([]) };
    const discography = { providerName: "discography", fetchCredits: vi.fn().mockResolvedValue([]) };
    const popularity = { providerName: "popularity", fetchTags: vi.fn().mockResolvedValue([]) };
    const encyclopedia = {
      providerName: "encyclopedia",
      fetchContextFacts: vi.fn().mockResolvedValue([]),
      fetchPerformanceRecords: vi.fn().mockResolvedValue([])
    };

    const result = await ingestAlbum(query, { catalog, discography, popularity, encyclopedia } as never);

    expect(result.title).toBe(query.albumTitle);
    expect(result.credits).toEqual([]);
    expect(result.performanceRecords).toEqual([]);
  });
});
