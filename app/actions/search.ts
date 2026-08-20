"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { createAlbumRepository, type AlbumRow } from "../lib/db/album";
import { toSupabaseLike } from "../lib/db/supabase-like";
import { CatalogProvider } from "../lib/providers/catalog-provider";
import type { RawAlbumData } from "../lib/providers/provider.interface";
import { ingestSingleCandidate } from "../lib/ingestion/search-fallback";

const MAX_CANDIDATES = 5;

export interface KnownSearchResult {
  kind: "known";
  id: string;
  title: string;
  artistName?: string;
  releaseDate?: string;
  coverArtUrl?: string;
}

export interface CandidateSearchResult {
  kind: "candidate";
  externalId: string;
  query: string;
  title: string;
  artistName: string;
  releaseDate: string;
  coverArtUrl?: string;
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
    coverArtUrl: album.cover_art_url
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
    coverArtUrl: candidate.coverArtUrl
  };
}

function createCatalogProvider(): CatalogProvider {
  return new CatalogProvider({
    clientId: process.env.CATALOG_PROVIDER_CLIENT_ID ?? "",
    clientSecret: process.env.CATALOG_PROVIDER_CLIENT_SECRET ?? ""
  });
}

async function searchExternalCandidates(query: string): Promise<CandidateSearchResult[]> {
  const catalog = createCatalogProvider();
  const results = await catalog.searchByText(query);
  return results.slice(0, MAX_CANDIDATES).map((candidate) => candidateToResult(query, candidate));
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

  if (titleMatches.length === 0 && artists.length === 0) {
    return searchExternalCandidates(query);
  }

  const artistAlbumLists = await Promise.all(artists.map((artist) => repository.findAlbumsByArtistId(artist.id)));

  const seenAlbumIds = new Set<string>();
  const albums = [...titleMatches, ...artistAlbumLists.flat()].filter((album) => {
    if (seenAlbumIds.has(album.id)) {
      return false;
    }
    seenAlbumIds.add(album.id);
    return true;
  });

  return Promise.all(
    albums.map(async (album) => {
      const artist = await repository.findArtistById(album.artist_id);
      return albumToResult(album, artist?.name);
    })
  );
}

export async function resolveSearchCandidate(query: string, externalId: string): Promise<ResolveCandidateResult> {
  try {
    const catalog = createCatalogProvider();
    const candidates = await catalog.searchByText(query);
    const matched = candidates.find((candidate) => candidate.externalId === externalId);

    if (!matched) {
      return { state: "error", message: "Não foi possível confirmar este item. Tente buscar novamente." };
    }

    const adminRepo = createAlbumRepository(toSupabaseLike(createSupabaseAdminClient()));

    const album = await ingestSingleCandidate(matched, {
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
