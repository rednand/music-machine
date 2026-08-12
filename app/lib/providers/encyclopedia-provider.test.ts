import { describe, expect, it, vi } from "vitest";
import { EncyclopediaProvider } from "./encyclopedia-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("EncyclopediaProvider", () => {
  const config = { userAgent: "music-time-machine/0.1.0 (test@example.com)" };

  it("fetches a context summary with license/attribution metadata", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        extract: "Control is the third studio album by American singer Janet Jackson.",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Control_(album)" } }
      })
    );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    const facts = await provider.fetchContextFacts({ artistName: "Janet Jackson", albumTitle: "Control" });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("en.wikipedia.org/api/rest_v1/page/summary/"),
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": config.userAgent }) })
    );
    expect(facts).toEqual([
      expect.objectContaining({
        text: "Control is the third studio album by American singer Janet Jackson.",
        source: expect.objectContaining({ providerName: "encyclopedia", url: "https://en.wikipedia.org/wiki/Control_(album)" })
      })
    ]);
  });

  it("extracts best-effort chart/certification/award data from infobox-style wikitext", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        query: {
          pages: {
            "123": {
              revisions: [
                {
                  slots: {
                    main: {
                      "*": "{{Infobox album\n{{Album chart|title=Billboard 200|position=1}}\n{{Certification|region=United States|certification=Platinum}}\n}}"
                    }
                  }
                }
              ]
            }
          }
        }
      })
    );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    const records = await provider.fetchPerformanceRecords({ artistName: "Janet Jackson", albumTitle: "Control" });

    expect(records).toEqual([
      expect.objectContaining({ kind: "chart_position", label: "Billboard 200", value: "1" }),
      expect.objectContaining({ kind: "certification", label: "United States", value: "Platinum" })
    ]);
  });

  it("returns an empty array when the wikitext has no chart/certification templates", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        query: { pages: { "123": { revisions: [{ slots: { main: { "*": "No chart data here." } } }] } } }
      })
    );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchPerformanceRecords({ artistName: "Nobody", albumTitle: "Nothing" })).toEqual([]);
  });

  it("returns an empty array instead of throwing when the API returns a non-JSON rate-limit/error response", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response("You are making too many requests, please retry later.", { status: 429, headers: { "content-type": "text/plain" } })
    );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchContextFacts({ artistName: "Janet Jackson", albumTitle: "Control" })).toEqual([]);
  });

  it("returns an empty array instead of throwing when fetchPerformanceRecords hits a non-JSON error response", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response("Service unavailable", { status: 503, headers: { "content-type": "text/plain" } })
    );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchPerformanceRecords({ artistName: "Janet Jackson", albumTitle: "Control" })).toEqual([]);
  });

  it("returns an empty array instead of throwing when the fetch call itself rejects", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network error"));

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchContextFacts({ artistName: "Janet Jackson", albumTitle: "Control" })).toEqual([]);
  });
});
