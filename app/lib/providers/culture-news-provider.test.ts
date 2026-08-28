import { describe, expect, it, vi } from "vitest";
import { CultureNewsProvider } from "./culture-news-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function guardianResult(overrides: Partial<{ webTitle: string; webUrl: string; webPublicationDate: string }> = {}) {
  return {
    webTitle: "Janet Jackson announces reissue tour",
    webUrl: "https://www.theguardian.com/music/janet-jackson-reissue-tour",
    webPublicationDate: "1986-03-15T10:00:00Z",
    ...overrides
  };
}

describe("CultureNewsProvider", () => {
  it("searches the Guardian's music section within a ±90-day window around the given year and maps results into context facts", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({ response: { status: "ok", results: [guardianResult()] } })
    );
    const provider = new CultureNewsProvider({ apiKey: "test-key" }, fetchImpl as unknown as typeof fetch);

    const news = await provider.fetchNewsForYear("Janet Jackson", "1986");

    const [requestedUrl] = fetchImpl.mock.calls[0];
    expect(requestedUrl).toContain("content.guardianapis.com/search");
    expect(requestedUrl).toContain("section=music");
    expect(requestedUrl).toContain("from-date=1985-10-03");
    expect(requestedUrl).toContain("to-date=1987-03-31");
    expect(requestedUrl).toContain("api-key=test-key");
    expect(requestedUrl).toContain("q=Janet+Jackson");
    expect(news).toEqual([
      expect.objectContaining({
        text: "Janet Jackson announces reissue tour",
        date: "1986-03-15",
        source: expect.objectContaining({
          providerName: "culture_news",
          url: "https://www.theguardian.com/music/janet-jackson-reissue-tour"
        })
      })
    ]);
  });

  it("returns an empty array when the request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 }));
    const provider = new CultureNewsProvider({ apiKey: "test-key" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchNewsForYear("Janet Jackson", "1986")).toEqual([]);
  });

  it("returns an empty array when the Guardian API reports a non-ok status", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ response: { status: "error", results: [] } }));
    const provider = new CultureNewsProvider({ apiKey: "test-key" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchNewsForYear("Janet Jackson", "1986")).toEqual([]);
  });

  it("returns an empty array instead of throwing when the fetch itself fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("network error"));
    const provider = new CultureNewsProvider({ apiKey: "test-key" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchNewsForYear("Janet Jackson", "1986")).toEqual([]);
  });

  it("returns an empty array when there is no coverage from that year, e.g. an album old enough to predate the Guardian's searchable archive", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ response: { status: "ok", results: [] } }));
    const provider = new CultureNewsProvider({ apiKey: "test-key" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchNewsForYear("Michael Jackson", "1979")).toEqual([]);
  });
});
