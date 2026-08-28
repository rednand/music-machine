"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { createAlbumRepository, type AlbumRow } from "../lib/db/album";
import { toSupabaseLike } from "../lib/db/supabase-like";
import { CatalogProvider } from "../lib/providers/catalog-provider";
import { MusicBrainzProvider, buildReleaseGroupSearchUrl } from "../lib/providers/musicbrainz-provider";
import type { RawAlbumData } from "../lib/providers/provider.interface";
import { ingestSingleCandidate, type SearchFallbackDeps } from "../lib/ingestion/search-fallback";
import { earlierFullDate } from "../lib/ingestion/ingest-album";
import { getCurrentIsAdmin } from "../lib/auth";
import { runWithAdminTrace, traceDeps, traceStep } from "../lib/debug/admin-trace";

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

const fetchOriginalReleaseDate = traceStep(
  "fetchOriginalReleaseDate",
  (input: { artistName: string; albumTitle: string }) => createMusicBrainzProvider().fetchOriginalReleaseDate(input)
);

async function reconcileReleaseDate(candidate: RawAlbumData): Promise<RawAlbumData> {
  const originalReleaseDate = await fetchOriginalReleaseDate({
    artistName: candidate.artistName,
    albumTitle: candidate.title
  });
  return { ...candidate, releaseDate: earlierFullDate(candidate.releaseDate, originalReleaseDate) };
}

const searchByText = traceStep("searchByText", (query: string) => createCatalogProvider().searchByText(query));

async function searchExternalCandidates(query: string): Promise<CandidateSearchResult[]> {
  const results = await searchByText(query);

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

  const isAdmin = await getCurrentIsAdmin();
  const { result } = await runWithAdminTrace(isAdmin, async () => {
    const supabase = await createSupabaseServerClient();
    const repository = createAlbumRepository(toSupabaseLike(supabase));
    const searchAlbums = traceStep("searchAlbums", (q: string) => repository.searchAlbums(q));
    const searchArtists = traceStep("searchArtists", (q: string) => repository.searchArtists(q));
    const findAlbumsByArtistId = traceStep("findAlbumsByArtistId", (id: string) => repository.findAlbumsByArtistId(id));
    const findArtistById = traceStep("findArtistById", (id: string) => repository.findArtistById(id));

    const [titleMatches, artists] = await Promise.all([searchAlbums(query), searchArtists(query)]);

    const artistAlbumLists = await Promise.all(artists.map((artist) => findAlbumsByArtistId(artist.id)));

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
          const artist = await findArtistById(album.artist_id);
          return albumToResult(album, artist?.name);
        })
      ),
      searchExternalCandidates(query)
    ]);

    const knownKeys = new Set(knownResults.map((r) => dedupeKey(r.title, r.artistName)));
    const newCandidates = candidates.filter((candidate) => !knownKeys.has(dedupeKey(candidate.title, candidate.artistName)));

    return [...knownResults, ...newCandidates];
  });

  return result;
}

export async function resolveSearchCandidate(query: string, externalId: string): Promise<ResolveCandidateResult> {
  const isAdmin = await getCurrentIsAdmin();
  const { result } = await runWithAdminTrace(isAdmin, async (): Promise<ResolveCandidateResult> => {
    try {
      const candidates = await searchByText(query);
      const matched = candidates.find((candidate) => candidate.externalId === externalId);

      if (!matched) {
        return { state: "error", message: "Não foi possível confirmar este item. Tente buscar novamente." };
      }

      const correctedCandidate = await reconcileReleaseDate(matched);

      const adminRepo = createAlbumRepository(toSupabaseLike(createSupabaseAdminClient()));
      const deps = traceDeps<SearchFallbackDeps>(
        {
          findArtistByName: (name) => adminRepo.findArtistByName(name),
          createArtist: (input) => adminRepo.createArtist(input),
          findAlbumBySlug: (slug) => adminRepo.findAlbumBySlug(slug),
          createAlbum: (input) => adminRepo.createAlbum(input)
        },
        ["findArtistByName", "createArtist", "findAlbumBySlug", "createAlbum"]
      );

      const album = await ingestSingleCandidate(correctedCandidate, deps);

      if (!album) {
        return { state: "error", message: "Não foi possível salvar este item." };
      }

      return { state: "ready", albumId: album.id };
    } catch (error) {
      console.error("Failed to resolve search candidate", { query, externalId, error });
      return { state: "error", message: "Não foi possível salvar este item. Tente novamente." };
    }
  });

  return result;
}
