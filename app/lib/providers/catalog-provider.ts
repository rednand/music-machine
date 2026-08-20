import type { AlbumLookupQuery, CatalogProviderAdapter, RawAlbumData, RawTrackData } from "./provider.interface";

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

interface CatalogTrackItem {
  name: string;
  track_number: number;
  duration_ms: number;
}

interface CatalogAlbumTracksResponse {
  items: CatalogTrackItem[];
}

interface CatalogArtistSearchResponse {
  artists: { items: Array<{ id: string }> };
}

interface CatalogArtistAlbumItem {
  id: string;
  name: string;
  release_date: string;
  images: Array<{ url: string }>;
  artists: Array<{ name: string }>;
}

interface CatalogArtistAlbumsResponse {
  items: CatalogArtistAlbumItem[];
  next: string | null;
}

const MAX_ARTIST_ALBUM_PAGES = 15;
const ARTIST_ALBUMS_PAGE_SIZE = 10;

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

  async fetchTracks(albumId: string): Promise<RawTrackData[]> {
    const token = await this.getAccessToken();
    const url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

    const response = await this.fetchImpl(url, {
      headers: { authorization: `Bearer ${token}` }
    });
    const data = (await response.json()) as CatalogAlbumTracksResponse;
    const retrievedAt = new Date().toISOString();

    return data.items.map((item) => ({
      title: item.name,
      position: String(item.track_number),
      durationSeconds: Math.round(item.duration_ms / 1000),
      source: { providerName: this.providerName, url, retrievedAt }
    }));
  }

  async searchArtist(artistName: string): Promise<string | null> {
    const token = await this.getAccessToken();
    const url = `https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(artistName)}&limit=1`;

    const response = await this.fetchImpl(url, {
      headers: { authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as CatalogArtistSearchResponse;

    return data.artists.items[0]?.id ?? null;
  }

  async fetchArtistAlbums(artistId: string): Promise<RawAlbumData[] | null> {
    const token = await this.getAccessToken();
    const retrievedAt = new Date().toISOString();
    const albums: RawAlbumData[] = [];

    let url: string | null =
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,compilation&limit=${ARTIST_ALBUMS_PAGE_SIZE}`;
    let pagesFetched = 0;

    while (url && pagesFetched < MAX_ARTIST_ALBUM_PAGES) {
      const response = await this.fetchImpl(url, {
        headers: { authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        return pagesFetched === 0 ? null : albums;
      }
      const data = (await response.json()) as CatalogArtistAlbumsResponse;
      const pageUrl = url;

      albums.push(
        ...data.items.map((item) => ({
          title: item.name,
          externalId: item.id,
          artistName: item.artists[0]?.name ?? "",
          releaseDate: item.release_date,
          coverArtUrl: item.images[0]?.url,
          source: { providerName: this.providerName, url: pageUrl, retrievedAt }
        }))
      );

      url = data.next;
      pagesFetched += 1;
    }

    return albums;
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
