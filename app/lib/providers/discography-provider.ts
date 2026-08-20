import type { AlbumLookupQuery, CreditsProviderAdapter, RawCreditData, RawTrackData } from "./provider.interface";

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

interface ReleaseTrack {
  position: string;
  title: string;
  duration?: string;
}

interface ReleaseResponse {
  extraartists?: ReleaseCredit[];
  tracklist?: ReleaseTrack[];
}

function parseDurationToSeconds(duration?: string): number | undefined {
  if (!duration) {
    return undefined;
  }
  const parts = duration.split(":").map(Number);
  if (parts.length === 0 || parts.some((part) => Number.isNaN(part))) {
    return undefined;
  }
  return parts.reduce((totalSeconds, part) => totalSeconds * 60 + part, 0);
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

  private async findRelease(query: AlbumLookupQuery): Promise<{ releaseUrl: string; releaseData: ReleaseResponse } | null> {
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
      return null;
    }

    const releaseUrl = `https://api.discogs.com/releases/${first.id}`;
    const releaseResponse = await this.fetchImpl(releaseUrl, { headers: this.headers() });
    const releaseData = (await releaseResponse.json()) as ReleaseResponse;
    return { releaseUrl, releaseData };
  }

  async fetchCredits(query: AlbumLookupQuery): Promise<RawCreditData[]> {
    const release = await this.findRelease(query);
    if (!release) {
      return [];
    }

    const retrievedAt = new Date().toISOString();

    return (release.releaseData.extraartists ?? []).map((credit) => ({
      personName: credit.name,
      role: credit.role,
      source: { providerName: this.providerName, url: release.releaseUrl, retrievedAt }
    }));
  }

  async fetchTracks(query: AlbumLookupQuery): Promise<RawTrackData[]> {
    const release = await this.findRelease(query);
    if (!release) {
      return [];
    }

    const retrievedAt = new Date().toISOString();

    return (release.releaseData.tracklist ?? []).map((track) => ({
      title: track.title,
      position: track.position,
      durationSeconds: parseDurationToSeconds(track.duration),
      source: { providerName: this.providerName, url: release.releaseUrl, retrievedAt }
    }));
  }
}
