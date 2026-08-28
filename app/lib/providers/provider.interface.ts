export interface ProviderSourceRef {
  providerName: string;
  url: string;
  retrievedAt: string;
}

export interface AlbumLookupQuery {
  artistName: string;
  albumTitle: string;
}

export interface RawAlbumData {
  title: string;
  externalId: string;
  artistName: string;
  releaseDate: string;
  genre?: string;
  label?: string;
  durationSeconds?: number;
  trackCount?: number;
  coverArtUrl?: string;
  source: ProviderSourceRef;
}

export interface RawCreditData {
  personName: string;
  role: string;
  source: ProviderSourceRef;
}


export interface RawTrackData {
  title: string;
  position: string;
  durationSeconds?: number;
  source: ProviderSourceRef;
}

export interface RawPerformanceRecordData {
  kind: "chart_position" | "certification" | "sales_figure" | "award";
  label: string;
  value: string;
  date?: string;
  source: ProviderSourceRef;
}

export interface RawContextFactData {
  text: string;
  date?: string;
  source: ProviderSourceRef;
}

export interface ArtistProfileData {
  summary: RawContextFactData | null;
  influencedBy: string[];
  influenced: string[];
}

export interface CatalogProviderAdapter {
  readonly providerName: string;
  searchAlbum(query: AlbumLookupQuery): Promise<RawAlbumData[]>;
  searchByText(query: string): Promise<RawAlbumData[]>;
  fetchTracks(albumId: string): Promise<RawTrackData[]>;
  searchArtist(artistName: string): Promise<string | null>;
  fetchArtistAlbums(artistId: string): Promise<RawAlbumData[] | null>;
}

export interface CreditsProviderAdapter {
  readonly providerName: string;
  fetchCredits(query: AlbumLookupQuery): Promise<RawCreditData[]>;
  fetchTracks(query: AlbumLookupQuery): Promise<RawTrackData[]>;
}

export interface PopularityProviderAdapter {
  readonly providerName: string;
  fetchTags(query: AlbumLookupQuery): Promise<string[]>;
}

export interface EncyclopediaProviderAdapter {
  readonly providerName: string;
  fetchContextFacts(query: AlbumLookupQuery): Promise<RawContextFactData[]>;
  fetchPerformanceRecords(query: AlbumLookupQuery): Promise<RawPerformanceRecordData[]>;
  fetchArtistProfile(artistName: string): Promise<ArtistProfileData>;
}

export interface RawHistoricalEventData {
  title: string;
  date: string;
}

export interface HistoricalEventsProviderAdapter {
  readonly providerName: string;
  fetchEvents(releaseDate: string): Promise<RawHistoricalEventData[]>;
}

export interface CultureNewsProviderAdapter {
  readonly providerName: string;
  fetchNewsForYear(query: string, year: string): Promise<RawContextFactData[]>;
}
