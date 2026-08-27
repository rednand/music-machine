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
import { deriveAlbumHook, deriveAlbumFullHook } from "../discovery/hook";

const FACETS: NarrativeFacet[] = ["artist_moment", "world_context", "musical_scene", "reception_vs_legacy"];
const SUMMARY_FACET: NarrativeFacet = "album_summary";
const MAX_EXCERPT_LENGTH = 800;

function truncateExcerpt(text: string): string {
  return text.length > MAX_EXCERPT_LENGTH ? `${text.slice(0, MAX_EXCERPT_LENGTH)}…` : text;
}

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
  findListPlacements(artistName: string, albumTitle: string): Promise<ListPlacementEntry[]>;
  dedupeNarrativeTrigger(albumId: string): boolean;
  scheduleBackgroundWork(run: () => Promise<void>): void;
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

export interface ListPlacementEntry {
  listName: string;
  position: number;
}

export interface TechnicalSheetBody {
  header: AlbumContextHeader;
  tracks: TrackRow[];
  credits: CreditRow[];
  otherAlbumsByArtist: OtherAlbumEntry[];
  sameEraAlbums: SameEraAlbumRef[];
  performance: PerformanceRecordRow[] | null;
  recommendations: RecommendationEntry[];
  listPlacements: ListPlacementEntry[];
}

export type TechnicalSheetResult =
  | { state: "ready"; body: TechnicalSheetBody }
  | { state: "not_found" }
  | { state: "error"; message: string };

export type GenerationStatus = "not_started" | "in_progress" | "ready";

export interface NarrativeBody {
  artistMoment: NarrativeStatement[];
  worldContext: NarrativeStatement[];
  musicalScene: NarrativeStatement[];
  receptionVsLegacy: NarrativeStatement[];
  summary: NarrativeStatement[];
  curiosities: CuriosityRow[];
  influence: InfluenceEntry[];
  failedFacets: NarrativeFacet[];
}

export type NarrativeResult =
  | { state: "not_found" }
  | { state: "not_started" }
  | { state: "in_progress" }
  | { state: "ready"; body: NarrativeBody }
  | { state: "error" };

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

async function markFacetFailedIfUnresolved(
  facet: NarrativeFacet,
  existing: { id: string; status: string } | null,
  albumId: string,
  deps: AlbumContextDeps
): Promise<void> {
  if (isResolved(existing)) {
    return;
  }
  try {
    const article = existing ?? (await deps.narrativeArticles.createPending(albumId, facet));
    await deps.narrativeArticles.markFailedValidation(article.id);
  } catch (error) {
    console.error(`Failed to mark facet ${facet} as failed for album ${albumId}`, error);
  }
}

async function generateNarrative(
  album: AlbumRow,
  artist: ArtistRow | null,
  sameEraAlbums: SameEraAlbumRef[],
  existingArticles: Array<{ id: string; status: string } | null>,
  existingSummaryArticle: { id: string; status: string } | null,
  reviews: ReviewRow[],
  existingCuriosities: CuriosityRow[],
  existingInfluence: InfluenceRow[],
  ingestedHint: IngestedAlbum | undefined,
  deps: AlbumContextDeps
): Promise<void> {
  try {
    const facetsToGenerate = FACETS.filter((_facet, index) => needsGeneration(existingArticles[index]));
    const summaryNeedsGeneration = needsGeneration(existingSummaryArticle);
    const allFacetsToGenerate = summaryNeedsGeneration ? [...facetsToGenerate, SUMMARY_FACET] : facetsToGenerate;

    const [historicalEvents, ingested] = await Promise.all([
      facetsToGenerate.includes("world_context") ? deps.findHistoricalEvents(album.release_date) : Promise.resolve([]),
      ingestedHint ?? deps.ingestAlbum({ artistName: artist?.name ?? "", albumTitle: album.title })
    ]);

    const contextExcerpts = ingested.contextFacts.map((fact, index) => ({
      id: `ctx-${index}`,
      text: truncateExcerpt(fact.text)
    }));
    const reviewExcerpts = reviews.map((review, index) => ({
      id: `review-${index}`,
      text: truncateExcerpt(review.summary)
    }));
    const sourceExcerpts = [...contextExcerpts, ...reviewExcerpts];

    const sourceRefs: SourceExcerptRef[] = [
      ...ingested.contextFacts.map((fact, index) => ({ id: `ctx-${index}`, kind: "context" as const, source: fact.source })),
      ...reviews.map((review, index) => ({ id: `review-${index}`, kind: "review" as const, sourceId: review.source_id }))
    ];

    const factInput = { albumTitle: album.title, artistName: artist?.name ?? "", sourceExcerpts };

    const artistSummary = ingested.artistProfile.summary;
    const influenceSourceExcerpts = artistSummary
      ? [...sourceExcerpts, { id: "artist-ctx", text: truncateExcerpt(artistSummary.text) }]
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

    const [synthesized] = await Promise.all([
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

    for (const [index, facet] of FACETS.entries()) {
      await publishFacet(facet, existingArticles[index], synthesized.facets[facet], sourceExcerpts, album.id, deps);
    }

    const summaryResult = synthesized.facets[SUMMARY_FACET];
    await publishFacet(
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
  } catch (error) {
    console.error(`Failed to generate narrative for album ${album.id}`, error);
    await Promise.all([
      ...FACETS.map((facet, index) => markFacetFailedIfUnresolved(facet, existingArticles[index], album.id, deps)),
      markFacetFailedIfUnresolved(SUMMARY_FACET, existingSummaryArticle, album.id, deps)
    ]);
  }
}

async function triggerNarrativeGenerationIfNeeded(
  album: AlbumRow,
  artist: ArtistRow | null,
  sameEraAlbums: SameEraAlbumRef[],
  ingestedHint: IngestedAlbum | undefined,
  deps: AlbumContextDeps
): Promise<void> {
  const [existingArticles, existingSummaryArticle] = await Promise.all([
    Promise.all(FACETS.map((facet) => deps.narrativeArticles.findByAlbumAndFacet(album.id, facet))),
    deps.narrativeArticles.findByAlbumAndFacet(album.id, SUMMARY_FACET)
  ]);

  const isPending =
    existingArticles.some((article) => article?.status === "pending") || existingSummaryArticle?.status === "pending";
  const isDone = existingArticles.every(isResolved) && isResolved(existingSummaryArticle);

  if (isPending || isDone) {
    return;
  }

  if (!deps.dedupeNarrativeTrigger(album.id)) {
    return;
  }

  const [reviews, existingCuriosities, existingInfluence] = await Promise.all([
    deps.findReviews(album.id),
    deps.findCuriosities(album.id),
    deps.findInfluences(album.id)
  ]);

  deps.scheduleBackgroundWork(() =>
    generateNarrative(
      album,
      artist,
      sameEraAlbums,
      existingArticles,
      existingSummaryArticle,
      reviews,
      existingCuriosities,
      existingInfluence,
      ingestedHint,
      deps
    )
  );
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

export async function assembleTechnicalSheet(albumId: string, deps: AlbumContextDeps): Promise<TechnicalSheetResult> {
  const album = await deps.findAlbum(albumId);
  if (!album) {
    return { state: "not_found" };
  }

  const artist = await deps.findArtistById(album.artist_id);

  let existingTracks: TrackRow[];
  let existingCredits: CreditRow[];
  let artistAlbums: AlbumRow[];
  let existingPerformance: PerformanceRecordRow[];
  let recommendationRows: RecommendationRow[];
  let sameEraAlbums: SameEraAlbumRef[];
  let discography: DiscographyEntry[];
  let listPlacements: ListPlacementEntry[];

  try {
    [existingTracks, existingCredits, artistAlbums, existingPerformance, recommendationRows, sameEraAlbums, discography, listPlacements] =
      await Promise.all([
        deps.findTracks(albumId),
        deps.findCredits(albumId),
        deps.findAlbumsByArtistId(album.artist_id),
        deps.findPerformanceRecords(albumId),
        resolveRecommendations(album, deps),
        deps.findSameEraAlbums(album),
        artist ? deps.findArtistDiscography(artist) : Promise.resolve([]),
        deps.findListPlacements(artist?.name ?? "", album.title)
      ]);
  } catch (error) {
    console.error(`Failed to load existing technical sheet data for album ${albumId}`, error);
    return { state: "error", message: "Não foi possível carregar os dados técnicos deste álbum." };
  }

  let tracks = existingTracks;
  let credits = existingCredits;
  let performance = existingPerformance;
  let ingested: IngestedAlbum | undefined;

  if (existingTracks.length === 0) {
    try {
      ingested = await deps.ingestAlbum({ artistName: artist?.name ?? "", albumTitle: album.title });
      const ingestedAlbum = ingested;
      [credits, tracks, performance] = await Promise.all([
        persistIfMissing(existingCredits, ingestedAlbum.credits, () => deps.persistCredits(album.id, ingestedAlbum.credits)),
        (async () => {
          if (!ingestedAlbum.externalId) {
            return existingTracks;
          }
          const rawTracks = await deps.fetchTracks(ingestedAlbum.externalId);
          return persistIfMissing(existingTracks, rawTracks, () => deps.persistTracks(album.id, rawTracks));
        })(),
        persistIfMissing(existingPerformance, ingestedAlbum.performanceRecords, () =>
          deps.persistPerformanceRecords(album.id, ingestedAlbum.performanceRecords)
        )
      ]);
    } catch (error) {
      console.error(`Failed to ingest technical sheet for album ${albumId}`, error);
      return { state: "error", message: "Não foi possível buscar os dados técnicos deste álbum." };
    }
  }

  const [hook, briefHook] = await Promise.all([
    deriveAlbumFullHook(albumId, deps.narrativeArticles),
    deriveAlbumHook(albumId, deps.narrativeArticles)
  ]);

  const localEntries: OtherAlbumEntry[] = await Promise.all(
    artistAlbums.map(async (a) => {
      const isCurrent = a.id === album.id;
      const description = isCurrent ? briefHook : await deriveAlbumHook(a.id, deps.narrativeArticles);
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

  const recommendations = await enrichRecommendations(recommendationRows, deps);

  await triggerNarrativeGenerationIfNeeded(album, artist, sameEraAlbums, ingested, deps);

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
      sameEraAlbums,
      performance: performance.length > 0 ? performance : null,
      recommendations,
      listPlacements
    }
  };
}

export async function assembleNarrative(albumId: string, deps: AlbumContextDeps): Promise<NarrativeResult> {
  try {
    const album = await deps.findAlbum(albumId);
    if (!album) {
      return { state: "not_found" };
    }

    const [existingArticles, existingSummaryArticle] = await Promise.all([
      Promise.all(FACETS.map((facet) => deps.narrativeArticles.findByAlbumAndFacet(albumId, facet))),
      deps.narrativeArticles.findByAlbumAndFacet(albumId, SUMMARY_FACET)
    ]);

    if (existingArticles.some((article) => article?.status === "pending") || existingSummaryArticle?.status === "pending") {
      return { state: "in_progress" };
    }

    if (!existingArticles.every(isResolved) || !isResolved(existingSummaryArticle)) {
      return { state: "not_started" };
    }

    const failedFacets: NarrativeFacet[] = [];
    const statementsPerFacet = await Promise.all(
      existingArticles.map((article, index) => {
        if (article!.status === "failed_validation") {
          failedFacets.push(FACETS[index]);
          return Promise.resolve<NarrativeStatement[]>([]);
        }
        return deps.narrativeArticles.findStatementsByArticleId(article!.id);
      })
    );

    let summary: NarrativeStatement[] = [];
    if (existingSummaryArticle.status === "failed_validation") {
      failedFacets.push(SUMMARY_FACET);
    } else {
      summary = await deps.narrativeArticles.findStatementsByArticleId(existingSummaryArticle.id);
    }

    const [curiosities, influenceRows] = await Promise.all([
      deps.findCuriosities(albumId),
      deps.findInfluences(albumId)
    ]);
    const influence = await enrichInfluence(influenceRows, deps);

    const facetStatements = FACETS.reduce(
      (acc, facet, index) => ({ ...acc, [facet]: statementsPerFacet[index] }),
      {} as Record<NarrativeFacet, NarrativeStatement[]>
    );

    return {
      state: "ready",
      body: {
        artistMoment: facetStatements.artist_moment,
        worldContext: facetStatements.world_context,
        musicalScene: facetStatements.musical_scene,
        receptionVsLegacy: facetStatements.reception_vs_legacy,
        summary,
        curiosities,
        influence,
        failedFacets
      }
    };
  } catch (error) {
    console.error(`Failed to read narrative status for album ${albumId}`, error);
    return { state: "error" };
  }
}
