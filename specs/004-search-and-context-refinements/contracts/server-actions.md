# Contract: Server Actions

**Date**: 2026-08-12 | **Data model**: [../data-model.md](../data-model.md)

## `searchCatalog(query: string): Promise<SearchResultItem[]>` (modified)

- **Location**: `app/actions/search.ts`
- **Output**: `SearchResultItem[]` — a mix of `{ kind: "known", ... }` (already in the catalog,
  open directly) and, only when the local catalog has zero matches, `{ kind: "candidate", ... }`
  (found live, not yet saved).
- **Change from 002/003**: no longer persists any `candidate` entry as a side effect of being
  returned — this replaces 002's FR-024 auto-fallback persistence behavior entirely.
- Satisfies: FR-001, FR-005

## `resolveSearchCandidate(query: string, externalId: string): Promise<ResolveCandidateResult>` (new)

- **Location**: `app/actions/search.ts`
- **Input**: exactly the `query`/`externalId` pair from a `CandidateSearchResult` the user
  selected — never the full candidate record (research.md §1).
- **Output**: a discriminated result —
  - `{ state: "ready", albumId: string }` — saved (or already existed — FR-006) successfully
  - `{ state: "error", message: string }` — the provider no longer confirms this candidate, or
    ingestion failed (FR-004)
- Uses the service-role admin client for the write, per constitution Principle II.
- Satisfies: FR-002, FR-003 (paired with the client's waiting-state UI), FR-004, FR-006

## `searchSongs(query: string): Promise<SongSearchResult[]>` (new)

- **Location**: `app/actions/song-search.ts`
- **Output**: `{ trackId, title, albumId, albumTitle, artistName }[]`, matched against known
  `tracks.title` only (no external fallback — spec.md Assumptions)
- `[]` when nothing matches — the UI renders the "no results, try an album search" state (FR-010)
- Satisfies: FR-007, FR-008, FR-010

## `getAlbumContext(albumId: string): Promise<AlbumContextResult>` (modified)

- **Location**: `app/actions/album-context.ts` (unchanged signature)
- **Change**: the `"ready"` body gains `tracks: TrackRow[]` and `otherAlbumsByArtist:
  OtherAlbumEntry[]` (both `[]`-safe, never `null`), per data-model.md.
- Satisfies: FR-009 (paired with the album page reading `?track=`), FR-013

## Removed

- `getArtistTimeline` and `listArtistsForPicker` (`app/actions/artist-timeline.ts`, deleted) — no
  replacement action; their one reusable query (`findAlbumsByArtistId`) is now called directly
  from inside `getAlbumContext`'s dependency wiring instead of exposed as its own action.

## Cross-cutting contract rules

- `resolveSearchCandidate` never accepts or trusts client-supplied title/artist/release-date/cover
  fields for the write — see research.md §1. This is the one rule every implementation task
  touching this action must preserve.
- Every page navigated to from a search result (known or resolved candidate) still ends on the
  existing `/albums/[albumId]` narrative page — no new route is introduced for songs.
- The top navigation exposes exactly two destinations after this feature: Descobrir (`/`) and
  Eras (`/years`) — no "Linhas" entry (FR-014).
