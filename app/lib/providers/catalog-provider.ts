import type { AlbumLookupQuery, CatalogProviderAdapter, RawAlbumData } from "./provider.interface";

export interface CatalogProviderConfig {
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface CatalogAlbumItem {
  id: string;
  name: string;
  release_date: string;
  images: Array<{ url: string }>;
  artists: Array<{ name: string }>;
  total_tracks: number;
}

interface CatalogSearchResponse {
  albums: { items: CatalogAlbumItem[] };
}

export class CatalogProvider implements CatalogProviderAdapter {
  readonly providerName = "catalog";

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly config: CatalogProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const response = await this.fetchImpl("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`
      },
      body: "grant_type=client_credentials"
    });

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 5000;
    return this.accessToken;
  }

  async searchAlbum(query: AlbumLookupQuery): Promise<RawAlbumData[]> {
    return this.search(`album:${query.albumTitle} artist:${query.artistName}`, query.artistName);
  }

  async searchByText(query: string): Promise<RawAlbumData[]> {
    return this.search(query);
  }

  private async search(rawQuery: string, fallbackArtistName?: string): Promise<RawAlbumData[]> {
    const token = await this.getAccessToken();
    const searchQuery = encodeURIComponent(rawQuery);
    const url = `https://api.spotify.com/v1/search?type=album&q=${searchQuery}`;

    const response = await this.fetchImpl(url, {
      headers: { authorization: `Bearer ${token}` }
    });
    const data = (await response.json()) as CatalogSearchResponse;
    const retrievedAt = new Date().toISOString();

    return data.albums.items.map((item) => ({
      title: item.name,
      externalId: item.id,
      artistName: item.artists[0]?.name ?? fallbackArtistName ?? "",
      releaseDate: item.release_date,
      trackCount: item.total_tracks,
      coverArtUrl: item.images[0]?.url,
      source: { providerName: this.providerName, url, retrievedAt }
    }));
  }
}
