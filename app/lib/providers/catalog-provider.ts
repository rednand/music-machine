import type { AlbumLookupQuery, CatalogProviderAdapter, RawAlbumData, RawTrackData } from "./provider.interface";

interface DeezerArtistRef {
  id: number;
  name: string;
}

interface DeezerAlbumSearchItem {
  id: number;
  title: string;
  artist?: DeezerArtistRef;
  cover_xl?: string;
  cover_big?: string;
  cover_medium?: string;
  nb_tracks?: number;
}

interface DeezerAlbumSearchResponse {
  data: DeezerAlbumSearchItem[];
}

interface DeezerAlbumDetails {
  release_date?: string;
  nb_tracks?: number;
  label?: string;
  genres?: { data: Array<{ name: string }> };
}

interface DeezerArtistSearchItem {
  id: number;
  nb_fan: number;
}

interface DeezerArtistSearchResponse {
  data: DeezerArtistSearchItem[];
}

interface DeezerArtistAlbumItem {
  id: number;
  title: string;
  release_date: string;
  cover_xl?: string;
  cover_big?: string;
  cover_medium?: string;
  record_type: string;
  artist?: DeezerArtistRef;
}

interface DeezerArtistAlbumsResponse {
  data: DeezerArtistAlbumItem[];
}

interface DeezerTrackItem {
  title: string;
  track_position: number;
  duration: number;
}

interface DeezerTracksResponse {
  data: DeezerTrackItem[];
}

const REISSUE_KEYWORDS = "deluxe|remaster(?:ed)?|edition|anniversary|expanded|bonus|special|reissue|version";

function stripReissueSuffix(title: string): string {
  return title
    .replace(new RegExp(`\\s*[([][^)\\]]*\\b(?:${REISSUE_KEYWORDS})\\b[^)\\]]*[)\\]]\\s*`, "gi"), " ")
    .replace(new RegExp(`\\s*[-–]\\s*(?:${REISSUE_KEYWORDS})\\b.*$`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleForDedup(title: string): string {
  return stripReissueSuffix(title).toLowerCase();
}

function keepOriginalEditions(albums: RawAlbumData[]): RawAlbumData[] {
  const earliestByKey = new Map<string, RawAlbumData>();
  const keyOrder: string[] = [];

  for (const album of albums) {
    const key = `${normalizeTitleForDedup(album.title)}|${album.artistName.toLowerCase()}`;
    const existing = earliestByKey.get(key);
    if (!existing) {
      earliestByKey.set(key, album);
      keyOrder.push(key);
    } else if (album.releaseDate < existing.releaseDate) {
      earliestByKey.set(key, album);
    }
  }

  return keyOrder.map((key) => earliestByKey.get(key) as RawAlbumData);
}

export class CatalogProvider implements CatalogProviderAdapter {
  readonly providerName = "catalog";

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async searchAlbum(query: AlbumLookupQuery): Promise<RawAlbumData[]> {
    return this.search(`${query.albumTitle} ${query.artistName}`, query.artistName);
  }

  async searchByText(query: string): Promise<RawAlbumData[]> {
    return this.search(query);
  }

  private async search(rawQuery: string, fallbackArtistName?: string): Promise<RawAlbumData[]> {
    const url = `https://api.deezer.com/search/album?q=${encodeURIComponent(rawQuery)}`;

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as DeezerAlbumSearchResponse;
    const retrievedAt = new Date().toISOString();

    const enriched = await Promise.all(
      data.data.map(async (item): Promise<RawAlbumData | null> => {
        const details = await this.fetchAlbumDetails(item.id);
        if (!details?.release_date) {
          return null;
        }
        return {
          title: stripReissueSuffix(item.title) || item.title,
          externalId: String(item.id),
          artistName: item.artist?.name ?? fallbackArtistName ?? "",
          releaseDate: details.release_date,
          genre: details.genres?.data[0]?.name,
          label: details.label,
          trackCount: details.nb_tracks ?? item.nb_tracks,
          coverArtUrl: item.cover_xl ?? item.cover_big ?? item.cover_medium,
          source: { providerName: this.providerName, url, retrievedAt }
        };
      })
    );

    const resolved = enriched.filter((album): album is RawAlbumData => album !== null);
    return keepOriginalEditions(resolved);
  }

  private async fetchAlbumDetails(albumId: number): Promise<DeezerAlbumDetails | null> {
    const response = await this.fetchImpl(`https://api.deezer.com/album/${albumId}`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as DeezerAlbumDetails;
  }

  async fetchTracks(albumId: string): Promise<RawTrackData[]> {
    const url = `https://api.deezer.com/album/${albumId}/tracks?limit=100`;

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as DeezerTracksResponse;
    const retrievedAt = new Date().toISOString();

    return data.data.map((item) => ({
      title: item.title,
      position: String(item.track_position),
      durationSeconds: item.duration,
      source: { providerName: this.providerName, url, retrievedAt }
    }));
  }

  async searchArtist(artistName: string): Promise<string | null> {
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(`"${artistName}"`)}`;

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as DeezerArtistSearchResponse;
    if (data.data.length === 0) {
      return null;
    }

    const best = data.data.reduce((top, candidate) => (candidate.nb_fan > top.nb_fan ? candidate : top));
    return String(best.id);
  }

  async fetchArtistAlbums(artistId: string): Promise<RawAlbumData[] | null> {
    const retrievedAt = new Date().toISOString();
    const url = `https://api.deezer.com/artist/${artistId}/albums?limit=100`;

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as DeezerArtistAlbumsResponse;

    return data.data
      .filter((item) => item.record_type === "album")
      .map((item) => ({
        title: item.title,
        externalId: String(item.id),
        artistName: item.artist?.name ?? "",
        releaseDate: item.release_date,
        coverArtUrl: item.cover_xl ?? item.cover_big ?? item.cover_medium,
        source: { providerName: this.providerName, url, retrievedAt }
      }));
  }
}
