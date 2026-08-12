import type { AlbumRow, ArtistRow, CreditRow, TrackRow } from "../db/album";
import type { PerformanceRecordRow } from "../db/performance-record";
import type { ReviewRow } from "../db/review";
import type { CuriosityRow } from "../db/curiosity";
import type { InfluenceRow } from "../db/influence";
import type { NarrativeArticleRepository } from "../db/narrative-article";
import type { RecommendationCandidateAlbum, RecommendationRepository, RecommendationRow } from "../db/recommendation";
import { deriveRecommendations } from "../db/recommendation";
import type { ChatCompletionClient } from "../ai/client";
import type { HistoricalEventRef, NarrativeFacet, NarrativeStatement, SameEraAlbumRef } from "../ai/narrative";
import { synthesizeNarrative } from "../ai/narrative";
import { validateStatements } from "../ai/publishing-gate";
import type { IngestedAlbum } from "./ingest-album";
import type { RawCreditData } from "../providers/provider.interface";
import { deriveAlbumHook } from "../discovery/hook";

const FACETS: NarrativeFacet[] = ["artist_moment", "world_context", "musical_scene", "reception_vs_legacy"];

export interface AlbumContextDeps {
  findAlbum(albumId: string): Promise<AlbumRow | null>;
  findArtistById(artistId: string): Promise<ArtistRow | null>;
  findTracks(albumId: string): Promise<TrackRow[]>;
  findCredits(albumId: string): Promise<CreditRow[]>;
  persistCredits(albumId: string, credits: RawCreditData[]): Promise<CreditRow[]>;
  findAlbumsByArtistId(artistId: string): Promise<AlbumRow[]>;
  findPerformanceRecords(albumId: string): Promise<PerformanceRecordRow[]>;
  findReviews(albumId: string): Promise<ReviewRow[]>;
  findCuriosities(albumId: string): Promise<CuriosityRow[]>;
  findInfluences(albumId: string): Promise<InfluenceRow[]>;
  findSameEraAlbums(album: AlbumRow): Promise<SameEraAlbumRef[]>;
  findHistoricalEvents(releaseDate: string): Promise<HistoricalEventRef[]>;
  ingestAlbum(query: { artistName: string; albumTitle: string }): Promise<IngestedAlbum>;
  gptClient: ChatCompletionClient;
  narrativeArticles: Pick<
    NarrativeArticleRepository,
    "findByAlbumAndFacet" | "findStatementsByArticleId" | "createPending" | "publish" | "markFailedValidation"
  >;
  findRecommendationCandidates(albumId: string): Promise<RecommendationCandidateAlbum[]>;
  findDirectlyInfluencedAlbumIds(albumId: string): Promise<Set<string>>;
  recommendations: Pick<RecommendationRepository, "findBySubjectAlbumId" | "create">;
}

export interface AlbumContextHeader {
  title: string;
  artist: string;
  releaseDate: string;
  genre?: string;
  label?: string;
  durationSeconds?: number;
  trackCount?: number;
  coverArtUrl?: string;
  hook: string | null;
}

export interface OtherAlbumEntry {
  albumId: string;
  title: string;
  releaseYear: string;
}

export interface AlbumContextBody {
  header: AlbumContextHeader;
  tracks: TrackRow[];
  credits: CreditRow[];
  otherAlbumsByArtist: OtherAlbumEntry[];
  artistMoment: NarrativeStatement[];
  worldContext: NarrativeStatement[];
  musicalScene: NarrativeStatement[];
  performance: PerformanceRecordRow[] | null;
  receptionVsLegacy: NarrativeStatement[];
  curiosities: CuriosityRow[];
  influence: InfluenceRow[];
  recommendations: RecommendationRow[];
}

export type AlbumContextResult =
  | { state: "ready"; body: AlbumContextBody }
  | { state: "pending" }
  | { state: "not_found" };

interface GenerateAllFacetsResult {
  facets: Record<NarrativeFacet, NarrativeStatement[]>;
  credits: CreditRow[];
}

async function generateAllFacets(
  album: AlbumRow,
  artist: ArtistRow | null,
  existingArticles: Array<{ id: string; status: string } | null>,
  reviews: ReviewRow[],
  existingCredits: CreditRow[],
  deps: AlbumContextDeps
): Promise<GenerateAllFacetsResult> {
  const facetsToGenerate = FACETS.filter((_facet, index) => existingArticles[index]?.status !== "published");

  const [sameEraAlbums, historicalEvents, ingested] = await Promise.all([
    deps.findSameEraAlbums(album),
    deps.findHistoricalEvents(album.release_date),
    deps.ingestAlbum({ artistName: artist?.name ?? "", albumTitle: album.title })
  ]);

  const credits =
    existingCredits.length === 0 && ingested.credits.length > 0
      ? await deps.persistCredits(album.id, ingested.credits)
      : existingCredits;

  const contextExcerpts = ingested.contextFacts.map((fact, index) => ({
    id: `ctx-${index}`,
    text: fact.text
  }));
  const reviewExcerpts = reviews.map((review, index) => ({
    id: `review-${index}`,
    text: review.summary
  }));
  const sourceExcerpts = [...contextExcerpts, ...reviewExcerpts];

  const synthesized = await synthesizeNarrative(
    {
      albumTitle: album.title,
      artistName: artist?.name ?? "",
      structuredData: { releaseDate: album.release_date, label: album.label, genre: album.genre },
      sameEraAlbums,
      historicalEvents,
      sourceExcerpts
    },
    deps.gptClient,
    facetsToGenerate
  );

  const result = {} as Record<NarrativeFacet, NarrativeStatement[]>;

  for (const [index, facet] of FACETS.entries()) {
    const existing = existingArticles[index];

    if (existing?.status === "published") {
      result[facet] = await deps.narrativeArticles.findStatementsByArticleId(existing.id);
      continue;
    }

    const facetResult = synthesized.facets[facet];
    const article = existing ?? (await deps.narrativeArticles.createPending(album.id, facet));

    if (facetResult.generationFailed) {
      await deps.narrativeArticles.markFailedValidation(article.id);
      result[facet] = [];
      continue;
    }

    const statements = facetResult.statements;
    const validation = validateStatements(statements, sourceExcerpts.map((s) => s.text));

    if (validation.valid) {
      await deps.narrativeArticles.publish(
        article.id,
        statements.map((statement, order) => ({ ...statement, order }))
      );
      result[facet] = statements;
    } else {
      await deps.narrativeArticles.markFailedValidation(article.id);
      result[facet] = [];
    }
  }

  return { facets: result, credits };
}

async function resolveRecommendations(
  album: AlbumRow,
  deps: AlbumContextDeps
): Promise<RecommendationRow[]> {
  const existing = await deps.recommendations.findBySubjectAlbumId(album.id);
  if (existing.length > 0) {
    return existing;
  }

  const [candidates, influencedIds] = await Promise.all([
    deps.findRecommendationCandidates(album.id),
    deps.findDirectlyInfluencedAlbumIds(album.id)
  ]);

  const derived = deriveRecommendations(
    { id: album.id, title: album.title, releaseDate: new Date(album.release_date), genre: album.genre },
    candidates,
    influencedIds
  );

  return Promise.all(
    derived.map((recommendation) =>
      deps.recommendations.create({ subject_album_id: album.id, ...recommendation })
    )
  );
}

export async function assembleAlbumContext(albumId: string, deps: AlbumContextDeps): Promise<AlbumContextResult> {
  const album = await deps.findAlbum(albumId);
  if (!album) {
    return { state: "not_found" };
  }

  const artist = await deps.findArtistById(album.artist_id);

  const existingArticles = await Promise.all(
    FACETS.map((facet) => deps.narrativeArticles.findByAlbumAndFacet(albumId, facet))
  );

  if (existingArticles.some((article) => article?.status === "pending")) {
    return { state: "pending" };
  }

  const [tracks, existingCredits, artistAlbums, performance, reviews, curiosities, influence, recommendations] =
    await Promise.all([
      deps.findTracks(albumId),
      deps.findCredits(albumId),
      deps.findAlbumsByArtistId(album.artist_id),
      deps.findPerformanceRecords(albumId),
      deps.findReviews(albumId),
      deps.findCuriosities(albumId),
      deps.findInfluences(albumId),
      resolveRecommendations(album, deps)
    ]);

  const otherAlbumsByArtist: OtherAlbumEntry[] = artistAlbums
    .filter((a) => a.id !== album.id)
    .map((a) => ({ albumId: a.id, title: a.title, releaseYear: a.release_date.slice(0, 4) }));

  let facetStatements: Record<NarrativeFacet, NarrativeStatement[]>;
  let credits: CreditRow[] = existingCredits;

  if (existingArticles.every((article) => article?.status === "published")) {
    const statementsPerFacet = await Promise.all(
      existingArticles.map((article) => deps.narrativeArticles.findStatementsByArticleId(article!.id))
    );
    facetStatements = FACETS.reduce(
      (acc, facet, index) => ({ ...acc, [facet]: statementsPerFacet[index] }),
      {} as Record<NarrativeFacet, NarrativeStatement[]>
    );
  } else {
    const generated = await generateAllFacets(album, artist, existingArticles, reviews, existingCredits, deps);
    facetStatements = generated.facets;
    credits = generated.credits;
  }

  const hook = await deriveAlbumHook(albumId, deps.narrativeArticles);

  return {
    state: "ready",
    body: {
      header: {
        title: album.title,
        artist: artist?.name ?? "",
        releaseDate: album.release_date,
        genre: album.genre,
        label: album.label,
        durationSeconds: album.duration_seconds,
        trackCount: album.track_count,
        coverArtUrl: album.cover_art_url,
        hook
      },
      tracks,
      credits,
      otherAlbumsByArtist,
      artistMoment: facetStatements.artist_moment,
      worldContext: facetStatements.world_context,
      musicalScene: facetStatements.musical_scene,
      performance: performance.length > 0 ? performance : null,
      receptionVsLegacy: facetStatements.reception_vs_legacy,
      curiosities,
      influence,
      recommendations
    }
  };
}
