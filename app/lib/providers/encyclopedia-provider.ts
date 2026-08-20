import type {
  AlbumLookupQuery,
  ArtistProfileData,
  EncyclopediaProviderAdapter,
  RawContextFactData,
  RawPerformanceRecordData
} from "./provider.interface";

export interface EncyclopediaProviderConfig {
  userAgent: string;
}

interface SummaryResponse {
  extract: string;
  content_urls: { desktop: { page: string } };
}

interface RevisionsResponse {
  query: {
    pages: Record<string, { revisions?: Array<{ slots: { main: { "*": string } } }> }>;
  };
}

const CHART_TEMPLATE_PATTERN = /\{\{Album chart\|title=([^|]+)\|position=(\d+)\}\}/gi;
const CERTIFICATION_TEMPLATE_PATTERN = /\{\{Certification\|region=([^|]+)\|certification=([^}]+)\}\}/gi;

export function parsePerformanceTemplates(wikitext: string): RawPerformanceRecordData[] {
  const retrievedAt = new Date().toISOString();
  const source = { providerName: "encyclopedia", url: "", retrievedAt };

  const chartRecords = [...wikitext.matchAll(CHART_TEMPLATE_PATTERN)].map(
    (match): RawPerformanceRecordData => ({
      kind: "chart_position",
      label: match[1].trim(),
      value: match[2],
      source
    })
  );

  const certificationRecords = [...wikitext.matchAll(CERTIFICATION_TEMPLATE_PATTERN)].map(
    (match): RawPerformanceRecordData => ({
      kind: "certification",
      label: match[1].trim(),
      value: match[2].trim(),
      source
    })
  );

  return [...chartRecords, ...certificationRecords];
}

export function parseInfoboxNameList(wikitext: string, field: string): string[] {
  const fieldPattern = new RegExp(`\\|\\s*${field}\\s*=\\s*([\\s\\S]*?)(?=\\n\\s*\\||\\n\\}\\}|$)`, "i");
  const match = wikitext.match(fieldPattern);
  if (!match) {
    return [];
  }

  const block = match[1];
  const wikilinkPattern = /\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/g;
  const names: string[] = [];
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = wikilinkPattern.exec(block)) !== null) {
    names.push(linkMatch[1].replace(/_/g, " ").replace(/\s*\([^)]*\)$/, "").trim());
  }

  if (names.length > 0) {
    return Array.from(new Set(names));
  }

  return Array.from(
    new Set(
      block
        .replace(/\{\{[^}]*\}\}/g, "")
        .split(/[,\n*]/)
        .map((name) => name.trim())
        .filter((name) => name.length > 0 && name.length < 60)
    )
  );
}

export class EncyclopediaProvider implements EncyclopediaProviderAdapter {
  readonly providerName = "encyclopedia";

  constructor(
    private readonly config: EncyclopediaProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private pageTitle(query: AlbumLookupQuery): string {
    return `${query.albumTitle} (${query.artistName} album)`;
  }

  async fetchContextFacts(query: AlbumLookupQuery): Promise<RawContextFactData[]> {
    const title = encodeURIComponent(this.pageTitle(query));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;

    try {
      const response = await this.fetchImpl(url, { headers: { "User-Agent": this.config.userAgent } });
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as SummaryResponse;

      if (!data.extract) {
        return [];
      }

      return [
        {
          text: data.extract,
          source: {
            providerName: this.providerName,
            url: data.content_urls.desktop.page,
            retrievedAt: new Date().toISOString()
          }
        }
      ];
    } catch {
      return [];
    }
  }

  async fetchPerformanceRecords(query: AlbumLookupQuery): Promise<RawPerformanceRecordData[]> {
    const title = encodeURIComponent(this.pageTitle(query));
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=${title}`;

    try {
      const response = await this.fetchImpl(url, { headers: { "User-Agent": this.config.userAgent } });
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as RevisionsResponse;
      const page = Object.values(data.query.pages)[0];
      const wikitext = page?.revisions?.[0]?.slots.main["*"] ?? "";
      const retrievedAt = new Date().toISOString();

      return parsePerformanceTemplates(wikitext).map((record) => ({
        ...record,
        source: { ...record.source, url, retrievedAt }
      }));
    } catch {
      return [];
    }
  }

  async fetchArtistProfile(artistName: string): Promise<ArtistProfileData> {
    const encodedTitle = encodeURIComponent(artistName);
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;
    const revisionsUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=${encodedTitle}`;

    const [summary, wikitext] = await Promise.all([
      (async (): Promise<RawContextFactData | null> => {
        try {
          const response = await this.fetchImpl(summaryUrl, { headers: { "User-Agent": this.config.userAgent } });
          if (!response.ok) {
            return null;
          }
          const data = (await response.json()) as SummaryResponse;
          if (!data.extract) {
            return null;
          }
          return {
            text: data.extract,
            source: {
              providerName: this.providerName,
              url: data.content_urls.desktop.page,
              retrievedAt: new Date().toISOString()
            }
          };
        } catch {
          return null;
        }
      })(),
      (async (): Promise<string> => {
        try {
          const response = await this.fetchImpl(revisionsUrl, { headers: { "User-Agent": this.config.userAgent } });
          if (!response.ok) {
            return "";
          }
          const data = (await response.json()) as RevisionsResponse;
          const page = Object.values(data.query.pages)[0];
          return page?.revisions?.[0]?.slots.main["*"] ?? "";
        } catch {
          return "";
        }
      })()
    ]);

    return {
      summary,
      influencedBy: parseInfoboxNameList(wikitext, "influences"),
      influenced: parseInfoboxNameList(wikitext, "influenced")
    };
  }
}
