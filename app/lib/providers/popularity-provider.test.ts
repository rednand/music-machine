import { describe, expect, it, vi } from "vitest";
import { PopularityProvider } from "./popularity-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("PopularityProvider", () => {
  it("fetches album tags", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({ album: { tags: { tag: [{ name: "funk" }, { name: "pop" }] } } })
    );

    const provider = new PopularityProvider({ apiKey: "lastfm-key" }, fetchImpl as unknown as typeof fetch);

    const tags = await provider.fetchTags({ artistName: "Janet Jackson", albumTitle: "Control" });

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("ws.audioscrobbler.com/2.0"), expect.anything());
    expect(tags).toEqual(["funk", "pop"]);
  });

  it("returns an empty array when the album is not found", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ error: 6, message: "Album not found" }));
    const provider = new PopularityProvider({ apiKey: "lastfm-key" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchTags({ artistName: "Nobody", albumTitle: "Nothing" })).toEqual([]);
  });

  it("returns an empty array when the album has tags without a tag list", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ album: { tags: {} } }));
    const provider = new PopularityProvider({ apiKey: "lastfm-key" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchTags({ artistName: "Garbage", albumTitle: "Version 2.0" })).toEqual([]);
  });

  it("returns an empty array when the request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 }));
    const provider = new PopularityProvider({ apiKey: "lastfm-key" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchTags({ artistName: "Nobody", albumTitle: "Nothing" })).toEqual([]);
  });

  it("returns an empty array when the fetch throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("network error"));
    const provider = new PopularityProvider({ apiKey: "lastfm-key" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchTags({ artistName: "Nobody", albumTitle: "Nothing" })).toEqual([]);
  });
});
