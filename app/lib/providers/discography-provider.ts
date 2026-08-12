import type { AlbumLookupQuery, CreditsProviderAdapter, RawCreditData } from "./provider.interface";

export interface DiscographyProviderConfig {
  token: string;
}

interface SearchResult {
  id: number;
}

interface SearchResponse {
  results: SearchResult[];
}

interface ReleaseCredit {
  name: string;
  role: string;
}

interface ReleaseResponse {
  extraartists?: ReleaseCredit[];
}

export class DiscographyProvider implements CreditsProviderAdapter {
  readonly providerName = "discography";

  constructor(
    private readonly config: DiscographyProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private headers(): Record<string, string> {
    return { Authorization: `Discogs token=${this.config.token}` };
  }

  async fetchCredits(query: AlbumLookupQuery): Promise<RawCreditData[]> {
    const searchParams = new URLSearchParams({
      artist: query.artistName,
      release_title: query.albumTitle,
      type: "release"
    });
    const searchUrl = `https://api.discogs.com/database/search?${searchParams.toString()}`;

    const searchResponse = await this.fetchImpl(searchUrl, { headers: this.headers() });
    const searchData = (await searchResponse.json()) as SearchResponse;
    const first = searchData.results[0];
    if (!first) {
      return [];
    }

    const releaseUrl = `https://api.discogs.com/releases/${first.id}`;
    const releaseResponse = await this.fetchImpl(releaseUrl, { headers: this.headers() });
    const releaseData = (await releaseResponse.json()) as ReleaseResponse;
    const retrievedAt = new Date().toISOString();

    return (releaseData.extraartists ?? []).map((credit) => ({
      personName: credit.name,
      role: credit.role,
      source: { providerName: this.providerName, url: releaseUrl, retrievedAt }
    }));
  }
}
