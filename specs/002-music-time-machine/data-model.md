# Data Model: Music Time Machine

**Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Field lists cover what's needed to satisfy the spec's functional requirements; this is not an
exhaustive DB DDL. Every entity that carries a factual claim links to `Source` per FR-014/FR-015.
Per research.md §6, every table below has RLS enabled with a public read-only policy; writes only
ever happen through Server Actions using the service-role client.

## Artist

- `id`, `name`, `slug`, `active_from`, `active_to` (nullable)
- **Relationships**: has many `Album`; many-to-many `Influence` (self-referential, directional,
  with an explanation)

**Validation**: `active_to` (if set) must not precede `active_from`.

## Album

The central subject of a page (FR-002–FR-011).

- `id`, `title`, `slug`, `release_date`, `genre`, `label`, `duration_seconds`, `track_count`,
  `cover_art_url` (provider-supplied, license-scoped per Assumptions), `artist_id`
- **Relationships**: belongs to `Artist`; has many `Track`; has many `Credit`; has many
  `PerformanceRecord`; has many `Review`; has many `Curiosity`; many-to-many `Influence` and
  `Recommendation` (self-referential); curated set of `HistoricalEvent` for its release period
  (queried by date proximity + relevance, not a stored foreign key, per research.md §9)

**Validation**: `release_date` required; `track_count` is omitted/null rather than 0 when
unknown — never fabricated (consistent application of the FR-007 pattern).

## Track

- `id`, `album_id`, `title`, `track_number`, `duration_seconds`

## Credit

A production/performance credit shown in the album header (FR-003).

- `id`, `album_id` (or `track_id` for a track-specific credit), `person_name`, `role` (e.g.,
  producer, engineer, session musician + instrument), `source_id`

## PerformanceRecord

Sales figures, certifications, chart positions, and awards/nominations (FR-007).

- `id`, `album_id`, `kind` (chart_position | certification | sales_figure | award), `label` (e.g.
  chart/award name), `value` (position, certification tier, figure, or award result as text),
  `date`, `source_id`

**Validation**: `source_id` required; absence of any `PerformanceRecord` for an album means the
performance section is omitted (FR-007), never a fabricated placeholder.

## Review

A critical assessment, never the full original text (FR-008, FR-021).

- `id`, `album_id`, `publication`, `rating_or_verdict`, `published_date`, `stance`
  (contemporary | retrospective — distinguishes "recepção inicial" from "legado" reviews),
  `summary` (original synthesis, not copied text), `source_url`, `source_id`

## HistoricalEvent

A dated political/cultural/technological occurrence used for "o mundo na época" (FR-005) and the
year explorer (FR-018).

- `id`, `title`, `date`, `category` (politics | culture | technology | music | film | television
  | society | fashion | historical), `relevance_score`, `summary`, `source_id`

## Curiosity

A verified or disputed behind-the-scenes fact (FR-009).

- `id`, `album_id`, `summary`, `status` (confirmed | unconfirmed | disputed), `source_id`

**Validation**: `status` MUST default to `unconfirmed` unless a source explicitly confirms the
claim; rendering MUST visibly reflect `status` so unconfirmed/disputed items are never presented
as settled fact (FR-009, FR-013).

## Influence

A confirmed, directional historical-influence relationship (FR-010).

- `id`, `from_album_id` (or `from_artist_id`), `to_album_id` (or `to_artist_id`), `explanation`,
  `source_id`

**Validation**: `source_id` required — no speculative influence links without a source.

## Recommendation

A suggested next listen, distinct from confirmed historical `Influence` (FR-011).

- `id`, `subject_album_id`, `recommended_album_id`, `reason` (same_era | same_genre_movement |
  direct_influence | historical_importance), `explanation` (short pt-BR text shown to the user)

## Source

Every factual claim traces to one of these (FR-014–FR-016, FR-022).

- `id`, `type` (official_primary | music_database | journalistic | interview |
  specialized_publication | encyclopedic), `title`, `url`, `published_or_retrieved_date`,
  `license_type` (nullable), `attribution_text` (nullable — required whenever `license_type`
  mandates it, enforced at write time by the ingestion layer)

## NarrativeArticle

The stored, reusable narrative text for one album, one facet at a time (FR-012–FR-014, FR-017).

- `id`, `album_id`, `facet` (artist_moment | world_context | musical_scene |
  reception_vs_legacy), `status` (pending | published | failed_validation | stale), `language`
  (fixed `pt-BR`), `generated_at`
- `statements[]`: ordered `{ text, kind: fact | interpretation | critical_opinion | unconfirmed,
  source_ids[] }` — every `fact` statement MUST have at least one `source_id` (enforced by the
  automated publishing gate, research.md §4)

**State transitions**: `pending` → `published` (automated validation passes) or `pending` →
`failed_validation` (a check fails — held back from users, never shown partially); `published` →
`stale` (underlying structured data changed materially) → back to `pending` for regeneration,
reusing the existing record rather than duplicating it (FR-017).

**Uniqueness**: one row per `(album_id, facet)`.

## Entity relationship summary

```text
Artist 1—* Album
Album 1—* Track
Album 1—* Credit
Album 1—* PerformanceRecord
Album 1—* Review
Album 1—* Curiosity
Album 1—4 NarrativeArticle (one per facet)
Album *—* HistoricalEvent   (curated by date proximity + relevance, not a stored FK)
Album/Artist *—* Album/Artist (Influence, directional, sourced)
Album *—* Album             (Recommendation, reasoned)
PerformanceRecord / Review / Curiosity / Influence / HistoricalEvent 1—1 Source (minimum)
NarrativeArticle *—* Source (via statements[].source_ids)
```
