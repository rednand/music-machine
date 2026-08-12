# Data Model: Search & Context Refinements for MVP

No new tables and no migration. `tracks` already exists in
`supabase/migrations/20260812000000_init.sql`; this feature adds read queries against it and
extends a few existing in-memory (never persisted) view types.

## Existing entities touched

### Track (`app/lib/db/album.ts` — `TrackRow`, unchanged shape)

Already defined: `id`, `album_id`, `title`, `track_number?`, `duration_seconds?`. Gains two new
read queries on the album repository:

- `findTracksByAlbumId(albumId: string): Promise<TrackRow[]>` — ordered by `track_number`
  ascending (nulls last), for `TrackList` rendering (research.md §5).
- `findTracksByTitle(query: string): Promise<TrackRow[]>` — case-insensitive `ilike` match, for
  song search (research.md §4).

### Album, Artist (unchanged shape)

No new fields. `findAlbumsByArtistId` (added in 003) is reused as-is by the new
`otherAlbumsByArtist` aggregation.

## New/changed in-memory view types (never persisted)

### `SearchResultItem` (`app/actions/search.ts`) — now a discriminated union

```ts
interface KnownSearchResult {
  kind: "known";
  id: string;              // real, durable Album/Artist id
  type: "artist" | "album";
  title: string;
  artistName?: string;
  releaseDate?: string;
  coverArtUrl?: string;
}

interface CandidateSearchResult {
  kind: "candidate";
  externalId: string;      // provider id — the only thing round-tripped back on selection
  query: string;           // the exact query that produced this candidate (research.md §1)
  title: string;
  artistName: string;
  releaseDate: string;
  coverArtUrl?: string;
}

type SearchResultItem = KnownSearchResult | CandidateSearchResult;
```

`CandidateSearchResult` deliberately carries no writable catalog fields beyond what's needed to
display it and to re-identify it later — `resolveSearchCandidate` re-derives everything else
server-side (research.md §1).

### `SongSearchResult` (`app/actions/song-search.ts`)

```ts
interface SongSearchResult {
  trackId: string;
  title: string;
  albumId: string;
  albumTitle: string;
  artistName: string;
}
```

### `AlbumContextBody` (`app/lib/ingestion/album-context.ts`) — two additions

```ts
interface AlbumContextBody {
  // ...existing fields unchanged...
  tracks: TrackRow[];                            // new — [] when none known (research.md §5)
  otherAlbumsByArtist: OtherAlbumEntry[];         // new — [] when the artist has none else
}

interface OtherAlbumEntry {
  albumId: string;
  title: string;
  releaseYear: string;
}
```

## Validation rules carried over / newly introduced from Requirements

- `resolveSearchCandidate` MUST NOT persist anything beyond the single candidate matched by
  `(query, externalId)` server-side (FR-001, FR-002) — enforced by construction, since the
  function only ever ingests the one matched entry, never the full re-searched list.
- `resolveSearchCandidate` MUST return the existing album's id (not create a duplicate) when the
  matched candidate's slug already exists locally (FR-006) — reuses the existing
  dedupe-by-slug check already proven in `search-fallback.ts`.
- `otherAlbumsByArtist` MUST exclude the album whose page it's rendered on (FR-013's "other known
  albums", not including itself).
- `tracks` highlighting (via `?track=<trackId>`) MUST silently ignore an id that doesn't belong to
  the current album's `tracks` (no error state needed — same "degrade gracefully" convention used
  elsewhere in this product).
