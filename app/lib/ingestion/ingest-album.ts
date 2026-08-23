import type {
  AlbumLookupQuery,
  ArtistProfileData,
  RawAlbumData,
  RawContextFactData,
  RawCreditData,
  RawPerformanceRecordData
} from "../providers/provider.interface";
import type { CatalogProvider } from "../providers/catalog-provider";
import type { DiscographyProvider } from "../providers/discography-provider";
import type { PopularityProvider } from "../providers/popularity-provider";
import type { EncyclopediaProvider } from "../providers/encyclopedia-provider";
import type { MusicBrainzProvider } from "../providers/musicbrainz-provider";
import { reconcileField, type FactCandidate } from "./reconciliation";

export interface IngestionProviders {
  catalog: Pick<CatalogProvider, "providerName" | "searchAlbum">;
  discography: Pick<DiscographyProvider, "providerName" | "fetchCredits">;
  popularity: Pick<PopularityProvider, "providerName" | "fetchTags">;
  encyclopedia: Pick<
    EncyclopediaProvider,
    "providerName" | "fetchContextFacts" | "fetchPerformanceRecords" | "fetchArtistProfile"
  >;
  musicbrainz: Pick<MusicBrainzProvider, "providerName" | "fetchOriginalReleaseDate">;
}

export interface IngestedAlbum {
  title: string;
  artistName: string;
  releaseDate: { value: string; discrepancy: boolean };
  genre?: string;
  label?: string;
  durationSeconds?: number;
  trackCount?: number;
  coverArtUrl?: string;
  externalId?: string;
  credits: RawCreditData[];
  performanceRecords: RawPerformanceRecordData[];
  contextFacts: RawContextFactData[];
  tags: string[];
  artistProfile: ArtistProfileData;
}

function firstDefined<T>(candidates: Array<T | undefined>): T | undefined {
  return candidates.find((value) => value !== undefined);
}

const FULL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function earlierFullDate(a: string, b: string | null): string {
  if (!b || !FULL_DATE_PATTERN.test(b)) {
    return a;
  }
  if (!a || !FULL_DATE_PATTERN.test(a)) {
    return b;
  }
  return a <= b ? a : b;
}

export async function ingestAlbum(
  query: AlbumLookupQuery,
  providers: IngestionProviders
): Promise<IngestedAlbum> {
  const [catalogResults, credits, tags, contextFacts, performanceRecords, artistProfile, originalReleaseDate] =
    await Promise.all([
      providers.catalog.searchAlbum(query),
      providers.discography.fetchCredits(query),
      providers.popularity.fetchTags(query),
      providers.encyclopedia.fetchContextFacts(query),
      providers.encyclopedia.fetchPerformanceRecords(query),
      providers.encyclopedia.fetchArtistProfile(query.artistName),
      providers.musicbrainz.fetchOriginalReleaseDate(query)
    ]);

  const catalogEntries: Array<{ providerName: string; data: RawAlbumData }> = catalogResults.map(
    (data) => ({ providerName: providers.catalog.providerName, data })
  );

  const first = catalogEntries[0]?.data;

  const releaseDateCandidates: Array<FactCandidate<string>> = catalogEntries.map((entry) => ({
    value: entry.data.releaseDate,
    tier: "music_database",
    providerName: entry.providerName
  }));

  const releaseDate =
    releaseDateCandidates.length > 0
      ? reconcileField(releaseDateCandidates)
      : { value: "", discrepancy: false };

  return {
    title: first?.title ?? query.albumTitle,
    artistName: first?.artistName ?? query.artistName,
    releaseDate: { ...releaseDate, value: earlierFullDate(releaseDate.value, originalReleaseDate) },
    genre: firstDefined(catalogEntries.map((e) => e.data.genre)),
    label: firstDefined(catalogEntries.map((e) => e.data.label)),
    durationSeconds: firstDefined(catalogEntries.map((e) => e.data.durationSeconds)),
    trackCount: firstDefined(catalogEntries.map((e) => e.data.trackCount)),
    coverArtUrl: firstDefined(catalogEntries.map((e) => e.data.coverArtUrl)),
    externalId: first?.externalId,
    credits,
    performanceRecords,
    contextFacts,
    tags,
    artistProfile
  };
}
