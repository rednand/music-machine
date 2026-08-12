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
});
