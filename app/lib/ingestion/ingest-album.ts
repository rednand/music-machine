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
import { reconcileField, type FactCandidate } from "./reconciliation";

export interface IngestionProviders {
  catalog: Pick<CatalogProvider, "providerName" | "searchAlbum">;
  discography: Pick<DiscographyProvider, "providerName" | "fetchCredits">;
  popularity: Pick<PopularityProvider, "providerName" | "fetchTags">;
  encyclopedia: Pick<
    EncyclopediaProvider,
    "providerName" | "fetchContextFacts" | "fetchPerformanceRecords" | "fetchArtistProfile"
  >;
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

export async function ingestAlbum(
  query: AlbumLookupQuery,
  providers: IngestionProviders
): Promise<IngestedAlbum> {
  const [catalogResults, credits, tags, contextFacts, performanceRecords, artistProfile] = await Promise.all([
    providers.catalog.searchAlbum(query),
    providers.discography.fetchCredits(query),
    providers.popularity.fetchTags(query),
    providers.encyclopedia.fetchContextFacts(query),
    providers.encyclopedia.fetchPerformanceRecords(query),
    providers.encyclopedia.fetchArtistProfile(query.artistName)
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
    releaseDate,
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
