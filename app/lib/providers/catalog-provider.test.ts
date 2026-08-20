import { describe, expect, it, vi } from "vitest";
import { CatalogProvider } from "./catalog-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("CatalogProvider", () => {
  it("searches by artist and album title, enriching results with release date and label", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 14344576,
              title: "Follow The Leader",
              artist: { id: 1327, name: "KoЯn" },
              cover_medium: "https://example.com/cover.jpg",
              nb_tracks: 14
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          release_date: "1998-08-18",
          nb_tracks: 14,
          label: "Immortal/Epic",
          genres: { data: [{ name: "Metal" }] }
        })
      );

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    const results = await provider.searchAlbum({ artistName: "Korn", albumTitle: "Follow The Leader" });

    expect(fetchImpl).toHaveBeenNthCalledWith(1, expect.stringContaining("api.deezer.com/search/album"));
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "https://api.deezer.com/album/14344576");
    expect(results).toEqual([
      expect.objectContaining({
        title: "Follow The Leader",
        externalId: "14344576",
        artistName: "KoЯn",
        releaseDate: "1998-08-18",
        genre: "Metal",
        label: "Immortal/Epic",
        trackCount: 14,
        coverArtUrl: "https://example.com/cover.jpg",
        source: expect.objectContaining({ providerName: "catalog" })
      })
    ]);
  });

  it("returns an empty array when no albums match", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    const results = await provider.searchAlbum({ artistName: "Unknown Artist", albumTitle: "Nothing" });

    expect(results).toEqual([]);
  });

  it("drops a candidate whose album details request fails instead of returning a partial/broken entry", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: [{ id: 1, title: "Broken", artist: { id: 1, name: "X" } }] })
      )
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    const results = await provider.searchAlbum({ artistName: "X", albumTitle: "Broken" });

    expect(results).toEqual([]);
  });

  it("searches by free text without requiring a separate artist/album breakdown", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: 987, title: "Rhythm Nation 1814", artist: { id: 1, name: "Janet Jackson" } }]
        })
      )
      .mockResolvedValueOnce(jsonResponse({ release_date: "1989-09-19", nb_tracks: 20 }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    const results = await provider.searchByText("Janet Jackson Rhythm Nation");

    expect(fetchImpl).toHaveBeenNthCalledWith(1, expect.stringContaining("q=Janet%20Jackson%20Rhythm%20Nation"));
    expect(results).toEqual([
      expect.objectContaining({ title: "Rhythm Nation 1814", externalId: "987", artistName: "Janet Jackson" })
    ]);
  });

  it("returns an empty array when a free-text search matches nothing", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    const results = await provider.searchByText("asdkjhaskjdh nonsense");

    expect(results).toEqual([]);
  });

  it("returns an empty array instead of throwing when the search request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    expect(await provider.searchByText("anything")).toEqual([]);
  });

  it("fetches the tracklist for an already-matched album id", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: [
          { title: "It's On!", track_position: 1, duration: 268 },
          { title: "Freak On a Leash", track_position: 2, duration: 255 }
        ]
      })
    );

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    const results = await provider.fetchTracks("14344576");

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("api.deezer.com/album/14344576/tracks"));
    expect(results).toEqual([
      expect.objectContaining({ title: "It's On!", position: "1", durationSeconds: 268 }),
      expect.objectContaining({ title: "Freak On a Leash", position: "2", durationSeconds: 255 })
    ]);
  });

  it("returns an empty array when the tracks request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchTracks("missing-album")).toEqual([]);
  });

  it("resolves an artist id, preferring the candidate with the most fans over the first match", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: [
          { id: 267400112, nb_fan: 6717 },
          { id: 1327, nb_fan: 2616970 },
          { id: 16648, nb_fan: 8345 }
        ]
      })
    );

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    const artistId = await provider.searchArtist("Korn");

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("api.deezer.com/search/artist"));
    expect(artistId).toBe("1327");
  });

  it("returns null when no artist matches the name search", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    expect(await provider.searchArtist("Some Obscure Act")).toBeNull();
  });

  it("returns null instead of throwing when the artist search request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    expect(await provider.searchArtist("Madonna")).toBeNull();
  });

  it("fetches an artist's full discography, excluding singles", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: [
          { id: 1, title: "Like a Virgin", release_date: "1984-11-12", record_type: "album", artist: { id: 1, name: "Madonna" } },
          { id: 2, title: "A Single", release_date: "1985-01-01", record_type: "single", artist: { id: 1, name: "Madonna" } },
          { id: 3, title: "True Blue", release_date: "1986-06-30", record_type: "album", artist: { id: 1, name: "Madonna" } }
        ]
      })
    );

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    const albums = await provider.fetchArtistAlbums("artist-1");

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("api.deezer.com/artist/artist-1/albums"));
    expect(albums).toEqual([
      expect.objectContaining({ title: "Like a Virgin", externalId: "1", releaseDate: "1984-11-12" }),
      expect.objectContaining({ title: "True Blue", externalId: "3", releaseDate: "1986-06-30" })
    ]);
  });

  it("returns null instead of an empty list when the discography request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }));

    const provider = new CatalogProvider(fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchArtistAlbums("artist-1")).toBeNull();
  });
});
