import type { AlbumLookupQuery, PopularityProviderAdapter } from "./provider.interface";

export interface PopularityProviderConfig {
  apiKey: string;
}

interface AlbumInfoResponse {
  album?: {
    tags?: { tag: Array<{ name: string }> };
  };
  error?: number;
}

export class PopularityProvider implements PopularityProviderAdapter {
  readonly providerName = "popularity";

  constructor(
    private readonly config: PopularityProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async fetchTags(query: AlbumLookupQuery): Promise<string[]> {
    const params = new URLSearchParams({
      method: "album.getinfo",
      artist: query.artistName,
      album: query.albumTitle,
      api_key: this.config.apiKey,
      format: "json"
    });
    const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;

    try {
      const response = await this.fetchImpl(url);
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as AlbumInfoResponse;

      if (!data.album) {
        return [];
      }

      return data.album.tags?.tag?.map((t) => t.name) ?? [];
    } catch {
      return [];
    }
  }
}
