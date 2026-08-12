import { describe, expect, it, vi } from "vitest";
import { DiscographyProvider } from "./discography-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("DiscographyProvider", () => {
  it("fetches release credits and maps them to RawCreditData", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ id: 123456, title: "Janet Jackson - Control" }]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          extraartists: [
            { name: "Jimmy Jam", role: "Producer" },
            { name: "Terry Lewis", role: "Producer" }
          ]
        })
      );

    const provider = new DiscographyProvider({ token: "discogs-token" }, fetchImpl as unknown as typeof fetch);

    const credits = await provider.fetchCredits({ artistName: "Janet Jackson", albumTitle: "Control" });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("api.discogs.com/database/search"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining("discogs-token") }) })
    );
    expect(credits).toEqual([
      expect.objectContaining({ personName: "Jimmy Jam", role: "Producer" }),
      expect.objectContaining({ personName: "Terry Lewis", role: "Producer" })
    ]);
  });

  it("returns an empty array when no release is found", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ results: [] }));
    const provider = new DiscographyProvider({ token: "discogs-token" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchCredits({ artistName: "Nobody", albumTitle: "Nothing" })).toEqual([]);
  });
});
