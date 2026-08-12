# Data Model: Music Context — Historical & Cultural Discovery

**Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Field lists are the fields required to satisfy the spec's functional requirements; they are
not an exhaustive DB DDL. Every entity that stores a factual claim links to `Source` per
Principle III / FR-015 / FR-016.

## Artist

Represents a musical act.

- `id`, `name`, `slug`
- `careerNarrative` (pt-BR, generated) — reference to a `ContextArticle`
- `activeFrom`, `activeTo` (nullable — still active)
- **Relationships**: has many `Album`; many-to-many `RelatedArtist` (self-referential, with
  `reason` per FR-022-style relation, e.g. "contemporary", "influence")

**Validation**: `name` required; `activeTo` (if set) must not precede `activeFrom`.

## Album

The central subject of a context page (FR-002–FR-010).

- `id`, `title`, `slug`, `releaseDate`, `genre`, `label`, `durationSeconds`, `trackCount`,
  `coverArtUrl` (provider-supplied, license-scoped per Assumptions)
- `artistId` → `Artist`
- `careerMomentNarrative`, `musicalSceneNarrative`, `legacyNarrative` → `ContextArticle`
  references (FR-004, FR-005, FR-009)
- **Relationships**: belongs to `Artist`; has many `Track`; has many `Release`; has many
  `ChartEntry`; has many `Review`; has many `TimelineEvent`; many-to-many `RelatedAlbum`
  (self-referential, carries `reason`, per FR-022); curated set of `HistoricalEvent` for its
  release period (queried by date proximity + relevance score, not a stored foreign key, per
  FR-011a — same curation rule used by the period explorer)

**Validation**: `releaseDate` required; `trackCount` must be omitted/null rather than 0 when
unknown (never fabricated, per FR-007 pattern applied consistently).

## Track

An individual song; can itself be a search/context subject when it has no parent album
(standalone single), per the resolved track-only-search clarification.

- `id`, `title`, `slug`, `durationSeconds`, `trackNumber` (nullable — null when standalone)
- `albumId` (nullable → `Album`)
- `artistId` → `Artist` (denormalized for standalone-track lookups when `albumId` is null)
- Shares the same context sections as `Album` when standalone, minus album-only fields
  (`trackCount`); reuses `ChartEntry`, `Review`, `TimelineEvent` associations keyed to the
  track instead of the album in that case.

**Validation**: either `albumId` is set, or the track is flagged as a standalone single with
its own `artistId`.

## Release

A specific edition/format of an `Album` (e.g., region or format variant), distinct from the
conceptual album — sourced primarily from Discogs/MusicBrainz.

- `id`, `albumId` → `Album`, `format`, `region`, `label`, `catalogNumber`, `releaseDate`

## Genre / Label

Lightweight reference/classification entities.

- `Genre`: `id`, `name`
- `Label`: `id`, `name`

## Chart / ChartEntry

- `Chart`: `id`, `name`, `region` (e.g., a named sales/airplay chart)
- `ChartEntry`: `id`, `chartId` → `Chart`, `albumId` or `trackId`, `peakPosition`,
  `weeksCharted`, `entryDate`, `sourceId` → `Source`

**Validation**: a `ChartEntry` MUST have a `sourceId`; absence of any `ChartEntry` for a
release means the performance section is omitted (FR-007), never a fabricated placeholder.

## Review

A critical assessment, never the full original text (FR-008, FR-024).

- `id`, `albumId` or `trackId`, `publication`, `ratingOrVerdict`, `publishedDate`,
  `summary` (original synthesis, not copied text), `sourceUrl`, `sourceId` → `Source`

## HistoricalEvent

A dated occurrence usable for period context, curated onto both album/track context pages
(FR-011a) and the period explorer (FR-011, FR-012).

- `id`, `title`, `date`, `category` (enum: music | film | television | technology | culture |
  politics | society | fashion | historical), `relevanceScore`, `summary`, `sourceId` →
  `Source`

## TimelineEvent

A milestone specific to one album's/artist's own story (FR-006).

- `id`, `albumId` (or `trackId`), `label` (e.g., "Recording began", "Lead single released"),
  `date`, `sourceId` → `Source`

## Source

Every factual claim traces to one of these (Principle III/IV, FR-015–FR-017, FR-026).

- `id`, `type` (enum: official_primary | music_database | journalistic | interview |
  specialized_publication | wikidata_wikipedia), `title`, `url`, `publishedOrRetrievedDate`,
  `licenseType` (nullable), `attributionText` (nullable — required to render whenever
  `licenseType` mandates it, per FR-026)

**Validation**: `attributionText` is required whenever `licenseType` requires attribution
(enforced at write time by the ingestion pipeline, not left to the UI layer).

## ContextArticle

The stored, reusable synthesized narrative for an album/track or period (FR-013–FR-018,
FR-029, FR-030).

- `id`, `subjectType` (album | track | period), `subjectId`, `facet` (career_moment |
  musical_scene | legacy | period_overview — an album/track has one ContextArticle per
  facet, since FR-004/FR-005/FR-009 are distinct narrative sections), `status` (pending |
  published | failed_validation | stale), `language` (fixed `pt-BR` for MVP), `generatedAt`
- `statements[]`: ordered list of `{ text, kind: fact | interpretation | critical_opinion |
  unconfirmed, sourceIds[] }` — every `fact` statement MUST have at least one `sourceId`
  (enforced by the automated publishing gate from research.md §7)

**State transitions**: `pending` → `published` (automated validation passes) or `pending` →
`failed_validation` (a validation check fails — held back from users, not shown partially);
`published` → `stale` (underlying structured data changed materially, e.g. a new chart entry
appears) → re-enters `pending` for regeneration, reusing the existing record per FR-018
instead of creating a duplicate.

## Recommendation / RelatedAlbum / RelatedArtist

A suggested link carrying an explicit reason (FR-022).

- `id`, `subjectAlbumId`, `relatedAlbumId`, `reason` (enum: same_era | same_genre_movement |
  direct_influence | historical_importance | contemporary_artist), `explanation` (short
  pt-BR text shown to the user, per the "each recommendation states why" acceptance
  scenario)

## Entity relationship summary

```text
Artist 1—* Album
Album 1—* Track
Album 1—* Release
Album 1—* ChartEntry  (Track can also have its own ChartEntry when standalone)
Album 1—* Review      (Track can also have its own Review when standalone)
Album 1—* TimelineEvent
Album *—* Album        (RelatedAlbum, reasoned)
Album *—* HistoricalEvent (curated by date proximity + relevance, not a stored FK)
Artist *—* Artist       (RelatedArtist, reasoned)
TimelineEvent 1—1 Source (minimum)
HistoricalEvent 1—1 Source (minimum)
ChartEntry / Review 1—1 Source (minimum)
ContextArticle *—* Source (via statements[].sourceIds)
```
