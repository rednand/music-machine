import type { CultureNewsProviderAdapter, RawContextFactData } from "./provider.interface";

export interface CultureNewsProviderConfig {
  apiKey: string;
}

interface GuardianSearchResult {
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
}

interface GuardianSearchResponse {
  response: {
    status: string;
    results: GuardianSearchResult[];
  };
}

const REQUEST_TIMEOUT_MS = 10000;
const PAGE_SIZE = 10;
const WINDOW_DAYS = 90;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class CultureNewsProvider implements CultureNewsProviderAdapter {
  readonly providerName = "culture_news";

  constructor(
    private readonly config: CultureNewsProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async fetchNewsForYear(query: string, year: string): Promise<RawContextFactData[]> {
    const from = new Date(`${year}-01-01T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - WINDOW_DAYS);
    const to = new Date(`${year}-12-31T00:00:00Z`);
    to.setUTCDate(to.getUTCDate() + WINDOW_DAYS);

    const params = new URLSearchParams({
      q: query,
      section: "music",
      "from-date": isoDate(from),
      "to-date": isoDate(to),
      "order-by": "relevance",
      "page-size": String(PAGE_SIZE),
      "api-key": this.config.apiKey
    });
    const url = `https://content.guardianapis.com/search?${params.toString()}`;

    try {
      const response = await this.fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (!response.ok) {
        console.error(`Guardian culture-news request failed for "${query}": ${response.status}`);
        return [];
      }
      const data = (await response.json()) as GuardianSearchResponse;
      if (data.response.status !== "ok") {
        console.error(`Guardian culture-news request returned status "${data.response.status}" for "${query}"`);
        return [];
      }

      const retrievedAt = new Date().toISOString();
      return data.response.results.map((result) => ({
        text: result.webTitle,
        date: result.webPublicationDate.slice(0, 10),
        source: { providerName: this.providerName, url: result.webUrl, retrievedAt }
      }));
    } catch (error) {
      console.error(`Guardian culture-news request threw for "${query}"`, error);
      return [];
    }
  }
}
