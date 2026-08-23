import { describe, expect, it, vi } from "vitest";
import { MusicBrainzProvider } from "./musicbrainz-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("MusicBrainzProvider", () => {
  it("returns the release group's first-release-date", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({ "release-groups": [{ "first-release-date": "2003-03-04" }] })
    );
    const provider = new MusicBrainzProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    const date = await provider.fetchOriginalReleaseDate({ artistName: "Evanescence", albumTitle: "Fallen" });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("musicbrainz.org/ws/2/release-group"),
      expect.objectContaining({ headers: { "user-agent": "test-agent/1.0" } })
    );
    expect(date).toBe("2003-03-04");
  });

  it("skips release groups with only a partial (year-only) first-release-date", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        "release-groups": [{ "first-release-date": "2003" }, { "first-release-date": "2003-03-04" }]
      })
    );
    const provider = new MusicBrainzProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    const date = await provider.fetchOriginalReleaseDate({ artistName: "Evanescence", albumTitle: "Fallen" });

    expect(date).toBe("2003-03-04");
  });

  it("returns null when no release group has a usable date", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ "release-groups": [] }));
    const provider = new MusicBrainzProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchOriginalReleaseDate({ artistName: "Nobody", albumTitle: "Nothing" })).toBeNull();
  });

  it("returns null instead of throwing when the request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }));
    const provider = new MusicBrainzProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchOriginalReleaseDate({ artistName: "X", albumTitle: "Y" })).toBeNull();
  });

  it("returns null instead of throwing when the fetch itself throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("network error"));
    const provider = new MusicBrainzProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchOriginalReleaseDate({ artistName: "X", albumTitle: "Y" })).toBeNull();
  });
});
