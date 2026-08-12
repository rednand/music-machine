# Data Model: Editorial Discovery Page & Artist Timelines

No new tables and no migration. This feature only exposes one already-existing column
(`albums.created_at`) through the application layer and introduces read-only, in-memory
aggregation types that are never persisted.

## Existing entities touched

### Album (`app/lib/db/album.ts` — `AlbumRow`)

Gains one field to the existing TypeScript interface, mirroring a column that already exists in
`supabase/migrations/20260812000000_init.sql`:

| Field | Type | Notes |
|---|---|---|
| `created_at` | `string` (ISO timestamp) | Already `not null default now()` in the schema; newly selected/typed for ordering (research.md §2) |

No other existing field changes. `AlbumRow`'s existing fields (`id`, `artist_id`, `title`, `slug`,
`release_date`, `genre?`, `label?`, `duration_seconds?`, `track_count?`, `cover_art_url?`) are
unchanged.

### Artist (`app/lib/db/album.ts` — `ArtistRow`)

Unchanged shape (`id`, `name`, `slug`). Gains one new read query (`findAllArtists`), not a new
field.

### NarrativeArticle / NarrativeStatement (`app/lib/db/narrative-article.ts`)

Unchanged shape and unchanged repository. Read via the existing `findByAlbumAndFacet` +
`findStatementsByArticleId` methods already used by `assembleAlbumContext` (002) — no new query
methods needed here.

## New view types (in-memory only, never persisted)

### `AlbumHook` (`app/lib/discovery/hook.ts`)

```ts
type AlbumHook = string | null;
```

The result of applying the facet-preference rule (research.md §1) to an album's already-published
`NarrativeStatement`s. `null` means the album has no usable hook yet (FR-008) — the UI omits the
hook line entirely rather than rendering an empty string.

### `DiscoveryPageEntry` (`app/lib/discovery/collection.ts`)

```ts
interface DiscoveryPageEntry {
  albumId: string;
  title: string;
  artistName: string;
  releaseYear: string;   // extracted from release_date, for display only
  coverArtUrl?: string;
  hook: AlbumHook;
}
```

Represents one row of the "Acervo" collection list, and — when it is the first entry — also the
"Em destaque" spotlight (FR-003, FR-005). Built by joining `AlbumRow` (ordered per research.md
§2) with its `ArtistRow.name` and its `AlbumHook`.

### `DiscoveryPageResult` (`app/lib/discovery/collection.ts`)

```ts
type DiscoveryPageResult =
  | { state: "empty" }
  | { state: "ready"; featured: DiscoveryPageEntry; collection: DiscoveryPageEntry[] };
```

`"empty"` covers the zero-album edge case (FR-009). When `"ready"`, `featured` is always
`collection[0]` (per research.md §2's decision that the reference layout repeats the spotlighted
album inside the list) — the type keeps `featured` separate purely so the Discover page component
does not need to special-case "the first item of the list" itself.

### `ArtistTimelineEntry` (`app/lib/discovery/`, re-exported by `app/actions/artist-timeline.ts`)

```ts
interface ArtistTimelineEntry {
  albumId: string;
  title: string;
  releaseYear: string;
}
```

### `ArtistTimelineResult`

```ts
type ArtistTimelineResult =
  | { state: "not_found" }                                            // unknown artistId
  | { state: "ready"; artistName: string; albums: ArtistTimelineEntry[] };  // 1..N albums (FR-015)
```

### `ArtistPickerEntry` (for `/artists`, FR-014)

```ts
interface ArtistPickerEntry {
  artistId: string;
  artistName: string;
}
```

## Validation rules carried over from Requirements

- A `DiscoveryPageEntry.hook` MUST only ever be set from an already-`published` `NarrativeArticle`
  (never `pending`/`failed_validation`/`stale`) — enforced inside `hook.ts`, not left to callers.
- `ArtistTimelineResult.albums` MUST be ordered by `release_date` ascending (FR-011) and MUST
  render correctly with exactly one entry (FR-015) — both are unit-tested directly on the
  aggregation function, not only through a page-level integration test.
