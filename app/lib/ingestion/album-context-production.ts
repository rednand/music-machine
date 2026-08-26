import { createAlbumRepository, type AlbumRow, type ArtistRow, type CreditRow, type TrackRow } from "../db/album";
import { createSourceRepository } from "../db/source";
import type { DiscographyCacheRepository } from "../db/discography-cache";
import type { CatalogProvider } from "../providers/catalog-provider";
import type { RawAlbumData, RawCreditData, RawPerformanceRecordData, RawTrackData } from "../providers/provider.interface";
import { createPerformanceRecordRepository, type PerformanceRecordRow } from "../db/performance-record";
import { createCuriosityRepository, type CuriosityRow } from "../db/curiosity";
import { createInfluenceRepository, type InfluenceRow } from "../db/influence";
import { type RecommendationCandidateAlbum } from "../db/recommendation";
import { toSupabaseLike } from "../db/supabase-like";
import type { GeneratedFactItem } from "../ai/curiosity-influence";
import { findSameEraAlbums } from "../same-era";
import { parseTrackNumber } from "./track-number";
import { normalizeAlbumTitle, type DiscographyEntry, type SourceExcerptRef } from "./album-context";

export async function findSameEraAlbumsForProduction(
  album: AlbumRow,
  albumRepo: ReturnType<typeof createAlbumRepository>
) {
  const allAlbums = await albumRepo.findAllAlbums();
  const candidates = allAlbums.map((a) => ({ id: a.id, releaseDate: new Date(a.release_date) }));
  const sameEra = findSameEraAlbums({ id: album.id, releaseDate: new Date(album.release_date) }, candidates, 0);
  const matchedAlbums = allAlbums.filter((a) => sameEra.some((s) => s.id === a.id));

  return Promise.all(
    matchedAlbums.map(async (a) => ({
      albumId: a.id,
      title: a.title,
      artistName: (await albumRepo.findArtistById(a.artist_id))?.name ?? "",
      releaseYear: a.release_date.slice(0, 4)
    }))
  );
}

export async function findArtistDiscographyForProduction(
  artist: ArtistRow,
  catalog: Pick<CatalogProvider, "searchArtist" | "fetchArtistAlbums">,
  albumRepo: Pick<ReturnType<typeof createAlbumRepository>, "setArtistSpotifyId">,
  discographyCache: Pick<DiscographyCacheRepository, "findByArtistId" | "save">
): Promise<DiscographyEntry[]> {
  const cached = await discographyCache.findByArtistId(artist.id);
  if (cached) {
    return cached;
  }

  const artistId = artist.spotify_artist_id ?? (await catalog.searchArtist(artist.name));
  if (!artistId) {
    return [];
  }

  if (!artist.spotify_artist_id) {
    await albumRepo.setArtistSpotifyId(artist.id, artistId);
  }

  const albums = await catalog.fetchArtistAlbums(artistId);
  if (albums === null) {
    return [];
  }

  const earliestByNormalizedTitle = new Map<string, RawAlbumData>();

  for (const album of albums) {
    const key = normalizeAlbumTitle(album.title);
    const existing = earliestByNormalizedTitle.get(key);
    if (!existing || album.releaseDate < existing.releaseDate) {
      earliestByNormalizedTitle.set(key, album);
    }
  }

  const entries = Array.from(earliestByNormalizedTitle.values())
    .map((album) => ({
      title: album.title,
      releaseYear: album.releaseDate.slice(0, 4),
      externalId: album.externalId
    }))
    .sort((a, b) => a.releaseYear.localeCompare(b.releaseYear));

  await discographyCache.save(artist.id, entries);

  return entries;
}

export async function persistCreditsForProduction(
  albumId: string,
  rawCredits: RawCreditData[],
  albumRepo: ReturnType<typeof createAlbumRepository>,
  admin: ReturnType<typeof toSupabaseLike>
): Promise<CreditRow[]> {
  const sourceRepo = createSourceRepository(admin);

  return Promise.all(
    rawCredits.map(async (raw) => {
      const source = await sourceRepo.create({
        type: "music_database",
        title: `${raw.source.providerName} release credits`,
        url: raw.source.url,
        published_or_retrieved_date: raw.source.retrievedAt
      });
      return albumRepo.createCredit({
        album_id: albumId,
        person_name: raw.personName,
        role: raw.role,
        source_id: source.id
      });
    })
  );
}

export async function persistTracksForProduction(
  albumId: string,
  rawTracks: RawTrackData[],
  albumRepo: ReturnType<typeof createAlbumRepository>
): Promise<TrackRow[]> {
  return Promise.all(
    rawTracks.map((raw) =>
      albumRepo.createTrack({
        album_id: albumId,
        title: raw.title,
        track_number: parseTrackNumber(raw.position),
        duration_seconds: raw.durationSeconds
      })
    )
  );
}

export async function persistPerformanceRecordsForProduction(
  albumId: string,
  rawRecords: RawPerformanceRecordData[],
  performanceRepo: ReturnType<typeof createPerformanceRecordRepository>,
  admin: ReturnType<typeof toSupabaseLike>
): Promise<PerformanceRecordRow[]> {
  const sourceRepo = createSourceRepository(admin);

  return Promise.all(
    rawRecords.map(async (raw) => {
      const source = await sourceRepo.create({
        type: "music_database",
        title: `${raw.source.providerName} performance data`,
        url: raw.source.url,
        published_or_retrieved_date: raw.source.retrievedAt
      });
      return performanceRepo.create({
        album_id: albumId,
        kind: raw.kind,
        label: raw.label,
        value: raw.value,
        record_date: raw.date,
        source_id: source.id
      });
    })
  );
}

export async function resolveRealSourceId(
  excerptId: string,
  sourceRefs: SourceExcerptRef[],
  sourceRepo: ReturnType<typeof createSourceRepository>,
  cache: Map<string, Promise<string>> = new Map()
): Promise<string> {
  const cached = cache.get(excerptId);
  if (cached) {
    return cached;
  }

  const resolution = (async () => {
    const ref = sourceRefs.find((candidate) => candidate.id === excerptId);
    if (!ref) {
      throw new Error(`No source excerpt found for id "${excerptId}"`);
    }
    if (ref.kind === "review") {
      return ref.sourceId;
    }
    const source = await sourceRepo.create({
      type: "encyclopedic",
      title: `${ref.source.providerName} context fact`,
      url: ref.source.url,
      published_or_retrieved_date: ref.source.retrievedAt
    });
    return source.id;
  })();

  cache.set(excerptId, resolution);
  return resolution;
}

async function settleAndLogFailures<T>(promises: Promise<T>[], failureLabel: string): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  const fulfilled: T[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      fulfilled.push(result.value);
    } else {
      console.error(failureLabel, result.reason);
    }
  }
  return fulfilled;
}

export async function persistCuriositiesForProduction(
  albumId: string,
  items: GeneratedFactItem[],
  sourceRefs: SourceExcerptRef[],
  curiosityRepo: ReturnType<typeof createCuriosityRepository>,
  admin: ReturnType<typeof toSupabaseLike>,
  sourceCache: Map<string, Promise<string>> = new Map()
): Promise<CuriosityRow[]> {
  const sourceRepo = createSourceRepository(admin);

  return settleAndLogFailures(
    items.map(async (item) => {
      const sourceId = await resolveRealSourceId(item.sourceIds[0], sourceRefs, sourceRepo, sourceCache);
      return curiosityRepo.create({
        album_id: albumId,
        summary: item.text,
        source_id: sourceId
      });
    }),
    "Failed to persist curiosity"
  );
}

export async function persistInfluenceForProduction(
  albumId: string,
  items: GeneratedFactItem[],
  sourceRefs: SourceExcerptRef[],
  influenceRepo: ReturnType<typeof createInfluenceRepository>,
  admin: ReturnType<typeof toSupabaseLike>,
  sourceCache: Map<string, Promise<string>> = new Map()
): Promise<InfluenceRow[]> {
  const sourceRepo = createSourceRepository(admin);

  return settleAndLogFailures(
    items.map(async (item) => {
      const sourceId = await resolveRealSourceId(item.sourceIds[0], sourceRefs, sourceRepo, sourceCache);
      return influenceRepo.create({
        from_album_id: albumId,
        explanation: item.text,
        source_id: sourceId
      });
    }),
    "Failed to persist influence"
  );
}

export async function findRecommendationCandidatesForProduction(
  albumId: string,
  albumRepo: ReturnType<typeof createAlbumRepository>
): Promise<RecommendationCandidateAlbum[]> {
  const allAlbums = await albumRepo.findAllAlbums();
  return allAlbums
    .filter((a) => a.id !== albumId)
    .map((a) => ({ id: a.id, title: a.title, releaseDate: new Date(a.release_date), genre: a.genre }));
}
