import { describe, expect, it, vi } from "vitest";
import { EncyclopediaProvider, parseInfoboxNameList } from "./encyclopedia-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function searchResponse(title: string | null): Response {
  return jsonResponse({ query: { search: title ? [{ title }] : [] } });
}

function multiSearchResponse(titles: string[]): Response {
  return jsonResponse({ query: { search: titles.map((title) => ({ title })) } });
}

describe("EncyclopediaProvider", () => {
  const config = { userAgent: "music-time-machine/0.1.0 (test@example.com)" };

  it("resolves the real page title via search before fetching the summary", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(searchResponse("Control (Janet Jackson album)"))
      .mockResolvedValueOnce(
        jsonResponse({
          extract: "Control is the third studio album by American singer Janet Jackson.",
          content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Control_(album)" } }
        })
      );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    const facts = await provider.fetchContextFacts({ artistName: "Janet Jackson", albumTitle: "Control" });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("en.wikipedia.org/w/api.php?action=query&list=search"),
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": config.userAgent }) })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("en.wikipedia.org/api/rest_v1/page/summary/Control%20(Janet%20Jackson%20album)"),
      expect.anything()
    );
    expect(facts).toEqual([
      expect.objectContaining({
        text: "Control is the third studio album by American singer Janet Jackson.",
        source: expect.objectContaining({ providerName: "encyclopedia", url: "https://en.wikipedia.org/wiki/Control_(album)" })
      })
    ]);
  });

  it("uses the real, non-disambiguated title when the album's own name is already unique", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(searchResponse("Beautiful Garbage"))
      .mockResolvedValueOnce(
        jsonResponse({
          extract: "Beautiful Garbage is the third studio album by American rock band Garbage.",
          content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Beautiful_Garbage" } }
        })
      );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    const facts = await provider.fetchContextFacts({ artistName: "Garbage", albumTitle: "Beautiful Garbage" });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("en.wikipedia.org/api/rest_v1/page/summary/Beautiful%20Garbage"),
      expect.anything()
    );
    expect(facts).toHaveLength(1);
  });

  it("prefers a result containing the album title over an unrelated artist page ranked higher", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(multiSearchResponse(["Garbage (album)", "Garbage discography", "Beautiful Garbage"]))
      .mockResolvedValueOnce(
        jsonResponse({
          extract: "Beautiful Garbage is the third studio album by American rock band Garbage.",
          content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Beautiful_Garbage" } }
        })
      );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    const facts = await provider.fetchContextFacts({ artistName: "Garbage", albumTitle: "Beautiful Garbage" });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("en.wikipedia.org/api/rest_v1/page/summary/Beautiful%20Garbage"),
      expect.anything()
    );
    expect(facts).toHaveLength(1);
  });

  it("falls back to the top search result when no result's title contains the album title", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(multiSearchResponse(["Some Unrelated Page", "Another Unrelated Page"]))
      .mockResolvedValueOnce(jsonResponse({ extract: "", content_urls: { desktop: { page: "" } } }));

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    await provider.fetchContextFacts({ artistName: "X", albumTitle: "Y" });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("en.wikipedia.org/api/rest_v1/page/summary/Some%20Unrelated%20Page"),
      expect.anything()
    );
  });

  it("returns an empty array when the search finds no matching page", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(searchResponse(null));

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchContextFacts({ artistName: "Nobody", albumTitle: "Nothing" })).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("extracts best-effort chart/certification/award data from infobox-style wikitext", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(searchResponse("Control (Janet Jackson album)"))
      .mockResolvedValueOnce(
        jsonResponse({
          query: {
            pages: {
              "123": {
                revisions: [
                  {
                    slots: {
                      main: {
                        "*": "{{Infobox album\n{{album chart|Billboard 200|1|artist=Janet Jackson|album=Control|accessdate=1 January 2020}}\n{{Certification Table Entry|region=United States|type=album|artist=Janet Jackson|title=Control|award=Platinum|accessdate=1 January 2020}}\n}}"
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

  it("parses certification templates regardless of field order or template-name casing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(searchResponse("Sleeping with Ghosts"))
      .mockResolvedValueOnce(
        jsonResponse({
          query: {
            pages: {
              "123": {
                revisions: [
                  {
                    slots: {
                      main: {
                        "*":
                          "{{certification Table Entry|region=Austria|type=album|artist=Placebo|title=Sleeping With Ghosts|award=Gold|relyear=2003|certyear=2003|accessdate=3 June 2019}}\n" +
                          "{{Certification Table Entry|region=Belgium|type=album|artist=Placebo|title=Sleeping With Ghosts|award=Gold|accessdate=28 July 2014|relyear=2003|certyear=2003}}"
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

    const records = await provider.fetchPerformanceRecords({ artistName: "Placebo", albumTitle: "Sleeping with Ghosts" });

    expect(records).toEqual([
      expect.objectContaining({ kind: "certification", label: "Austria", value: "Gold" }),
      expect.objectContaining({ kind: "certification", label: "Belgium", value: "Gold" })
    ]);
  });

  it("parses positional album chart templates with trailing named metadata", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(searchResponse("Sleeping with Ghosts"))
      .mockResolvedValueOnce(
        jsonResponse({
          query: {
            pages: {
              "123": {
                revisions: [
                  {
                    slots: {
                      main: {
                        "*": "{{album chart|Australia|11|artist=Placebo|album=Sleeping With Ghosts|accessdate=22 October 2020}}"
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

    const records = await provider.fetchPerformanceRecords({ artistName: "Placebo", albumTitle: "Sleeping with Ghosts" });

    expect(records).toEqual([expect.objectContaining({ kind: "chart_position", label: "Australia", value: "11" })]);
  });

  it("returns an empty array when the wikitext has no chart/certification templates", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(searchResponse("Nothing (Nobody album)"))
      .mockResolvedValueOnce(
        jsonResponse({
          query: { pages: { "123": { revisions: [{ slots: { main: { "*": "No chart data here." } } }] } } }
        })
      );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchPerformanceRecords({ artistName: "Nobody", albumTitle: "Nothing" })).toEqual([]);
  });

  it("returns an empty array instead of throwing when the search request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response("You are making too many requests, please retry later.", { status: 429, headers: { "content-type": "text/plain" } })
    );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchContextFacts({ artistName: "Janet Jackson", albumTitle: "Control" })).toEqual([]);
  });

  it("returns an empty array instead of throwing when the API returns a non-JSON rate-limit/error response after title resolution", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(searchResponse("Control (Janet Jackson album)"))
      .mockResolvedValueOnce(
        new Response("You are making too many requests, please retry later.", { status: 429, headers: { "content-type": "text/plain" } })
      );

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchContextFacts({ artistName: "Janet Jackson", albumTitle: "Control" })).toEqual([]);
  });

  it("returns an empty array instead of throwing when fetchPerformanceRecords hits a non-JSON error response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(searchResponse("Control (Janet Jackson album)"))
      .mockResolvedValueOnce(new Response("Service unavailable", { status: 503, headers: { "content-type": "text/plain" } }));

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchPerformanceRecords({ artistName: "Janet Jackson", albumTitle: "Control" })).toEqual([]);
  });

  it("returns an empty array instead of throwing when the fetch call itself rejects", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network error"));

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchContextFacts({ artistName: "Janet Jackson", albumTitle: "Control" })).toEqual([]);
  });

  it("fetches the artist's summary and confirmed influence names from their infobox", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          extract: "Madonna is an American singer known as the Queen of Pop.",
          content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Madonna" } }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          query: {
            pages: {
              "456": {
                revisions: [
                  {
                    slots: {
                      main: {
                        "*":
                          "{{Infobox musical artist\n" +
                          "| name = Madonna\n" +
                          "| influences = {{startplainlist}}\n* [[David Bowie]]\n* [[Nile Rodgers]]\n{{endplainlist}}\n" +
                          "| influenced = {{startplainlist}}\n* [[Britney Spears]]\n* [[Lady Gaga (musician)|Lady Gaga]]\n{{endplainlist}}\n" +
                          "| genre = Pop\n" +
                          "}}"
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

    const profile = await provider.fetchArtistProfile("Madonna");

    expect(fetchImpl).toHaveBeenNthCalledWith(1, expect.stringContaining("en.wikipedia.org/api/rest_v1/page/summary/Madonna"), expect.anything());
    expect(fetchImpl).toHaveBeenNthCalledWith(2, expect.stringContaining("en.wikipedia.org/w/api.php"), expect.anything());
    expect(profile.summary).toEqual(
      expect.objectContaining({ text: "Madonna is an American singer known as the Queen of Pop." })
    );
    expect(profile.influencedBy).toEqual(["David Bowie", "Nile Rodgers"]);
    expect(profile.influenced).toEqual(["Britney Spears", "Lady Gaga"]);
  });

  it("returns empty influence lists and a null summary when the artist page can't be found", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("Not found", { status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ query: { pages: { "-1": {} } } }));

    const provider = new EncyclopediaProvider(config, fetchImpl as unknown as typeof fetch);

    const profile = await provider.fetchArtistProfile("Some Obscure Act");

    expect(profile).toEqual({ summary: null, influencedBy: [], influenced: [] });
  });
});

describe("parseInfoboxNameList", () => {
  it("extracts wikilink targets from a plainlist-wrapped infobox field", () => {
    const wikitext =
      "| influences = {{startplainlist}}\n* [[David Bowie]]\n* [[Prince (musician)|Prince]]\n{{endplainlist}}\n| genre = Pop";

    expect(parseInfoboxNameList(wikitext, "influences")).toEqual(["David Bowie", "Prince"]);
  });

  it("falls back to comma-splitting plain text when there are no wikilinks", () => {
    const wikitext = "| influenced = Britney Spears, Lady Gaga\n| genre = Pop";

    expect(parseInfoboxNameList(wikitext, "influenced")).toEqual(["Britney Spears", "Lady Gaga"]);
  });

  it("returns an empty array when the field is absent", () => {
    const wikitext = "| genre = Pop\n| years_active = 1979-present";

    expect(parseInfoboxNameList(wikitext, "influences")).toEqual([]);
  });

  it("handles the field being the last one before the infobox closes", () => {
    const wikitext = "| influences = [[David Bowie]]\n}}";

    expect(parseInfoboxNameList(wikitext, "influences")).toEqual(["David Bowie"]);
  });
});
