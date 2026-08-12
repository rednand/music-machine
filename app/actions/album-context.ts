"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { createAlbumRepository, type AlbumRow, type CreditRow } from "../lib/db/album";
import { createSourceRepository } from "../lib/db/source";
import type { RawCreditData } from "../lib/providers/provider.interface";
import { createPerformanceRecordRepository } from "../lib/db/performance-record";
import { createReviewRepository } from "../lib/db/review";
import { createCuriosityRepository } from "../lib/db/curiosity";
import { createInfluenceRepository } from "../lib/db/influence";
import { createNarrativeArticleRepository } from "../lib/db/narrative-article";
import { createRecommendationRepository, type RecommendationCandidateAlbum } from "../lib/db/recommendation";
import { toSupabaseLike } from "../lib/db/supabase-like";
import { GroqClient } from "../lib/ai/client";
import { findSameEraAlbums } from "../lib/same-era";
import { ingestAlbum } from "../lib/ingestion/ingest-album";
import { CatalogProvider } from "../lib/providers/catalog-provider";
import { DiscographyProvider } from "../lib/providers/discography-provider";
import { PopularityProvider } from "../lib/providers/popularity-provider";
import { EncyclopediaProvider } from "../lib/providers/encyclopedia-provider";
import { assembleAlbumContext, type AlbumContextResult } from "../lib/ingestion/album-context";
import Groq from "groq-sdk";

export type { AlbumContextResult } from "../lib/ingestion/album-context";

async function findSameEraAlbumsForProduction(
  album: AlbumRow,
  albumRepo: ReturnType<typeof createAlbumRepository>
) {
  const allAlbums = await albumRepo.findAllAlbums();
  const candidates = allAlbums.map((a) => ({ id: a.id, releaseDate: new Date(a.release_date) }));
  const sameEra = findSameEraAlbums({ id: album.id, releaseDate: new Date(album.release_date) }, candidates);
  const matchedAlbums = allAlbums.filter((a) => sameEra.some((s) => s.id === a.id));

  return Promise.all(
    matchedAlbums.map(async (a) => ({
      title: a.title,
      artistName: (await albumRepo.findArtistById(a.artist_id))?.name ?? ""
    }))
  );
}

async function persistCreditsForProduction(
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

async function findRecommendationCandidatesForProduction(
  albumId: string,
  albumRepo: ReturnType<typeof createAlbumRepository>
): Promise<RecommendationCandidateAlbum[]> {
  const allAlbums = await albumRepo.findAllAlbums();
  return allAlbums
    .filter((a) => a.id !== albumId)
    .map((a) => ({ id: a.id, title: a.title, releaseDate: new Date(a.release_date), genre: a.genre }));
}

export async function getAlbumContext(albumId: string): Promise<AlbumContextResult> {
  const supabase = toSupabaseLike(await createSupabaseServerClient());
  const admin = toSupabaseLike(createSupabaseAdminClient());
  const albumRepo = createAlbumRepository(supabase);
  const adminAlbumRepo = createAlbumRepository(admin);
  const performanceRepo = createPerformanceRecordRepository(supabase);
  const reviewRepo = createReviewRepository(supabase);
  const curiosityRepo = createCuriosityRepository(supabase);
  const influenceRepo = createInfluenceRepository(supabase);
  const narrativeArticles = createNarrativeArticleRepository(admin);
  const recommendationRepo = createRecommendationRepository(admin);

  const groqSdkClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const gptClient = new GroqClient(groqSdkClient, {
    primaryModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    fallbackModel: "llama-3.1-8b-instant"
  });

  const catalog = new CatalogProvider({
    clientId: process.env.CATALOG_PROVIDER_CLIENT_ID ?? "",
    clientSecret: process.env.CATALOG_PROVIDER_CLIENT_SECRET ?? ""
  });
  const discography = new DiscographyProvider({ token: process.env.DISCOGRAPHY_PROVIDER_TOKEN ?? "" });
  const popularity = new PopularityProvider({ apiKey: process.env.POPULARITY_PROVIDER_API_KEY ?? "" });
  const encyclopedia = new EncyclopediaProvider({
    userAgent: process.env.ENCYCLOPEDIA_PROVIDER_USER_AGENT ?? "music-time-machine/0.1.0"
  });

  return assembleAlbumContext(albumId, {
    findAlbum: (id) => albumRepo.findAlbumById(id),
    findArtistById: (id) => albumRepo.findArtistById(id),
    findTracks: (id) => albumRepo.findTracksByAlbumId(id),
    findCredits: (id) => albumRepo.findCreditsByAlbumId(id),
    persistCredits: (albumId, rawCredits) => persistCreditsForProduction(albumId, rawCredits, adminAlbumRepo, admin),
    findAlbumsByArtistId: (id) => albumRepo.findAlbumsByArtistId(id),
    findPerformanceRecords: (id) => performanceRepo.findByAlbumId(id),
    findReviews: (id) => reviewRepo.findByAlbumId(id),
    findCuriosities: (id) => curiosityRepo.findByAlbumId(id),
    findInfluences: (id) => influenceRepo.findByFromAlbumId(id),
    findSameEraAlbums: (album) => findSameEraAlbumsForProduction(album, albumRepo),
    findHistoricalEvents: async () => [],
    ingestAlbum: (query) => ingestAlbum(query, { catalog, discography, popularity, encyclopedia }),
    gptClient,
    narrativeArticles,
    findRecommendationCandidates: (id) => findRecommendationCandidatesForProduction(id, albumRepo),
    findDirectlyInfluencedAlbumIds: async (id) => {
      const influences = await influenceRepo.findByFromAlbumId(id);
      return new Set(influences.map((i) => i.to_album_id).filter((id): id is string => Boolean(id)));
    },
    recommendations: recommendationRepo
  });
}
