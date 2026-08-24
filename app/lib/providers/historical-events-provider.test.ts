import { describe, expect, it, vi } from "vitest";
import { HistoricalEventsProvider } from "./historical-events-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function sparqlBinding(title: string, date: string, sitelinks: string) {
  return { eventLabel: { value: title }, date: { value: date }, sitelinks: { value: sitelinks } };
}

describe("HistoricalEventsProvider", () => {
  it("queries Wikidata with a window centered on the release date and returns mapped events", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        results: {
          bindings: [sparqlBinding("acidente do vaivém Challenger", "1986-01-28T00:00:00Z", "52")]
        }
      })
    );
    const provider = new HistoricalEventsProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    const events = await provider.fetchEvents("1986-02-04");

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("query.wikidata.org/sparql"),
      expect.objectContaining({ headers: expect.objectContaining({ "user-agent": "test-agent/1.0" }) })
    );
    const [requestedUrlRaw, options] = fetchImpl.mock.calls[0];
    const requestedUrl = decodeURIComponent(requestedUrlRaw);
    expect(requestedUrl).toContain("1985-11-06");
    expect(requestedUrl).toContain("1986-05-05");
    expect(options.headers.accept).toBe("application/sparql-results+json");
    expect(events).toEqual([{ title: "acidente do vaivém Challenger", date: "1986-01-28" }]);
  });

  it("filters out navigational month/year pages and deaths-list pages", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        results: {
          bindings: [
            sparqlBinding("November 2025", "2025-11-01T00:00:00Z", "24"),
            sparqlBinding("Mortes em outubro de 2025", "2025-10-01T00:00:00Z", "17"),
            sparqlBinding("1986", "1986-01-01T00:00:00Z", "208"),
            sparqlBinding("assassinato de Charlie Kirk", "2025-09-10T00:00:00Z", "39")
          ]
        }
      })
    );
    const provider = new HistoricalEventsProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    const events = await provider.fetchEvents("2025-11-06");

    expect(events).toEqual([{ title: "assassinato de Charlie Kirk", date: "2025-09-10" }]);
  });

  it("filters out Wikinotícias/Wikinews/Portal index pages", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        results: {
          bindings: [
            sparqlBinding("Wikinotícias:2016/fevereiro", "2016-02-01T00:00:00Z", "45"),
            sparqlBinding("Portal:Eventos correntes/Fevereiro de 2016", "2016-02-01T00:00:00Z", "12"),
            sparqlBinding("acidente do vaivém Challenger", "1986-01-28T00:00:00Z", "52")
          ]
        }
      })
    );
    const provider = new HistoricalEventsProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    const events = await provider.fetchEvents("2016-02-04");

    expect(events).toEqual([{ title: "acidente do vaivém Challenger", date: "1986-01-28" }]);
  });

  it("dedupes repeated titles, keeping the first (highest-ranked) occurrence", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        results: {
          bindings: [
            sparqlBinding("2025 Czech legislative election", "2025-10-03T00:00:00Z", "21"),
            sparqlBinding("2025 Czech legislative election", "2025-10-04T00:00:00Z", "21")
          ]
        }
      })
    );
    const provider = new HistoricalEventsProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    const events = await provider.fetchEvents("2025-11-06");

    expect(events).toEqual([{ title: "2025 Czech legislative election", date: "2025-10-03" }]);
  });

  it("returns an empty array when the request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 }));
    const provider = new HistoricalEventsProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchEvents("1986-02-04")).toEqual([]);
  });

  it("returns an empty array when the fetch throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("network error"));
    const provider = new HistoricalEventsProvider({ userAgent: "test-agent/1.0" }, fetchImpl as unknown as typeof fetch);

    expect(await provider.fetchEvents("1986-02-04")).toEqual([]);
  });
});
