"use server";

import { after } from "next/server";
import { getCurrentIsAdmin } from "../lib/auth";
import { runWithAdminTrace, traceDeps } from "../lib/debug/admin-trace";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { createAlbumRepository } from "../lib/db/album";
import { createPerformanceRecordRepository } from "../lib/db/performance-record";
import { createReviewRepository } from "../lib/db/review";
import { createCuriosityRepository } from "../lib/db/curiosity";
import { createInfluenceRepository } from "../lib/db/influence";
import { createNarrativeArticleRepository } from "../lib/db/narrative-article";
import { createRecommendationRepository } from "../lib/db/recommendation";
import { createDiscographyCacheRepository } from "../lib/db/discography-cache";
import { toSupabaseLike } from "../lib/db/supabase-like";
import { GroqClient } from "../lib/ai/client";
import { GeminiClient } from "../lib/ai/gemini-client";
import { FallbackChatCompletionClient } from "../lib/ai/fallback-client";
import { ingestAlbum } from "../lib/ingestion/ingest-album";
import { CatalogProvider } from "../lib/providers/catalog-provider";
import { DiscographyProvider } from "../lib/providers/discography-provider";
import { PopularityProvider } from "../lib/providers/popularity-provider";
import { EncyclopediaProvider } from "../lib/providers/encyclopedia-provider";
import { HistoricalEventsProvider } from "../lib/providers/historical-events-provider";
import { MusicBrainzProvider } from "../lib/providers/musicbrainz-provider";
import {
  assembleTechnicalSheet,
  assembleNarrative,
  type TechnicalSheetResult,
  type NarrativeResult,
  type AlbumContextDeps
} from "../lib/ingestion/album-context";
import { InMemoryRateLimiter } from "../lib/rate-limit";
import {
  findArtistDiscographyForProduction,
  findSameEraAlbumsForProduction,
  persistCreditsForProduction,
  persistTracksForProduction,
  persistPerformanceRecordsForProduction,
  persistCuriositiesForProduction,
  persistInfluenceForProduction,
  findRecommendationCandidatesForProduction
} from "../lib/ingestion/album-context-production";
import Groq from "groq-sdk";

export type { TechnicalSheetResult, NarrativeResult } from "../lib/ingestion/album-context";

const narrativeTriggerLimiter = new InMemoryRateLimiter();

const TRACED_DEP_KEYS: (keyof AlbumContextDeps)[] = [
  "findAlbum",
  "findArtistById",
  "findTracks",
  "persistTracks",
  "fetchTracks",
  "findCredits",
  "persistCredits",
  "findAlbumsByArtistId",
  "findPerformanceRecords",
  "persistPerformanceRecords",
  "findReviews",
  "findCuriosities",
  "persistCuriosities",
  "findInfluences",
  "persistInfluence",
  "findSameEraAlbums",
  "findHistoricalEvents",
  "findArtistDiscography",
  "ingestAlbum",
  "findRecommendationCandidates",
  "findDirectlyInfluencedAlbumIds"
];

async function buildAlbumContextDeps(): Promise<AlbumContextDeps> {
  const supabase = toSupabaseLike(await createSupabaseServerClient());
  const admin = toSupabaseLike(createSupabaseAdminClient());
  const albumRepo = createAlbumRepository(supabase);
  const adminAlbumRepo = createAlbumRepository(admin);
  const performanceRepo = createPerformanceRecordRepository(supabase);
  const adminPerformanceRepo = createPerformanceRecordRepository(admin);
  const reviewRepo = createReviewRepository(supabase);
  const curiosityRepo = createCuriosityRepository(supabase);
  const adminCuriosityRepo = createCuriosityRepository(admin);
  const influenceRepo = createInfluenceRepository(supabase);
  const adminInfluenceRepo = createInfluenceRepository(admin);
  const narrativeArticles = createNarrativeArticleRepository(admin);
  const recommendationRepo = createRecommendationRepository(admin);
  const discographyCacheRepo = createDiscographyCacheRepository(admin);
  const sourceResolutionCache = new Map<string, Promise<string>>();

  const groqSdkClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const groqClient = new GroqClient(groqSdkClient, {
    models: [
      process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "groq/compound",
      "groq/compound-mini"
    ]
  });
  const geminiClient = new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY ?? "",
    models: [
      process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite-preview",
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-pro-latest"
    ]
  });
  const gptClient = new FallbackChatCompletionClient([groqClient, geminiClient]);

  const catalog = new CatalogProvider();
  const discography = new DiscographyProvider({ token: process.env.DISCOGRAPHY_PROVIDER_TOKEN ?? "" });
  const popularity = new PopularityProvider({ apiKey: process.env.POPULARITY_PROVIDER_API_KEY ?? "" });
  const encyclopedia = new EncyclopediaProvider({
    userAgent: process.env.ENCYCLOPEDIA_PROVIDER_USER_AGENT ?? "music-time-machine/0.1.0"
  });
  const historicalEvents = new HistoricalEventsProvider({
    userAgent: process.env.ENCYCLOPEDIA_PROVIDER_USER_AGENT ?? "music-time-machine/0.1.0"
  });
  const musicbrainz = new MusicBrainzProvider({
    userAgent: process.env.ENCYCLOPEDIA_PROVIDER_USER_AGENT ?? "music-time-machine/0.1.0"
  });

  const deps: AlbumContextDeps = {
    findAlbum: (id) => albumRepo.findAlbumById(id),
    findArtistById: (id) => albumRepo.findArtistById(id),
    findTracks: (id) => albumRepo.findTracksByAlbumId(id),
    persistTracks: (albumId, rawTracks) => persistTracksForProduction(albumId, rawTracks, adminAlbumRepo),
    findCredits: (id) => albumRepo.findCreditsByAlbumId(id),
    persistCredits: (albumId, rawCredits) => persistCreditsForProduction(albumId, rawCredits, adminAlbumRepo, admin),
    findAlbumsByArtistId: (id) => albumRepo.findAlbumsByArtistId(id),
    findPerformanceRecords: (id) => performanceRepo.findByAlbumId(id),
    persistPerformanceRecords: (albumId, rawRecords) =>
      persistPerformanceRecordsForProduction(albumId, rawRecords, adminPerformanceRepo, admin),
    findReviews: (id) => reviewRepo.findByAlbumId(id),
    findCuriosities: (id) => curiosityRepo.findByAlbumId(id),
    persistCuriosities: (albumId, items, sourceRefs) =>
      persistCuriositiesForProduction(albumId, items, sourceRefs, adminCuriosityRepo, admin, sourceResolutionCache),
    findInfluences: (id) => influenceRepo.findByFromAlbumId(id),
    persistInfluence: (albumId, items, sourceRefs) =>
      persistInfluenceForProduction(albumId, items, sourceRefs, adminInfluenceRepo, admin, sourceResolutionCache),
    findSameEraAlbums: (album) => findSameEraAlbumsForProduction(album, albumRepo),
    findArtistDiscography: (artist) =>
      findArtistDiscographyForProduction(artist, catalog, adminAlbumRepo, discographyCacheRepo),
    findHistoricalEvents: (releaseDate) => historicalEvents.fetchEvents(releaseDate),
    ingestAlbum: (query) => ingestAlbum(query, { catalog, discography, popularity, encyclopedia, musicbrainz }),
    fetchTracks: (externalId) => catalog.fetchTracks(externalId),
    gptClient,
    narrativeArticles,
    findRecommendationCandidates: (id) => findRecommendationCandidatesForProduction(id, albumRepo),
    findDirectlyInfluencedAlbumIds: async (id) => {
      const influences = await influenceRepo.findByFromAlbumId(id);
      return new Set(influences.map((i) => i.to_album_id).filter((id): id is string => Boolean(id)));
    },
    recommendations: recommendationRepo,
    dedupeNarrativeTrigger: (albumId) =>
      narrativeTriggerLimiter.checkAndIncrement(`narrative-trigger:${albumId}`, { maxRequests: 1, windowSeconds: 300 })
        .allowed,
    scheduleBackgroundWork: (run) => {
      after(run);
    }
  };

  return traceDeps(deps, TRACED_DEP_KEYS);
}

export async function getAlbumTechnicalSheet(albumId: string): Promise<TechnicalSheetResult> {
  const isAdmin = await getCurrentIsAdmin();
  const deps = await buildAlbumContextDeps();
  const { result } = await runWithAdminTrace(isAdmin, () => assembleTechnicalSheet(albumId, deps));
  return result;
}

export async function getAlbumNarrative(albumId: string): Promise<NarrativeResult> {
  const isAdmin = await getCurrentIsAdmin();
  const deps = await buildAlbumContextDeps();
  const { result } = await runWithAdminTrace(isAdmin, () => assembleNarrative(albumId, deps));
  return result;
}
