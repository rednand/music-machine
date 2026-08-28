import type { HistoricalEventsProviderAdapter, RawHistoricalEventData } from "./provider.interface";

export interface HistoricalEventsProviderConfig {
  userAgent: string;
}

interface SparqlBinding {
  eventLabel: { value: string };
  date: { value: string };
  sitelinks: { value: string };
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

const WINDOW_DAYS = 90;
const MIN_SITELINKS = 10;
const MIN_DATE_PRECISION = 10;
const MAX_EVENTS = 10;
const REQUEST_TIMEOUT_MS = 15000;

const NOISE_PATTERNS = [
  /^\d{4}$/,
  /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i,
  /^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de \d{4}$/i,
  /^(mortes em .+ de \d{4}|deaths in .+ \d{4})$/i,
  /^(wikinotícias|wikinews|portal|category|categoria):/i
];

function isNoise(title: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(title.trim()));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildQuery(releaseDate: string): string {
  const center = new Date(releaseDate);
  const from = new Date(center);
  from.setDate(from.getDate() - WINDOW_DAYS);
  const to = new Date(center);
  to.setDate(to.getDate() + WINDOW_DAYS);

  return `SELECT ?eventLabel ?date ?sitelinks WHERE {
  ?event p:P585 ?dateStatement .
  ?dateStatement psv:P585 ?dateValue .
  ?dateValue wikibase:timeValue ?date .
  ?dateValue wikibase:timePrecision ?precision .
  FILTER(?precision >= ${MIN_DATE_PRECISION})
  FILTER(?date >= "${isoDate(from)}T00:00:00Z"^^xsd:dateTime && ?date <= "${isoDate(to)}T00:00:00Z"^^xsd:dateTime)
  ?event wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks > ${MIN_SITELINKS})
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 50`;
}

export class HistoricalEventsProvider implements HistoricalEventsProviderAdapter {
  readonly providerName = "historical_events";

  constructor(
    private readonly config: HistoricalEventsProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async fetchEvents(releaseDate: string): Promise<RawHistoricalEventData[]> {
    const query = buildQuery(releaseDate);
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`;

    try {
      const response = await this.fetchImpl(url, {
        headers: { accept: "application/sparql-results+json", "user-agent": this.config.userAgent },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as SparqlResponse;

      const seen = new Map<string, RawHistoricalEventData>();
      for (const binding of data.results.bindings) {
        const title = binding.eventLabel.value.trim();
        if (isNoise(title)) {
          continue;
        }
        const key = title.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, { title, date: binding.date.value.slice(0, 10) });
        }
      }

      return Array.from(seen.values()).slice(0, MAX_EVENTS);
    } catch {
      return [];
    }
  }
}
