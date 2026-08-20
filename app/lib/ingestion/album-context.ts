import type { AlbumRow, ArtistRow, CreditRow, TrackRow } from "../db/album";
import type { PerformanceRecordRow } from "../db/performance-record";
import type { ReviewRow } from "../db/review";
import type { CuriosityRow } from "../db/curiosity";
import type { InfluenceRow } from "../db/influence";
import type { NarrativeArticleRepository } from "../db/narrative-article";
import type { RecommendationCandidateAlbum, RecommendationRepository, RecommendationRow } from "../db/recommendation";
import { deriveRecommendations } from "../db/recommendation";
import type { ChatCompletionClient } from "../ai/client";
import type { FacetResult, HistoricalEventRef, NarrativeFacet, NarrativeStatement, SameEraAlbumRef } from "../ai/narrative";
import { synthesizeNarrative } from "../ai/narrative";
import { validateStatements } from "../ai/publishing-gate";
import { synthesizeCuriosities, synthesizeInfluence, type GeneratedFactItem } from "../ai/curiosity-influence";
import type { IngestedAlbum } from "./ingest-album";
import type { ProviderSourceRef, RawCreditData, RawPerformanceRecordData, RawTrackData } from "../providers/provider.interface";
import { deriveAlbumHook } from "../discovery/hook";

const FACETS: NarrativeFacet[] = ["artist_moment", "world_context", "musical_scene", "reception_vs_legacy"];
const SUMMARY_FACET: NarrativeFacet = "album_summary";

function needsGeneration(article: { id: string; status: string } | null): boolean {
  return article === null || article.status === "stale";
}

function isResolved(article: { id: string; status: string } | null): article is { id: string; status: string } {
  return article !== null && article.status !== "stale";
}

export type SourceExcerptRef = { id: string } & (
  | { kind: "context"; source: ProviderSourceRef }
  | { kind: "review"; sourceId: string }
);

export interface AlbumContextDeps {
  findAlbum(albumId: string): Promise<AlbumRow | null>;
  findArtistById(artistId: string): Promise<ArtistRow | null>;
  findTracks(albumId: string): Promise<TrackRow[]>;
  persistTracks(albumId: string, tracks: RawTrackData[]): Promise<TrackRow[]>;
  fetchTracks(externalId: string): Promise<RawTrackData[]>;
  findCredits(albumId: string): Promise<CreditRow[]>;
  persistCredits(albumId: string, credits: RawCreditData[]): Promise<CreditRow[]>;
  findAlbumsByArtistId(artistId: string): Promise<AlbumRow[]>;
  findPerformanceRecords(albumId: string): Promise<PerformanceRecordRow[]>;
  persistPerformanceRecords(albumId: string, records: RawPerformanceRecordData[]): Promise<PerformanceRecordRow[]>;
  findReviews(albumId: string): Promise<ReviewRow[]>;
  findCuriosities(albumId: string): Promise<CuriosityRow[]>;
  persistCuriosities(albumId: string, items: GeneratedFactItem[], sourceRefs: SourceExcerptRef[]): Promise<CuriosityRow[]>;
  findInfluences(albumId: string): Promise<InfluenceRow[]>;
  persistInfluence(albumId: string, items: GeneratedFactItem[], sourceRefs: SourceExcerptRef[]): Promise<InfluenceRow[]>;
  findSameEraAlbums(album: AlbumRow): Promise<SameEraAlbumRef[]>;
  findHistoricalEvents(releaseDate: string): Promise<HistoricalEventRef[]>;
  findArtistDiscography(artist: ArtistRow): Promise<DiscographyEntry[]>;
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
  albumId?: string;
  externalId?: string;
  query?: string;
  title: string;
  releaseYear: string;
  isCurrent: boolean;
  description: string | null;
}

export interface DiscographyEntry {
  title: string;
  releaseYear: string;
  externalId: string;
}

export function normalizeAlbumTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[([][^)\]]*[)\]]/g, "")
    .replace(/[-–—].*$/, "")
    .trim();
}

export interface InfluenceEntry {
  id: string;
  artistName: string;
  explanation: string;
  albumId?: string;
}

export interface RecommendationEntry {
  id: string;
  albumId: string;
  title: string;
  artistName: string;
  releaseYear: string;
  coverArtUrl?: string;
  reason: RecommendationRow["reason"];
  explanation: string;
}

export interface AlbumContextBody {
  header: AlbumContextHeader;
  tracks: TrackRow[];
  credits: CreditRow[];
  otherAlbumsByArtist: OtherAlbumEntry[];
  artistMoment: NarrativeStatement[];
  worldContext: NarrativeStatement[];
  musicalScene: NarrativeStatement[];
  sameEraAlbums: SameEraAlbumRef[];
  performance: PerformanceRecordRow[] | null;
  receptionVsLegacy: NarrativeStatement[];
  curiosities: CuriosityRow[];
  influence: InfluenceEntry[];
  recommendations: RecommendationEntry[];
}

export type AlbumContextResult =
  | { state: "ready"; body: AlbumContextBody }
  | { state: "pending" }
  | { state: "not_found" };

interface GenerateAllFacetsResult {
  facets: Record<NarrativeFacet, NarrativeStatement[]>;
  summary: NarrativeStatement[];
  credits: CreditRow[];
  tracks: TrackRow[];
  performance: PerformanceRecordRow[];
  curiosities: CuriosityRow[];
  influence: InfluenceRow[];
}

async function persistIfMissing<TExisting, TRaw>(
  existing: TExisting[],
  raw: TRaw[],
  persist: () => Promise<TExisting[]>
): Promise<TExisting[]> {
  if (existing.length > 0 || raw.length === 0) {
    return existing;
  }
  try {
    return await persist();
  } catch (error) {
    console.error("Failed to persist ingested data, keeping existing records", error);
    return existing;
  }
}

async function synthesizeAndPersist<TRow>(
  existing: TRow[],
  synthesize: () => Promise<{ items: GeneratedFactItem[]; generationFailed?: boolean }>,
  sourceExcerpts: Array<{ id: string; text: string }>,
  persist: (items: GeneratedFactItem[]) => Promise<TRow[]>
): Promise<TRow[]> {
  if (existing.length > 0) {
    return existing;
  }
  try {
    const { items, generationFailed } = await synthesize();
    if (generationFailed || items.length === 0) {
      return existing;
    }
    const validation = validateStatements(items, sourceExcerpts.map((excerpt) => excerpt.text));
    if (!validation.valid) {
      return existing;
    }
    return await persist(items);
  } catch (error) {
    console.error("Failed to synthesize or persist AI-generated facts, keeping existing records", error);
    return existing;
  }
}

async function publishFacet(
  facet: NarrativeFacet,
  existing: { id: string; status: string } | null,
  facetResult: FacetResult,
  sourceExcerpts: Array<{ id: string; text: string }>,
  albumId: string,
  deps: AlbumContextDeps
): Promise<NarrativeStatement[]> {
  if (existing?.status === "published") {
    return deps.narrativeArticles.findStatementsByArticleId(existing.id);
  }

  if (existing?.status === "failed_validation") {
    return [];
  }

  const article = existing ?? (await deps.narrativeArticles.createPending(albumId, facet));

  if (facetResult.generationFailed || facetResult.statements.length === 0) {
    console.error(`Facet ${facet} failed to generate for album ${albumId}`, facetResult);
    await deps.narrativeArticles.markFailedValidation(article.id);
    return [];
  }

  const validation = validateStatements(facetResult.statements, sourceExcerpts.map((s) => s.text));

  if (!validation.valid) {
    console.error(`Facet ${facet} failed validation for album ${albumId}`, validation.failures, facetResult.statements);
    await deps.narrativeArticles.markFailedValidation(article.id);
    return [];
  }

  await deps.narrativeArticles.publish(
    article.id,
    facetResult.statements.map((statement, order) => ({ ...statement, order }))
  );
  return facetResult.statements;
}

async function generateAllFacets(
  album: AlbumRow,
  artist: ArtistRow | null,
  sameEraAlbums: SameEraAlbumRef[],
  existingArticles: Array<{ id: string; status: string } | null>,
  existingSummaryArticle: { id: string; status: string } | null,
  reviews: ReviewRow[],
  existingCredits: CreditRow[],
  existingTracks: TrackRow[],
  existingPerformance: PerformanceRecordRow[],
  existingCuriosities: CuriosityRow[],
  existingInfluence: InfluenceRow[],
  deps: AlbumContextDeps
): Promise<GenerateAllFacetsResult> {
  const facetsToGenerate = FACETS.filter((_facet, index) => needsGeneration(existingArticles[index]));
  const summaryNeedsGeneration = needsGeneration(existingSummaryArticle);
  const allFacetsToGenerate = summaryNeedsGeneration ? [...facetsToGenerate, SUMMARY_FACET] : facetsToGenerate;

  const [historicalEvents, ingested] = await Promise.all([
    facetsToGenerate.includes("world_context") ? deps.findHistoricalEvents(album.release_date) : Promise.resolve([]),
    deps.ingestAlbum({ artistName: artist?.name ?? "", albumTitle: album.title })
  ]);

  const [credits, tracks, performance] = await Promise.all([
    persistIfMissing(existingCredits, ingested.credits, () => deps.persistCredits(album.id, ingested.credits)),
    (async () => {
      if (existingTracks.length > 0 || !ingested.externalId) {
        return existingTracks;
      }
      const rawTracks = await deps.fetchTracks(ingested.externalId);
      return persistIfMissing(existingTracks, rawTracks, () => deps.persistTracks(album.id, rawTracks));
    })(),
    persistIfMissing(existingPerformance, ingested.performanceRecords, () =>
      deps.persistPerformanceRecords(album.id, ingested.performanceRecords)
    )
  ]);

  const contextExcerpts = ingested.contextFacts.map((fact, index) => ({
    id: `ctx-${index}`,
    text: fact.text
  }));
  const reviewExcerpts = reviews.map((review, index) => ({
    id: `review-${index}`,
    text: review.summary
  }));
  const sourceExcerpts = [...contextExcerpts, ...reviewExcerpts];

  const sourceRefs: SourceExcerptRef[] = [
    ...ingested.contextFacts.map((fact, index) => ({ id: `ctx-${index}`, kind: "context" as const, source: fact.source })),
    ...reviews.map((review, index) => ({ id: `review-${index}`, kind: "review" as const, sourceId: review.source_id }))
  ];

  const factInput = { albumTitle: album.title, artistName: artist?.name ?? "", sourceExcerpts };

  const artistSummary = ingested.artistProfile.summary;
  const influenceSourceExcerpts = artistSummary
    ? [...sourceExcerpts, { id: "artist-ctx", text: artistSummary.text }]
    : sourceExcerpts;
  const influenceSourceRefs: SourceExcerptRef[] = artistSummary
    ? [...sourceRefs, { id: "artist-ctx", kind: "context" as const, source: artistSummary.source }]
    : sourceRefs;
  const influenceFactInput = {
    ...factInput,
    sourceExcerpts: influenceSourceExcerpts,
    confirmedInfluences: {
      influencedBy: ingested.artistProfile.influencedBy,
      influenced: ingested.artistProfile.influenced
    }
  };

  const [synthesized, curiosities, influence] = await Promise.all([
    synthesizeNarrative(
      {
        albumTitle: album.title,
        artistName: artist?.name ?? "",
        structuredData: { releaseDate: album.release_date, label: album.label, genre: album.genre },
        sameEraAlbums,
        historicalEvents,
        sourceExcerpts
      },
      deps.gptClient,
      allFacetsToGenerate
    ),
    synthesizeAndPersist(
      existingCuriosities,
      () => synthesizeCuriosities(factInput, deps.gptClient),
      sourceExcerpts,
      (items) => deps.persistCuriosities(album.id, items, sourceRefs)
    ),
    synthesizeAndPersist(
      existingInfluence,
      () => synthesizeInfluence(influenceFactInput, deps.gptClient),
      influenceSourceExcerpts,
      (items) => deps.persistInfluence(album.id, items, influenceSourceRefs)
    )
  ]);

  const result = {} as Record<NarrativeFacet, NarrativeStatement[]>;

  for (const [index, facet] of FACETS.entries()) {
    result[facet] = await publishFacet(
      facet,
      existingArticles[index],
      synthesized.facets[facet],
      sourceExcerpts,
      album.id,
      deps
    );
  }

  const summaryResult = synthesized.facets[SUMMARY_FACET];
  const summary = await publishFacet(
    SUMMARY_FACET,
    existingSummaryArticle,
    summaryResult && {
      ...summaryResult,
      statements: summaryResult.statements.map((statement) => ({ ...statement, kind: "interpretation" as const, sourceIds: [] }))
    },
    sourceExcerpts,
    album.id,
    deps
  );

  return { facets: result, summary, credits, tracks, performance, curiosities, influence };
}

async function enrichInfluence(influences: InfluenceRow[], deps: AlbumContextDeps): Promise<InfluenceEntry[]> {
  return Promise.all(
    influences.map(async (influence) => {
      let artistName = "";
      if (influence.to_artist_id) {
        artistName = (await deps.findArtistById(influence.to_artist_id))?.name ?? "";
      } else if (influence.to_album_id) {
        const toAlbum = await deps.findAlbum(influence.to_album_id);
        artistName = toAlbum ? (await deps.findArtistById(toAlbum.artist_id))?.name ?? "" : "";
      }
      return {
        id: influence.id,
        artistName,
        explanation: influence.explanation,
        albumId: influence.to_album_id
      };
    })
  );
}

async function enrichRecommendations(
  recommendations: RecommendationRow[],
  deps: AlbumContextDeps
): Promise<RecommendationEntry[]> {
  return Promise.all(
    recommendations.map(async (recommendation) => {
      const recommendedAlbum = await deps.findAlbum(recommendation.recommended_album_id);
      const artist = recommendedAlbum ? await deps.findArtistById(recommendedAlbum.artist_id) : null;
      return {
        id: recommendation.id,
        albumId: recommendation.recommended_album_id,
        title: recommendedAlbum?.title ?? "",
        artistName: artist?.name ?? "",
        releaseYear: recommendedAlbum?.release_date.slice(0, 4) ?? "",
        coverArtUrl: recommendedAlbum?.cover_art_url,
        reason: recommendation.reason,
        explanation: recommendation.explanation
      };
    })
  );
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

  const [existingArticles, existingSummaryArticle] = await Promise.all([
    Promise.all(FACETS.map((facet) => deps.narrativeArticles.findByAlbumAndFacet(albumId, facet))),
    deps.narrativeArticles.findByAlbumAndFacet(albumId, SUMMARY_FACET)
  ]);

  if (existingArticles.some((article) => article?.status === "pending") || existingSummaryArticle?.status === "pending") {
    return { state: "pending" };
  }

  const [
    existingTracks,
    existingCredits,
    artistAlbums,
    existingPerformance,
    reviews,
    existingCuriosities,
    existingInfluence,
    recommendations,
    sameEraAlbums,
    discography
  ] = await Promise.all([
    deps.findTracks(albumId),
    deps.findCredits(albumId),
    deps.findAlbumsByArtistId(album.artist_id),
    deps.findPerformanceRecords(albumId),
    deps.findReviews(albumId),
    deps.findCuriosities(albumId),
    deps.findInfluences(albumId),
    resolveRecommendations(album, deps),
    deps.findSameEraAlbums(album),
    artist ? deps.findArtistDiscography(artist) : Promise.resolve([])
  ]);

  let facetStatements: Record<NarrativeFacet, NarrativeStatement[]>;
  let credits: CreditRow[] = existingCredits;
  let tracks: TrackRow[] = existingTracks;
  let performance: PerformanceRecordRow[] = existingPerformance;
  let curiosities: CuriosityRow[] = existingCuriosities;
  let influence: InfluenceRow[] = existingInfluence;

  if (existingArticles.every(isResolved) && isResolved(existingSummaryArticle)) {
    const statementsPerFacet = await Promise.all(
      existingArticles.map((article) =>
        article!.status === "published" ? deps.narrativeArticles.findStatementsByArticleId(article!.id) : Promise.resolve([])
      )
    );
    facetStatements = FACETS.reduce(
      (acc, facet, index) => ({ ...acc, [facet]: statementsPerFacet[index] }),
      {} as Record<NarrativeFacet, NarrativeStatement[]>
    );
  } else {
    const generated = await generateAllFacets(
      album,
      artist,
      sameEraAlbums,
      existingArticles,
      existingSummaryArticle,
      reviews,
      existingCredits,
      existingTracks,
      existingPerformance,
      existingCuriosities,
      existingInfluence,
      deps
    );
    facetStatements = generated.facets;
    credits = generated.credits;
    tracks = generated.tracks;
    performance = generated.performance;
    curiosities = generated.curiosities;
    influence = generated.influence;
  }

  const hook = await deriveAlbumHook(albumId, deps.narrativeArticles);

  const localEntries: OtherAlbumEntry[] = await Promise.all(
    artistAlbums.map(async (a) => {
      const isCurrent = a.id === album.id;
      const description = isCurrent ? hook : await deriveAlbumHook(a.id, deps.narrativeArticles);
      return { albumId: a.id, title: a.title, releaseYear: a.release_date.slice(0, 4), isCurrent, description };
    })
  );

  const localTitleKeys = new Set(artistAlbums.map((a) => normalizeAlbumTitle(a.title)));
  const spotifyOnlyEntries: OtherAlbumEntry[] = discography
    .filter((entry) => !localTitleKeys.has(normalizeAlbumTitle(entry.title)))
    .map((entry) => ({
      title: entry.title,
      releaseYear: entry.releaseYear,
      isCurrent: false,
      description: null,
      externalId: entry.externalId,
      query: `${artist?.name ?? ""} ${entry.title}`.trim()
    }));

  const otherAlbumsByArtist: OtherAlbumEntry[] = [...localEntries, ...spotifyOnlyEntries].sort((a, b) =>
    a.releaseYear.localeCompare(b.releaseYear)
  );

  const [enrichedInfluence, enrichedRecommendations] = await Promise.all([
    enrichInfluence(influence, deps),
    enrichRecommendations(recommendations, deps)
  ]);

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
      sameEraAlbums,
      performance: performance.length > 0 ? performance : null,
      receptionVsLegacy: facetStatements.reception_vs_legacy,
      curiosities,
      influence: enrichedInfluence,
      recommendations: enrichedRecommendations
    }
  };
}
