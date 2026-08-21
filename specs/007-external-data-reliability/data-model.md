# Phase 1 Data Model: Reliable External Data for Album Context

No schema migration. This feature introduces no new persisted table or column — every new shape
below is transient (used only during a request) or, where it does affect a stored field, corrects a
value already written through the existing `albums.release_date` column.

## Existing Entities (unchanged schema)

### `AlbumRow.release_date` (`app/lib/db/album.ts`)

Unchanged column. This feature changes *which value* gets written to it at ingestion time (the
earlier of the catalog provider's date and MusicBrainz's `first-release-date`, per research.md §3),
never its shape.

### `artist_discography_cache` (existing table, unchanged)

Unchanged schema and unchanged repository (`app/lib/db/discography-cache.ts`). It continues to cache
whatever `CatalogProvider.fetchArtistAlbums` returns — now Deezer album ids/titles/release
dates/cover URLs instead of Spotify's, since the cache is keyed by artist and stores plain data, with
no assumption baked in about which backing service produced it.

### `narrative_articles` (existing table, unchanged schema)

Unchanged columns and unique constraint (`unique (album_id, facet)`). This feature changes only the
*application-level handling* of a constraint violation on insert (research.md §6) — no DDL change.

## New Transient Shapes (not persisted)

### `RawHistoricalEventData` (`app/lib/providers/provider.interface.ts`)

| Field | Type | Notes |
|---|---|---|
| `title` | `string` | The event's label, as returned by Wikidata (Portuguese where available, English fallback via the SPARQL label service). |
| `date` | `string` | `YYYY-MM-DD`, from a Wikidata statement already filtered to day/month precision (research.md §2). |

Used only as grounding input to the `world_context` narrative-generation prompt
(`SynthesizeNarrativeInput.historicalEvents`, an existing field previously always empty). Never
persisted; discarded once the prompt is built.

### MusicBrainz release-group lookup result (`app/lib/providers/musicbrainz-provider.ts`)

Represented simply as `string | null` (a `YYYY-MM-DD` date, or nothing usable found) — deliberately
not modeled as a richer type, since the only thing ever done with it is a same-shape comparison
against the catalog provider's own `releaseDate` string (research.md §3). Never persisted on its
own; only its *effect* (which of two dates wins) reaches the database, via the existing
`IngestedAlbum.releaseDate` field.

## Relationships

- A `RawHistoricalEventData[]` list is scoped to exactly one album-generation request (by release
  date window) and has no foreign key or identity of its own — unlike every other per-album entity in
  this product, it is never looked up again after that request completes.
- The MusicBrainz-sourced date has no relationship of its own; it only ever competes with exactly one
  other value (the catalog provider's date for the same album) before one of the two is written to
  the existing `albums.release_date` column.
