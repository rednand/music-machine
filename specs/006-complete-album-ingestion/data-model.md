# Phase 1 Data Model: Complete Album Ingestion

No schema migration. All four persisted shapes below already exist in `app/lib/db/*.ts` with working
`create`/`find` methods — this feature adds the callers that populate them, plus one new transient
(unpersisted) shape used during generation.

## Existing Entities (unchanged schema)

### `TrackRow` (`app/lib/db/album.ts`)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `album_id` | `string` | |
| `title` | `string` | Sourced from Discogs release `tracklist[].title` (research.md §1). |
| `track_number` | `number?` | Sourced from Discogs `tracklist[].position` (parsed to a number where it's a plain track number; left unset for non-numeric positions like "A1" on vinyl releases). |
| `duration_seconds` | `number?` | Parsed from Discogs' `mm:ss` duration string; left unset when Discogs doesn't report a duration for that track. |

Created via the already-existing `AlbumRepository.createTrack`. Read via the already-existing
`findTracksByAlbumId` (exposed to context assembly as `AlbumContextDeps.findTracks`).

### `PerformanceRecordRow` (`app/lib/db/performance-record.ts`)

Unchanged shape (`kind`, `label`, `value`, `record_date?`, `source_id`). This feature persists the
`RawPerformanceRecordData[]` that `ingestAlbum` already fetches via
`EncyclopediaProvider.fetchPerformanceRecords`, instead of discarding it — see research.md §4 for the
generate-once gate.

### `CuriosityRow` (`app/lib/db/curiosity.ts`)

| Field | Type | Notes |
|---|---|---|
| `summary` | `string` | The generated statement text (equivalent to a narrative statement's `text`). |
| `status` | `"confirmed" \| "unconfirmed" \| "disputed"` | Defaults to `"unconfirmed"` (existing repository default) — this feature does not add a review/promotion workflow; every machine-generated curiosity is stored as `"unconfirmed"` unless a future feature adds human curation. |
| `source_id` | `string` | The one source excerpt id the item's generation validated against (research.md §2). |

### `InfluenceRow` (`app/lib/db/influence.ts`)

| Field | Type | Notes |
|---|---|---|
| `from_album_id?` / `from_artist_id?` | `string?` | Set to the current album's id when the relationship is framed as "this album influenced X" (research.md §3). |
| `to_album_id?` / `to_artist_id?` | `string?` | Set to the current album's id when framed as "this album was influenced by X"; the *other* side's id is filled only when the named target resolves to an existing catalog row — otherwise left unset, and the relationship is still shown via `explanation`. |
| `explanation` | `string` | Prose that names the other side of the relationship, so the relationship remains meaningful even when no id resolves (FR-010). |
| `source_id` | `string` | The one source excerpt id the item's generation validated against. |

## New Transient Shape (not persisted)

### `GeneratedFactItem` (internal to `app/lib/ai/curiosity-influence.ts`)

| Field | Type | Notes |
|---|---|---|
| `text` | `string` | Same role as `NarrativeStatement.text`. |
| `kind` | `"fact"` | Fixed — curiosities/influence are only ever generated as sourced facts, never as `interpretation`/`critical_opinion`/`unconfirmed` (those kinds exist for narrative prose, not this facet). |
| `sourceIds` | `string[]` (always length 0 or 1) | Reuses `NarrativeStatement`'s shape exactly so the existing `validateStatements` gate (`publishing-gate.ts`) can run unchanged (research.md §2); length 0 fails validation (no fabrication), length 1 is the only valid outcome. |

This shape exists only in memory between generation and the no-fabrication gate; once validated, it
is mapped to a `CreateCuriosityInput` or `InfluenceRow` for persistence and then discarded.

## Relationships

- A `Track` belongs to exactly one `Album` (existing `album_id` foreign key) — unchanged.
- A `Curiosity` belongs to exactly one `Album` (existing `album_id`) and cites exactly one source
  (existing `source_id`) — unchanged; this feature is the first thing that ever creates rows here.
- An `Influence` connects two sides, each optionally an `Artist` or an `Album`, with one side always
  being the album currently being viewed — unchanged shape, this feature is the first thing that ever
  creates rows here.
- A `PerformanceRecord` belongs to exactly one `Album` — unchanged; this feature is the first thing
  that actually persists rows here (they were already being fetched, just discarded).
