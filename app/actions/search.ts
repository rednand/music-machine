"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { createAlbumRepository, type AlbumRow } from "../lib/db/album";
import { toSupabaseLike } from "../lib/db/supabase-like";
import { CatalogProvider } from "../lib/providers/catalog-provider";
import { MusicBrainzProvider, buildReleaseGroupSearchUrl } from "../lib/providers/musicbrainz-provider";
import type { RawAlbumData } from "../lib/providers/provider.interface";
import { ingestSingleCandidate } from "../lib/ingestion/search-fallback";
import { earlierFullDate } from "../lib/ingestion/ingest-album";

export interface KnownSearchResult {
  kind: "known";
  id: string;
  title: string;
  artistName?: string;
  releaseDate?: string;
  coverArtUrl?: string;
  sourceUrl: "local_database";
}

export interface CandidateSearchResult {
  kind: "candidate";
  externalId: string;
  query: string;
  title: string;
  artistName: string;
  releaseDate: string;
  coverArtUrl?: string;
  sourceUrl: string;
  musicBrainzUrl: string;
}

export type SearchResultItem = KnownSearchResult | CandidateSearchResult;

export type ResolveCandidateResult = { state: "ready"; albumId: string } | { state: "error"; message: string };

function albumToResult(album: AlbumRow, artistName?: string): KnownSearchResult {
  return {
    kind: "known",
    id: album.id,
    title: album.title,
    artistName,
    releaseDate: album.release_date,
    coverArtUrl: album.cover_art_url,
    sourceUrl: "local_database"
  };
}

function candidateToResult(query: string, candidate: RawAlbumData): CandidateSearchResult {
  return {
    kind: "candidate",
    externalId: candidate.externalId,
    query,
    title: candidate.title,
    artistName: candidate.artistName,
    releaseDate: candidate.releaseDate,
    coverArtUrl: candidate.coverArtUrl,
    sourceUrl: candidate.source.url,
    musicBrainzUrl: buildReleaseGroupSearchUrl({ artistName: candidate.artistName, albumTitle: candidate.title })
  };
}

function createCatalogProvider(): CatalogProvider {
  return new CatalogProvider();
}

function createMusicBrainzProvider(): MusicBrainzProvider {
  return new MusicBrainzProvider({
    userAgent: process.env.ENCYCLOPEDIA_PROVIDER_USER_AGENT ?? "music-time-machine/0.1.0"
  });
}

async function reconcileReleaseDate(candidate: RawAlbumData): Promise<RawAlbumData> {
  const originalReleaseDate = await createMusicBrainzProvider().fetchOriginalReleaseDate({
    artistName: candidate.artistName,
    albumTitle: candidate.title
  });
  return { ...candidate, releaseDate: earlierFullDate(candidate.releaseDate, originalReleaseDate) };
}

async function searchExternalCandidates(query: string): Promise<CandidateSearchResult[]> {
  const catalog = createCatalogProvider();
  const results = await catalog.searchByText(query);

  const reconciled: RawAlbumData[] = [];
  for (const candidate of results) {
    reconciled.push(await reconcileReleaseDate(candidate));
  }

  return reconciled.map((candidate) => candidateToResult(query, candidate));
}

function dedupeKey(title: string, artistName: string | undefined): string {
  return `${title.trim().toLowerCase()}|${(artistName ?? "").trim().toLowerCase()}`;
}

export async function searchCatalog(query: string): Promise<SearchResultItem[]> {
  if (!query.trim()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const repository = createAlbumRepository(toSupabaseLike(supabase));

  const [titleMatches, artists] = await Promise.all([
    repository.searchAlbums(query),
    repository.searchArtists(query)
  ]);

  const artistAlbumLists = await Promise.all(artists.map((artist) => repository.findAlbumsByArtistId(artist.id)));

  const seenAlbumIds = new Set<string>();
  const albums = [...titleMatches, ...artistAlbumLists.flat()].filter((album) => {
    if (seenAlbumIds.has(album.id)) {
      return false;
    }
    seenAlbumIds.add(album.id);
    return true;
  });

  const [knownResults, candidates] = await Promise.all([
    Promise.all(
      albums.map(async (album) => {
        const artist = await repository.findArtistById(album.artist_id);
        return albumToResult(album, artist?.name);
      })
    ),
    searchExternalCandidates(query)
  ]);

  const knownKeys = new Set(knownResults.map((result) => dedupeKey(result.title, result.artistName)));
  const newCandidates = candidates.filter((candidate) => !knownKeys.has(dedupeKey(candidate.title, candidate.artistName)));

  return [...knownResults, ...newCandidates];
}

export async function resolveSearchCandidate(query: string, externalId: string): Promise<ResolveCandidateResult> {
  try {
    const catalog = createCatalogProvider();
    const candidates = await catalog.searchByText(query);
    const matched = candidates.find((candidate) => candidate.externalId === externalId);

    if (!matched) {
      return { state: "error", message: "Não foi possível confirmar este item. Tente buscar novamente." };
    }

    const correctedCandidate = await reconcileReleaseDate(matched);

    const adminRepo = createAlbumRepository(toSupabaseLike(createSupabaseAdminClient()));

    const album = await ingestSingleCandidate(correctedCandidate, {
      findArtistByName: (name) => adminRepo.findArtistByName(name),
      createArtist: (input) => adminRepo.createArtist(input),
      findAlbumBySlug: (slug) => adminRepo.findAlbumBySlug(slug),
      createAlbum: (input) => adminRepo.createAlbum(input)
    });

    if (!album) {
      return { state: "error", message: "Não foi possível salvar este item." };
    }

    return { state: "ready", albumId: album.id };
  } catch (error) {
    console.error("Failed to resolve search candidate", { query, externalId, error });
    return { state: "error", message: "Não foi possível salvar este item. Tente novamente." };
  }
}
