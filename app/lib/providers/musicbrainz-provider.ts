import type { AlbumLookupQuery } from "./provider.interface";
import { cachedFetch } from "../cache";

export interface MusicBrainzProviderConfig {
  userAgent: string;
}

interface MusicBrainzReleaseGroup {
  "first-release-date"?: string;
}

interface MusicBrainzReleaseGroupSearchResponse {
  "release-groups": MusicBrainzReleaseGroup[];
}

const FULL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_TIMEOUT_MS = 15000;

export function buildReleaseGroupSearchUrl(query: AlbumLookupQuery): string {
  const mbQuery = `artist:${query.artistName} AND release:${query.albumTitle}`;
  return `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(mbQuery)}&fmt=json&limit=5`;
}

export class MusicBrainzProvider {
  readonly providerName = "musicbrainz";

  constructor(
    private readonly config: MusicBrainzProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async fetchOriginalReleaseDate(query: AlbumLookupQuery): Promise<string | null> {
    const url = buildReleaseGroupSearchUrl(query);

    try {
      const response = await cachedFetch(
        url,
        { headers: { "user-agent": this.config.userAgent }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
        this.fetchImpl
      );
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as MusicBrainzReleaseGroupSearchResponse;

      const withFullDate = data["release-groups"]?.find((group) =>
        FULL_DATE_PATTERN.test(group["first-release-date"] ?? "")
      );
      return withFullDate?.["first-release-date"] ?? null;
    } catch {
      return null;
    }
  }
}
