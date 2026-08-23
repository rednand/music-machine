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
      ]),
      fetchArtistProfile: vi.fn().mockResolvedValue({
        summary: { text: "Janet Jackson is an American singer.", source: { providerName: "encyclopedia", url: "https://enc.example/artist", retrievedAt: "now" } },
        influencedBy: ["Sly and the Family Stone"],
        influenced: ["Missy Elliott"]
      })
    };
    const musicbrainz = { providerName: "musicbrainz", fetchOriginalReleaseDate: vi.fn().mockResolvedValue(null) };

    const result = await ingestAlbum(query, { catalog, discography, popularity, encyclopedia, musicbrainz } as never);

    expect(result.title).toBe("Control");
    expect(result.artistName).toBe("Janet Jackson");
    expect(result.releaseDate).toEqual({ value: "1986-02-04", discrepancy: false });
    expect(result.trackCount).toBe(9);
    expect(result.coverArtUrl).toBe("https://example.com/cover.jpg");
    expect(result.credits).toHaveLength(1);
    expect(result.tags).toEqual(["funk", "pop"]);
    expect(result.contextFacts).toHaveLength(1);
    expect(result.performanceRecords).toHaveLength(1);
    expect(result.externalId).toBe("cat-1");
    expect(encyclopedia.fetchArtistProfile).toHaveBeenCalledWith("Janet Jackson");
    expect(result.artistProfile.influencedBy).toEqual(["Sly and the Family Stone"]);
    expect(result.artistProfile.influenced).toEqual(["Missy Elliott"]);
  });

  it("still produces a result when some providers return nothing", async () => {
    const catalog = {
      providerName: "catalog",
      searchAlbum: vi.fn().mockResolvedValue([])
    };
    const discography = {
      providerName: "discography",
      fetchCredits: vi.fn().mockResolvedValue([])
    };
    const popularity = { providerName: "popularity", fetchTags: vi.fn().mockResolvedValue([]) };
    const encyclopedia = {
      providerName: "encyclopedia",
      fetchContextFacts: vi.fn().mockResolvedValue([]),
      fetchPerformanceRecords: vi.fn().mockResolvedValue([]),
      fetchArtistProfile: vi.fn().mockResolvedValue({ summary: null, influencedBy: [], influenced: [] })
    };
    const musicbrainz = { providerName: "musicbrainz", fetchOriginalReleaseDate: vi.fn().mockResolvedValue(null) };

    const result = await ingestAlbum(query, { catalog, discography, popularity, encyclopedia, musicbrainz } as never);

    expect(result.title).toBe(query.albumTitle);
    expect(result.credits).toEqual([]);
    expect(result.performanceRecords).toEqual([]);
    expect(result.externalId).toBeUndefined();
    expect(result.artistProfile).toEqual({ summary: null, influencedBy: [], influenced: [] });
  });

  it("prefers MusicBrainz's original release date when it predates a catalog reissue's date", async () => {
    const catalog = {
      providerName: "catalog",
      searchAlbum: vi.fn().mockResolvedValue([
        {
          title: "Fallen",
          externalId: "cat-1",
          artistName: "Evanescence",
          releaseDate: "2014-06-24",
          source: { providerName: "catalog", url: "https://catalog.example/x", retrievedAt: "now" }
        }
      ])
    };
    const discography = { providerName: "discography", fetchCredits: vi.fn().mockResolvedValue([]) };
    const popularity = { providerName: "popularity", fetchTags: vi.fn().mockResolvedValue([]) };
    const encyclopedia = {
      providerName: "encyclopedia",
      fetchContextFacts: vi.fn().mockResolvedValue([]),
      fetchPerformanceRecords: vi.fn().mockResolvedValue([]),
      fetchArtistProfile: vi.fn().mockResolvedValue({ summary: null, influencedBy: [], influenced: [] })
    };
    const musicbrainz = {
      providerName: "musicbrainz",
      fetchOriginalReleaseDate: vi.fn().mockResolvedValue("2003-03-04")
    };

    const result = await ingestAlbum(
      { artistName: "Evanescence", albumTitle: "Fallen" },
      { catalog, discography, popularity, encyclopedia, musicbrainz } as never
    );

    expect(result.releaseDate.value).toBe("2003-03-04");
  });

  it("keeps the catalog's release date when MusicBrainz has no earlier date", async () => {
    const catalog = {
      providerName: "catalog",
      searchAlbum: vi.fn().mockResolvedValue([
        {
          title: "Control",
          externalId: "cat-1",
          artistName: "Janet Jackson",
          releaseDate: "1986-02-04",
          source: { providerName: "catalog", url: "https://catalog.example/x", retrievedAt: "now" }
        }
      ])
    };
    const discography = { providerName: "discography", fetchCredits: vi.fn().mockResolvedValue([]) };
    const popularity = { providerName: "popularity", fetchTags: vi.fn().mockResolvedValue([]) };
    const encyclopedia = {
      providerName: "encyclopedia",
      fetchContextFacts: vi.fn().mockResolvedValue([]),
      fetchPerformanceRecords: vi.fn().mockResolvedValue([]),
      fetchArtistProfile: vi.fn().mockResolvedValue({ summary: null, influencedBy: [], influenced: [] })
    };
    const musicbrainz = {
      providerName: "musicbrainz",
      fetchOriginalReleaseDate: vi.fn().mockResolvedValue("1986-06-30")
    };

    const result = await ingestAlbum(
      query,
      { catalog, discography, popularity, encyclopedia, musicbrainz } as never
    );

    expect(result.releaseDate.value).toBe("1986-02-04");
  });
});
