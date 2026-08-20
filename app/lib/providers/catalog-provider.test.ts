import { describe, expect, it, vi } from "vitest";
import { CatalogProvider } from "./catalog-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("CatalogProvider", () => {
  const config = { clientId: "client-id", clientSecret: "client-secret" };

  it("authenticates via client-credentials flow before searching", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          albums: {
            items: [
              {
                id: "catalog-album-1",
                name: "Control",
                release_date: "1986-02-04",
                images: [{ url: "https://example.com/cover.jpg" }],
                artists: [{ name: "Janet Jackson" }],
                total_tracks: 9
              }
            ]
          }
        })
      );

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const results = await provider.searchAlbum({ artistName: "Janet Jackson", albumTitle: "Control" });

    expect(fetchImpl).toHaveBeenNthCalledWith(1, "https://accounts.spotify.com/api/token", expect.anything());
    expect(fetchImpl).toHaveBeenNthCalledWith(2, expect.stringContaining("api.spotify.com/v1/search"), expect.anything());
    expect(results).toEqual([
      expect.objectContaining({
        title: "Control",
        externalId: "catalog-album-1",
        artistName: "Janet Jackson",
        releaseDate: "1986-02-04",
        trackCount: 9,
        coverArtUrl: "https://example.com/cover.jpg",
        source: expect.objectContaining({ providerName: "catalog" })
      })
    ]);
  });

  it("reuses a cached access token across multiple calls within its expiry window", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ albums: { items: [] } }))
      .mockResolvedValueOnce(jsonResponse({ albums: { items: [] } }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    await provider.searchAlbum({ artistName: "Janet Jackson", albumTitle: "Control" });
    await provider.searchAlbum({ artistName: "Janet Jackson", albumTitle: "Rhythm Nation" });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("returns an empty array when no albums match", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ albums: { items: [] } }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const results = await provider.searchAlbum({ artistName: "Unknown Artist", albumTitle: "Nothing" });

    expect(results).toEqual([]);
  });

  it("searches by free text without requiring a separate artist/album breakdown", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          albums: {
            items: [
              {
                id: "catalog-album-2",
                name: "Rhythm Nation 1814",
                release_date: "1989-09-19",
                images: [{ url: "https://example.com/rn1814.jpg" }],
                artists: [{ name: "Janet Jackson" }],
                total_tracks: 20
              }
            ]
          }
        })
      );

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const results = await provider.searchByText("Janet Jackson Rhythm Nation");

    expect(fetchImpl).toHaveBeenNthCalledWith(2, expect.stringContaining("api.spotify.com/v1/search"), expect.anything());
    expect(fetchImpl.mock.calls[1][0]).not.toContain("album:");
    expect(results).toEqual([
      expect.objectContaining({
        title: "Rhythm Nation 1814",
        externalId: "catalog-album-2",
        artistName: "Janet Jackson"
      })
    ]);
  });

  it("returns an empty array when a free-text search matches nothing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ albums: { items: [] } }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const results = await provider.searchByText("asdkjhaskjdh nonsense");

    expect(results).toEqual([]);
  });

  it("fetches the tracklist for an already-matched album id", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { name: "Papa Don't Preach", track_number: 1, duration_ms: 268000 },
            { name: "Open Your Heart", track_number: 2, duration_ms: 253000 }
          ]
        })
      );

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const results = await provider.fetchTracks("catalog-album-1");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("api.spotify.com/v1/albums/catalog-album-1/tracks"),
      expect.anything()
    );
    expect(results).toEqual([
      expect.objectContaining({ title: "Papa Don't Preach", position: "1", durationSeconds: 268 }),
      expect.objectContaining({ title: "Open Your Heart", position: "2", durationSeconds: 253 })
    ]);
  });

  it("returns an empty array when the album has no tracks", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const results = await provider.fetchTracks("catalog-album-1");

    expect(results).toEqual([]);
  });

  it("resolves an artist's Spotify id from a name search", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ artists: { items: [{ id: "artist-1" }] } }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const artistId = await provider.searchArtist("Madonna");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("api.spotify.com/v1/search?type=artist&q=Madonna"),
      expect.anything()
    );
    expect(artistId).toBe("artist-1");
  });

  it("returns null when no artist matches the name search", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ artists: { items: [] } }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.searchArtist("Some Obscure Act")).toBeNull();
  });

  it("returns null instead of throwing when the artist search request fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.searchArtist("Madonna")).toBeNull();
  });

  it("fetches an artist's full discography, following pagination until next is null", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "album-1", name: "Like a Virgin", release_date: "1984-11-12", images: [], artists: [{ name: "Madonna" }] }
          ],
          next: "https://api.spotify.com/v1/artists/artist-1/albums?offset=50&limit=50"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "album-2", name: "True Blue", release_date: "1986-06-30", images: [], artists: [{ name: "Madonna" }] }
          ],
          next: null
        })
      );

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const albums = await provider.fetchArtistAlbums("artist-1");

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("api.spotify.com/v1/artists/artist-1/albums?include_groups=album,compilation"),
      expect.anything()
    );
    expect(albums).toEqual([
      expect.objectContaining({ title: "Like a Virgin", externalId: "album-1", releaseDate: "1984-11-12" }),
      expect.objectContaining({ title: "True Blue", externalId: "album-2", releaseDate: "1986-06-30" })
    ]);
  });

  it("stops following pagination after a bounded number of pages", async () => {
    const page = (id: string) =>
      jsonResponse({
        items: [{ id, name: id, release_date: "2000-01-01", images: [], artists: [{ name: "Prolific Artist" }] }],
        next: "https://api.spotify.com/v1/artists/artist-1/albums?offset=next"
      });

    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }));
    for (let i = 0; i < 20; i++) {
      fetchImpl.mockResolvedValueOnce(page(`a${i}`));
    }

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const albums = await provider.fetchArtistAlbums("artist-1");

    expect(albums).toHaveLength(15);
    expect(fetchImpl).toHaveBeenCalledTimes(16);
  });

  it("returns null instead of an empty list when the very first page request fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const albums = await provider.fetchArtistAlbums("artist-1");

    expect(albums).toBeNull();
  });

  it("returns the albums collected so far when a later page request fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-abc", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "album-1", name: "Like a Virgin", release_date: "1984-11-12", images: [], artists: [{ name: "Madonna" }] }
          ],
          next: "https://api.spotify.com/v1/artists/artist-1/albums?offset=50&limit=50"
        })
      )
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }));

    const provider = new CatalogProvider(config, fetchImpl as unknown as typeof fetch);

    const albums = await provider.fetchArtistAlbums("artist-1");

    expect(albums).toEqual([expect.objectContaining({ title: "Like a Virgin", externalId: "album-1" })]);
  });
});
