# Implementation Plan: Search & Context Refinements for MVP

**Branch**: `004-search-and-context-refinements` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-search-and-context-refinements/spec.md`

## Summary

Replaces the auto-persist search fallback (002/003) with a click-to-save model: search shows
local matches plus live, unsaved external candidates, and only the exact item a user selects gets
ingested — re-derived server-side from the same provider search rather than trusted from the
client, so a client can never inject arbitrary catalog rows. Adds song search (a mode selector
next to the search input) matching `tracks.title`, opening the album page with the matched track
highlighted — which requires rendering a track list on the album page for the first time. Widens
the "o mundo na época" prompt to also cover pop culture, using only already-gathered sources.
Removes the standalone "Linhas" timeline destination and its pages; the same artist's-other-albums
data (already built in 003 via `findAlbumsByArtistId`) is inlined directly into the album context
page instead.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js (latest stable, App Router), React (latest
stable) — unchanged from 002/003.

**Primary Dependencies**: Unchanged — Next.js, React, Tailwind/shadcn, `@supabase/ssr` +
`@supabase/supabase-js`, Groq SDK, the existing `CatalogProvider`. No new dependency.

**Storage**: Supabase PostgreSQL — no migration. `tracks` already exists in the schema
(`supabase/migrations/20260812000000_init.sql`) with a `createTrack` repository method already in
place (002); this feature adds read queries (`findTracksByAlbumId`, `findTracksByTitle`) but no
new table or column.

**Testing**: Vitest, co-located tests, external services mocked via `vi.mock` — unchanged.

**Target Platform**: Responsive web, same single Next.js deployment.

**Project Type**: Web application — single Next.js project.

**Performance Goals**: Resolving a selected search candidate (re-search + ingest) completes in
≤3s p95 before navigating — cheaper than a first-ever album view, since it does no Groq call; the
subsequent first-ever narrative generation on the resulting album page keeps 002's existing ≤12s
p95 budget (unchanged, not re-triggered by this feature).

**Constraints**: A selected candidate's catalog data MUST be re-derived from a fresh, server-side
call to the same provider search — never trusted from client-echoed fields — so `resolveSearchCandidate`
cannot become a vector for injecting arbitrary rows (constitution Principle VII). Song search
matches only already-known local tracks (no live provider fallback for songs in this MVP, per
spec.md Assumptions). The pop-culture prompt broadening (User Story 3) reuses the existing single
wrapped Groq client and existing source material only — no new AI call shape, no new provider.

**Scale/Scope**: Same anonymous, no-accounts MVP scope; net *removes* two pages (`/artists`,
`/artists/[artistId]`) and one Server Action file, while adding one new Server Action
(`resolveSearchCandidate`) and one new read path (song search) plus track-list rendering.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Unified Next.js App Router Stack | Still one Next.js project; all new reads/writes go through Server Actions in `app/actions/`, never Supabase directly from a Client Component | PASS |
| II. Supabase as the Backend Platform | No new table; reads/writes stay against existing public-read-RLS tables via the existing admin client for the one write path (`resolveSearchCandidate`) | PASS |
| III. Server Actions for All Mutations | `resolveSearchCandidate` is the only mutation this feature adds, implemented as a Server Action in `app/actions/search.ts`; per research.md §1 it re-derives data server-side rather than trusting the client, which is the actual abuse vector here — not call volume — so the mitigation is re-verification, not a rate limit (no AI call, no bulk import) | PASS |
| IV. Disciplined AI Integration via Groq | Only change is a broadened instruction string in the existing single wrapped client's prompt (research.md §3); no new call shape, no new parsing path | PASS |
| V. Test-First & Mandatory Coverage | Every new/modified module ships with a co-located test; deleted modules have their tests deleted alongside them, not left orphaned | PASS |
| VI. Serena-First Code Intelligence | Process constraint on implementation, not a design artifact | PASS (N/A) |
| VII. Observability & Security Rails | No new secret/env var; the click-to-save re-derivation rule (research.md §1) is the concrete security control this feature adds — explicitly checked here rather than assumed | PASS |

No violations requiring justification; Complexity Tracking is not needed.

**Post-Design Re-Check** (after Phase 1 data-model.md/contracts/quickstart.md): confirmed
`resolveSearchCandidate`'s only inputs are `query` and `externalId` (never the full candidate
record), so the server is structurally unable to trust client-supplied catalog fields; confirmed
deleting `/artists/*` and `artist-timeline.ts` leaves no dangling import (their one piece of
reusable logic, `findAlbumsByArtistId`, already lives in `app/lib/db/album.ts` from 003 and is
called directly by `assembleAlbumContext`). Status remains PASS across all seven principles.

## Project Structure

### Documentation (this feature)

```text
specs/004-search-and-context-refinements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── (public)/
│   ├── page.tsx                          # UPDATED: SearchForm gains the mode selector (US2)
│   ├── albums/[albumId]/page.tsx         # UPDATED: renders TrackList (highlighted track from
│   │                                        ?track=) and OtherAlbumsByArtist (US2, US4)
│   ├── artists/                          # DELETED (page.tsx, [artistId]/page.tsx, + tests)
│   ├── years/[year]/page.tsx             # UNCHANGED
│   └── compare/page.tsx                  # UNCHANGED
├── actions/
│   ├── search.ts                         # UPDATED: searchCatalog returns known|candidate
│   │                                        results, no auto-persist; NEW resolveSearchCandidate
│   ├── song-search.ts                    # NEW: searchSongs(query) — local track search (US2)
│   ├── artist-timeline.ts                # DELETED (+ test) — superseded by inline rendering
│   └── album-context.ts                  # UPDATED: wires findTracks + findOtherAlbumsByArtist
└── lib/
    ├── db/
    │   └── album.ts                      # EXTENDED: findTracksByAlbumId, findTracksByTitle
    ├── ingestion/
    │   ├── search-fallback.ts            # UPDATED: ingestSearchResults (loop, persist-all)
    │   │                                    replaced by ingestSingleCandidate (persist one,
    │   │                                    same dedupe rule)
    │   └── album-context.ts              # UPDATED: AlbumContextDeps/-Body gain tracks and
    │                                        otherAlbumsByArtist
    └── ai/
        └── narrative.ts                  # UPDATED: FACET_FOCUS.world_context broadened (US3)

components/
├── AppShell.tsx                          # UPDATED: nav becomes Descobrir/Eras (Linhas removed)
├── SearchForm.tsx                        # UPDATED: mode selector, candidate click-to-save flow
│                                            with waiting/failure states
├── TrackList.tsx                         # NEW: renders tracks, highlights the matched one
├── OtherAlbumsByArtist.tsx               # NEW: inline replacement for the old ArtistTimeline
│                                            page-level component
├── Header.tsx                            # UPDATED: drops the "ver linha do tempo" link
└── ArtistTimeline.tsx                    # DELETED (+ test) — logic reused by OtherAlbumsByArtist

Co-located tests: every new/modified file ships with a matching `*.test.ts`/`*.test.tsx`; deleted
source files have their test files deleted in the same task, per constitution Principle V.
```

**Structure Decision**: Same single Next.js App Router project. This feature is net-negative on
page count (removes the standalone timeline destination) while adding one Server Action and one
new read path, keeping the same pure-aggregation-then-wire-at-the-action-boundary pattern
established in 002/003.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
