# Contract: Server Actions

**Date**: 2026-08-12 | **Data model**: [../data-model.md](../data-model.md)

Per constitution Principle I, Client Components never call Supabase directly — every interaction
below is the only surface Client Components (or Server Components rendering these pages) are
allowed to call. Both actions here are read-only (no mutation, no rate limit needed per
constitution Principle III's scope).

## `getDiscoveryPage(): Promise<DiscoveryPageResult>`

- **Location**: `app/actions/discovery.ts`
- **Output**: a discriminated result —
  - `{ state: "ready", featured: DiscoveryPageEntry, collection: DiscoveryPageEntry[] }`
  - `{ state: "empty" }` — zero albums in the catalog (Edge Case, FR-009)
- `featured` is always `collection[0]` (research.md §2) — included as its own field so the page
  component can render the spotlight without re-deriving "the first item" itself.
- `collection` is ordered by `created_at` desc, `title` asc tiebreaker (research.md §2); has
  exactly one entry when the catalog has exactly one album (Edge Case).
- Each `DiscoveryPageEntry.hook` is `null` when that album has no published narrative statement
  yet (FR-008) — the UI omits the hook line for that entry rather than rendering an empty one.
- Still delegates free-text search to the existing `searchCatalog` action (`app/actions/
  search.ts`, unchanged) — this action only supplies the featured/collection data, it does not
  replace search (FR-002).
- Satisfies: FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009

## `listArtistsForPicker(): Promise<ArtistPickerEntry[]>`

- **Location**: `app/actions/artist-timeline.ts`
- **Output**: `{ artistId, artistName }[]`, ordered by `artistName` asc
- `[]` when the catalog has zero artists — the `/artists` page renders the same empty-state
  guidance as the Discover page rather than a bare blank list
- Satisfies: FR-014

## `getArtistTimeline(artistId: string): Promise<ArtistTimelineResult>`

- **Location**: `app/actions/artist-timeline.ts`
- **Output**: a discriminated result —
  - `{ state: "ready", artistName: string, albums: ArtistTimelineEntry[] }` — `albums` ordered by
    `release_date` asc; renders correctly with exactly one entry (FR-015)
  - `{ state: "not_found" }` — unknown `artistId`
- Satisfies: FR-011, FR-012, FR-015

## Cross-cutting contract rules

- Neither action makes a new Groq call or a new external-provider call — both are pure
  aggregations over data 002's Server Actions already produce and persist (research.md §1).
- Every album entry returned by either action links to `/albums/[albumId]`, the existing,
  unmodified album narrative page (FR-006, FR-012).
- `app/(public)/albums/[albumId]/page.tsx` gains a link to `/artists/[artistId]` (the artist's
  timeline) using the album's already-known `artist_id` — no new Server Action needed for that
  link (FR-013).
