# Contract: Server Actions & Route Handlers

**Date**: 2026-08-12 | **Data model**: [../data-model.md](../data-model.md)

Per constitution Principle I, Client Components never call an external provider or Supabase
directly — every interaction below is the only surface Client Components are allowed to call.
All responses are pt-BR content per the spec's Assumptions. Every action here is read-triggering
only (no user-owned data to mutate in this feature — see plan.md's Constitution Check note).

## `searchCatalog(query: string): Promise<SearchResult[]>`

- **Location**: `app/actions/search.ts`
- **Input**: free-text `query` (artist name or album title)
- **Output**: `SearchResult[]` — `{ albumId, title, artistName, releaseDate, coverArtUrl? }[]`,
  disambiguated by including `artistName` and `releaseDate` when titles repeat (Edge Case:
  duplicate titles)
- **Empty**: `[]` — the page renders an explicit "nenhum resultado" state
- Satisfies: FR-001

## `getAlbumContext(albumId: string): Promise<AlbumContextResult>`

- **Location**: `app/actions/album-context.ts`
- **Output**: a discriminated result —
  - `{ state: "ready", header, artistMoment, worldContext, musicalScene, performance: PerformanceRecord[] | null, receptionVsLegacy, curiosities: Curiosity[], influence: Influence[], recommendations: Recommendation[] }`
  - `{ state: "pending" }` — first-ever view still generating (see plan.md Performance Goals)
  - `{ state: "not_found" }`
- Every narrative field (`artistMoment`, `worldContext`, `musicalScene`, `receptionVsLegacy`) is a
  `NarrativeArticle.statements[]` array (fact/interpretation/critical_opinion/unconfirmed +
  `sourceIds`), never a single opaque string, so the UI can render a source link per statement
  (FR-014, FR-015)
- `performance: null` when no `PerformanceRecord` exists — the UI renders the "unavailable" state,
  never a fabricated figure (FR-007)
- `curiosities[]` items each carry `status` (`confirmed` | `unconfirmed` | `disputed`) that the
  UI MUST render visibly, never silently normalized to "confirmed" (FR-009, FR-013)
- Satisfies: FR-002 through FR-011

## `getYearSnapshot(year: number): Promise<YearSnapshotResult>`

- **Location**: `app/actions/year-explorer.ts`
- **Output**: `{ narrativeIntro, releases: AlbumSummary[], topHits: TrackSummary[], culturalEvents: HistoricalEvent[] }`
- Sparse years return partial arrays, never padded filler (Edge Case: sparse year data)
- Satisfies: FR-018

## `compareAlbums(albumIdA: string, albumIdB: string): Promise<CompareResult>`

- **Location**: `app/actions/compare.ts`
- **Output**: `{ a: ComparisonView, b: ComparisonView }` where each `ComparisonView` mirrors
  release date, performance, reception-then-vs-legacy-now, per FR-019, with per-dimension `null`
  when unavailable for that side (Edge Case: missing dimension data)
- **Rejected**: comparing an album to itself or to a different edition of the same underlying
  album returns `{ error: "same_album" }` instead of a nonsensical comparison (FR-020)
- Satisfies: FR-019, FR-020

## Route Handler: `GET /auth/callback` (reserved, not exercised by this feature)

- Per constitution Principle III, Route Handlers are reserved for cases a Server Action cannot
  cover (OAuth callbacks, webhooks). This feature introduces no accounts, so no such handler is
  needed yet; documented here only so a future auth feature knows where it plugs in.

## Cross-cutting contract rules

- Every object that can carry a factual claim (`PerformanceRecord`, `Review`, `HistoricalEvent`,
  `Curiosity`, `Influence`, and each `NarrativeArticle` statement) includes a `sourceId`
  resolvable to a source detail (`url`, `publishedOrRetrievedDate`, and `attributionText` when
  required) — never returned as a bare unsourced fact (FR-015).
- No action returns full song lyrics or copied review/article text (FR-021).
- The first-time-generation path for `getAlbumContext` is rate-limited per client IP
  (research.md §8); rate-limit rejections surface as a normal "tente novamente em breve" result,
  never a raw error.
