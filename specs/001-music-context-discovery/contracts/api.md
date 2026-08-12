# API Contract: Music Context Backend

**Date**: 2026-08-11 | **Data model**: [../data-model.md](../data-model.md)

This is the only interface the frontend is allowed to call (Project Structure decision in
plan.md — no direct frontend-to-external-provider calls). All responses are pt-BR content
per FR-030. All endpoints are read-only for the MVP (no write/auth endpoints — anonymous,
account-free MVP per spec Assumptions).

## `GET /search`

- **Query**: `q` (string, required), `type` (optional: `artist` | `album` | `track`)
- **200**: `{ results: [{ id, type, title, artistName, releaseDate?, coverArtUrl? }] }`
  — disambiguates same-titled works by including `artistName` and `releaseDate` (Edge Case:
  duplicate titles)
- **200 empty**: `{ results: [] }` — frontend renders explicit "no results" state (Edge
  Case: no matches)
- Satisfies: FR-001

## `GET /albums/{albumId}/context`

- **200**: `{ header: {...Album header fields}, careerMoment, musicalScene, worldContext:
  HistoricalEvent[], timeline: TimelineEvent[], performance: ChartEntry[] | null,
  reception: Review[], legacy, sameEra: RelatedAlbum[] }`
- `worldContext` is the curated "what was happening in the world" selection (FR-011a), built
  with the same relevance-scoring/category-cap curation rule used by `GET /periods`'
  `culturalEvents`
- `performance: null` when no `ChartEntry` exists — frontend renders the "unavailable" state,
  never a fabricated figure (FR-007)
- Every narrative field (`careerMoment`, `musicalScene`, `legacy`) is a `ContextArticle`
  `statements[]` array (fact/interpretation/critical_opinion/unconfirmed + `sourceIds`), not
  a single opaque string, so the frontend can render source links per statement (FR-015,
  FR-016)
- **404**: unknown `albumId`
- **202**: `{ status: "pending" }` when the `ContextArticle` is still generating for a
  first-ever view (see Performance Goals in plan.md) — frontend polls or shows a "preparing"
  state
- Satisfies: FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011a

## `GET /tracks/{trackId}/context`

- Same response shape as `/albums/{albumId}/context` minus `header.trackCount` — used when a
  search result resolves to a standalone single with no parent album (resolved
  clarification in spec.md)

## `GET /periods`

- **Query**: one of `year`, `year+month`, or `decade` (mutually exclusive)
- **200**: `{ releases: [...], risingArtists: [...], topSingles: [...],
  culturalEvents: HistoricalEvent[] }`
- Sparse periods return partial arrays, never padded filler (Edge Case: sparse period data)
- Satisfies: FR-019

## `GET /home`

- **200**: `{ onThisDay: { title, albumId } | null, decades: [...], featuredAlbums: [...] }`
- Satisfies: FR-020

## `GET /compare`

- **Query**: `a` (albumId or trackId, required), `b` (albumId or trackId, required)
- **200**: `{ a: ComparisonView, b: ComparisonView }` where each `ComparisonView` mirrors the
  comparison dimensions in FR-021 (date, performance, charts, singles, reception, genre,
  context, impact, legacy), with per-dimension `null` when unavailable for that side
  (Edge Case: missing dimension data)
- **400**: `a` and `b` resolve to the same underlying release (Edge Case: comparing an album
  to itself/its own reissue)
- Satisfies: FR-021

## `GET /albums/{albumId}/recommendations`

- **200**: `{ recommendations: [{ albumId, reason, explanation }] }` — `reason` is one of the
  `Recommendation.reason` enum values from data-model.md; `explanation` is the pt-BR text
  shown to the user (acceptance scenario: "each recommendation states why")
- Satisfies: FR-022

## Cross-cutting contract rules

- Every object that can carry a factual claim (`ChartEntry`, `Review`, `TimelineEvent`,
  `HistoricalEvent`, and each `ContextArticle` statement) includes a `source` reference
  resolvable via a source detail (`sourceUrl`, `publishedOrRetrievedDate`, and
  `attributionText` when required) — never returned as a bare unsourced fact (FR-016).
- No endpoint returns full song lyrics or copied review/article text (FR-023, FR-024).
- Rate-limit/backoff handling against upstream providers happens entirely inside the
  backend; the contract surface never exposes provider-specific errors — a provider outage
  degrades the relevant section to "unavailable" rather than failing the whole response.
