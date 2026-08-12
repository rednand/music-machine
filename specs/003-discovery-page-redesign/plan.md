# Implementation Plan: Editorial Discovery Page & Artist Timelines

**Branch**: `003-discovery-page-redesign` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-discovery-page-redesign/spec.md`

## Summary

Replaces the current bare search box with an editorial "Descobrir" landing page — headline,
subheading, search bar, one auto-selected "featured" album spotlight, and an "Acervo" list of the
rest of the catalog, each entry carrying a one-line hook derived from that album's own
already-generated narrative (never a new, ungrounded claim). Adds a new "Linhas" destination:
per-artist career timelines built from that artist's known albums. Renames the year-explorer nav
label to "Eras" with no behavior change, and drops the not-yet-built "Comparar" destination from
top nav for this redesign only. No new external integrations or schema changes — this is a
read-side aggregation and presentation layer over data the product already collects and already
validated (Album, Artist, NarrativeArticle/NarrativeStatement).

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js (latest stable, App Router), React (latest
stable) — unchanged from 002.

**Primary Dependencies**: Next.js, React, Tailwind CSS with the existing shadcn/ui component set,
`lucide-react`, `@supabase/ssr` + `@supabase/supabase-js`. No new dependency is introduced by this
feature.

**Storage**: Supabase PostgreSQL — reads only, against tables that already exist (`albums`,
`artists`, `narrative_articles`, `narrative_statements`). No migration is required: `albums.
created_at` already exists in the schema (`supabase/migrations/20260812000000_init.sql`) and only
needs to be exposed through the existing `AlbumRow` TypeScript type and repository queries.

**Testing**: Vitest, tests co-located with source files, external services (Supabase client,
Next.js navigation) mocked via `vi.mock`, coverage ≥80% (per constitution Principle V) —
unchanged from 002.

**Target Platform**: Responsive web (desktop, tablet, mobile browsers), same single Next.js
deployment as 002.

**Project Type**: Web application — single Next.js project (no change to Project Type).

**Performance Goals**: The Discover page (featured pick + collection list) renders in ≤ 800ms p95
for a catalog under a few hundred albums, since it does no live external-provider or Groq calls —
strictly cheaper than an album page's cached render (002's ≤ 2s p95 budget). An artist timeline
renders in ≤ 500ms p95 for the same reason.

**Constraints**: The one-line hook per album MUST be reused verbatim from that album's own
already-published `NarrativeStatement` text (never a new AI call, never paraphrased into a new
claim) — this keeps FR-007/FR-008 satisfiable with zero added fabrication risk and zero added
Groq cost/latency/failure surface, consistent with the AI-integration discipline already
established in 002. "Most recently added" ordering must be a stable, deterministic sort (primary:
`created_at` desc; tiebreaker: `title` asc) so the featured pick and the collection order do not
flicker across reloads for albums added in the same instant.

**Scale/Scope**: Same anonymous, no-accounts MVP scope as 002; this feature adds two new
Server-Component pages and no new tables.

**Architecture note (resolves /speckit-analyze finding U1)**: `app/(public)/page.tsx` becomes an
`async` Server Component that calls `getDiscoveryPage()` directly at render time (same pattern as
`app/(public)/albums/[albumId]/page.tsx`), so the featured/collection data is part of the initial
server-rendered HTML rather than a client-side fetch. The interactive search form (state +
`searchCatalog` call) is extracted into a small `"use client"` child component
(`components/SearchForm.tsx`) rendered inside that Server Component, mirroring how `AppShell.tsx`
is the only client boundary needed for navigation today. This keeps the ≤800ms p95 goal achievable
by avoiding an extra client-side request waterfall for the page's primary content.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Unified Next.js App Router Stack | Still one Next.js project; the new Discover/Timeline pages read exclusively through new Server Actions in `app/actions/`, never calling Supabase directly from a Client Component (Project Structure below) | PASS |
| II. Supabase as the Backend Platform | Read-only against existing tables with existing public-read RLS policies (no new table, no new policy needed); feature remains anonymous, so `user_id` scoping still does not apply (same scope note as 002) | PASS |
| III. Server Actions for All Mutations | This feature performs no mutations — it is read-only aggregation, so the "all mutations are Server Actions" rule has nothing to gate; reads are still routed through Server Actions for consistency with 002's pattern, not raw client fetches | PASS |
| IV. Disciplined AI Integration via Groq | This feature makes zero new Groq calls — the one-line hook is a verbatim reuse of already-validated `NarrativeStatement` text (research.md §1) | PASS |
| V. Test-First & Mandatory Coverage | Every new module below ships with a co-located `*.test.ts`/`*.test.tsx`; Supabase mocked via the existing `SupabaseLike`/`createFakeSupabase` test helper | PASS |
| VI. Serena-First Code Intelligence | Process constraint on implementation, not a design artifact | PASS (N/A to design artifacts) |
| VII. Observability & Security Rails | No new secrets, no new env vars, no new upload/payload surface; existing Sentry wiring already covers new pages/actions since it is app-wide | PASS |

No violations requiring justification; Complexity Tracking is not needed.

**Post-Design Re-Check** (after Phase 1 data-model.md/contracts/quickstart.md): the new
`DiscoveryPageEntry`/`ArtistTimelineEntry` view types only ever read fields already backed by
existing, RLS-covered tables; no Server Action introduces a write; the hook-derivation rule
(research.md §1) is enforced at the aggregation layer, not left to page-rendering code, so it
cannot be bypassed by a future page reusing the same data. Status remains PASS across all seven
principles.

## Project Structure

### Documentation (this feature)

```text
specs/003-discovery-page-redesign/
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
│   ├── page.tsx                       # REPLACED: editorial Discover page (User Story 1)
│   ├── artists/
│   │   ├── page.tsx                   # NEW: artist picker for "Linhas" (FR-014)
│   │   └── [artistId]/page.tsx        # NEW: artist timeline (User Story 2) — also resolves
│   │                                     the pre-existing dangling `/artists/[id]` link from
│   │                                     the search-results list
│   ├── albums/[albumId]/page.tsx      # UNCHANGED page, gains a "ver linha do tempo do
│   │                                     artista" link (FR-013)
│   ├── years/[year]/page.tsx          # UNCHANGED (US3, from 002) — nav label only becomes
│   │                                     "Eras"
│   └── compare/page.tsx               # UNCHANGED (US4, from 002) — no longer linked from top
│                                         nav per this feature's Assumptions
├── actions/
│   ├── discovery.ts                   # NEW: Server Action — featured pick + collection list
│   └── artist-timeline.ts             # NEW: Server Action — one artist's albums in order,
│                                         plus the artist picker list
└── lib/
    ├── db/
    │   └── album.ts                   # EXTENDED: AlbumRow gains `created_at`; new
    │                                     `findAlbumsOrderedByCreatedAt`, `findAlbumsByArtistId`,
    │                                     `findAllArtists` repository methods
    └── discovery/
        ├── hook.ts                    # NEW: pure function — pick the one-line hook from an
        │                                 album's already-published NarrativeStatements
        └── collection.ts              # NEW: pure aggregation — build featured pick +
                                          ordered collection entries from Albums/Artists/hooks

components/
├── AppShell.tsx                       # UPDATED: nav becomes Descobrir/Eras/Linhas
├── SearchForm.tsx                     # NEW: "use client" — extracted interactive search bar
├── FeaturedAlbumCard.tsx              # NEW
├── CollectionList.tsx                 # NEW
└── ArtistTimeline.tsx                 # NEW

Co-located tests: every new/modified file above ships with a matching `*.test.ts`/`*.test.tsx`
per constitution Principle V.
```

**Structure Decision**: Same single Next.js App Router project as 002 — this feature adds two
Server Actions and a small pure-aggregation layer under `app/lib/discovery/`, following the exact
pattern already established by `app/lib/ingestion/` in 002 (pure functions taking injected
dependencies, wired to real repositories only at the Server Action boundary).

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
