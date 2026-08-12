# Implementation Plan: Music Time Machine

**Branch**: `002-music-time-machine` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-music-time-machine/spec.md`

## Summary

Music Time Machine lets a user search an artist or album and read a narrative-driven page — the
album itself, the artist's career/personal moment, the world at the time, the musical scene,
performance (sales/certifications/charts/awards), reception-then-vs-legacy-now, curiosities, and
influence — written as connected prose, not a spec sheet, plus year exploration and two-album
comparison. It is delivered as a single Next.js (App Router) application per the project
constitution: Supabase for persistence (no auth required for this anonymous, read-only MVP, so
RLS is not triggered by user-owned rows — see Constitution Check), Groq for narrative synthesis
behind one wrapped client, and per-provider server-side data-gathering modules feeding a
source-cited, cached NarrativeArticle per album. Chart/sales/award/historical/critical-reception
data is gathered from external music/reference providers (selected in research.md, since the
constitution no longer names specific external APIs) and reconciled by source authority before
Groq ever sees it, so every factual claim in the generated prose stays traceable to a stored
Source.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js (latest stable, App Router), React (latest
stable)

**Primary Dependencies**: Next.js, React, Tailwind CSS with a shadcn/ui component set,
`lucide-react`, `sonner`, `@supabase/ssr` + `@supabase/supabase-js`, Groq SDK, per-provider
server-side data-gathering modules (selected in research.md) for album/artist metadata, chart/
sales/award records, critical reviews, and historical-event context.

**Storage**: Supabase PostgreSQL — system of record for normalized catalog data, Sources, and
generated NarrativeArticles (per constitution Principle II); a short-TTL cache table (or
Supabase's own caching where sufficient) to avoid redundant external-provider calls and redundant
Groq regeneration (per FR-017).

**Testing**: Vitest, tests co-located with source files, external services (Supabase client, Groq
client, Next.js navigation/cache, external data providers) mocked via `vi.mock`, coverage ≥80%
(per constitution Principle V).

**Target Platform**: Responsive web (desktop, tablet, mobile browsers) per FR-023; single Next.js
deployment (no separate backend service, per constitution Principle I).

**Project Type**: Web application — single Next.js project (frontend + server logic unified)

**Performance Goals**: Search results returned in ≤ 500ms p95 for cached/common queries; a
fully-cached album page renders all sections in ≤ 2s p95; a first-ever view of an album (live
data-gathering + Groq synthesis) completes in ≤ 12s p95 before falling back to a "ainda estamos
preparando esta página" state rather than blocking indefinitely.

**Constraints**: Must never fabricate facts — every factual statement traces to a stored Source
(Principle IV, FR-014); must not store full lyrics or copied review text (FR-021); must retain
license/attribution metadata end-to-end for sources that require it (FR-022); narrative content
in pt-BR by default, translated/synthesized from source-language material while preserving
attribution (per spec Assumptions); publishing is fully automatic, gated only by automated
source-citation/banned-content checks, no human-review step (per spec Assumptions); this feature
has no authenticated user data, so it does not exercise Supabase RLS/`user_id` scoping — that
constitution rule applies once a future feature introduces user-owned rows (e.g., saved albums,
accounts).

**Scale/Scope**: MVP scope; broad historical catalog (~1960s–present) with best-effort depth per
album; fully anonymous usage, no accounts (per spec Assumptions); single-region deployment sized
for low-to-moderate concurrent traffic, not yet designed for high-concurrency scale-out.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Unified Next.js App Router Stack | Single Next.js project; frontend never calls external providers or the database directly — only Server Actions/Route Handlers do (Project Structure below) | PASS |
| II. Supabase as the Backend Platform | Supabase Postgres is the system of record (data-model.md); feature has no user-owned data so RLS/`user_id` scoping is not applicable yet — explicitly noted as a gap to revisit, not silently skipped | PASS (see note below) |
| III. Server Actions for All Mutations | All writes (album ingestion trigger, narrative generation) go through Server Actions in `actions/`; the Groq-backed generation action is rate-limited (research.md) | PASS |
| IV. Disciplined AI Integration via Groq | Single wrapped Groq client (research.md), structured-JSON prompt contract, defensive parsing, truncated structured input — never raw free text | PASS |
| V. Test-First & Mandatory Coverage | Every module in Project Structure below ships with a co-located `*.test.ts`; external services mocked (Project Structure, quickstart.md) | PASS |
| VI. Serena-First Code Intelligence | Process constraint on implementation, not a design artifact | PASS (N/A to design artifacts) |
| VII. Observability & Security Rails | Sentry wiring and a documented env-var reference are Setup-phase tasks (tasks.md); external provider keys and the Groq key are server-only | PASS |

**Note on Principle II**: this feature is anonymous and read-only (per spec Assumptions), so no
table it introduces stores per-user rows, and RLS/`user_id` scoping genuinely does not apply yet.
This is not a violation — it is an explicit scope boundary that MUST be revisited the moment a
future feature adds accounts or saved/user-owned data (e.g., "save this album", favorites).

No violations requiring justification; Complexity Tracking is not needed.

**Post-Design Re-Check** (after Phase 1 data-model.md/contracts/quickstart.md): every entity
that carries a factual claim links to `Source`; RLS-with-public-read-policy is applied uniformly
across all ten tables (research.md §6); the Server Action contract never exposes an external
provider directly to the client. No new gate violations were introduced by the detailed design.
Status remains PASS across all seven principles (with Principle II's scope note unchanged).

## Project Structure

### Documentation (this feature)

```text
specs/002-music-time-machine/
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
│   ├── page.tsx                    # Search / landing page
│   ├── albums/[albumId]/page.tsx   # Album narrative page (User Story 1, 2)
│   ├── years/[year]/page.tsx       # Year explorer (User Story 3)
│   └── compare/page.tsx            # Two-album comparison (User Story 4)
├── actions/
│   ├── search.ts                   # Server Action: search albums/artists
│   ├── album-context.ts            # Server Action: fetch/trigger an album's NarrativeArticle
│   ├── year-explorer.ts            # Server Action: year snapshot
│   └── compare.ts                  # Server Action: two-album comparison
├── lib/
│   ├── providers/                  # Server-side data-gathering modules (one per external
│   │                                source chosen in research.md), each with a shared
│   │                                interface so a provider can be swapped without touching
│   │                                domain code
│   ├── ingestion/                  # Normalization + source-priority reconciliation
│   ├── ai/                         # Groq client wrapper, prompt assembly, structured-output
│   │                                parsing, publishing-gate validation
│   ├── historical-events.ts        # Relevance-scoring / per-category-cap curation for "o
│   │                                mundo na época" and the year explorer
│   ├── supabase/
│   │   ├── server.ts               # SSR client (Server Components/Actions)
│   │   ├── client.ts               # Browser client (Client Components only)
│   │   └── admin.ts                # Service-role client — never imported by client code
│   └── cache.ts                    # Redundant-call avoidance for providers + Groq
│                                     regeneration (FR-017)
└── ...

components/                          # Root-level, per the shadcn/ui `components.json` alias
├── AppShell.tsx                     # Responsive shell: sidebar (tablet/desktop) + bottom
│                                     nav (mobile), per constitution's design-system baseline
├── ui/                              # shadcn/ui primitives
├── AlbumHeader.tsx
├── NarrativeSection.tsx             # Renders a NarrativeArticle section's statements
├── WorldContext.tsx
├── PerformancePanel.tsx             # Sales/certifications/charts/awards, "unavailable" state
├── ReceptionThenVsLegacyNow.tsx
├── CuriositiesList.tsx
├── InfluenceList.tsx                # User Story 1 — confirmed influence relationships
├── RecommendationsList.tsx          # User Story 2 — reasoned "listen next" suggestions
├── YearSnapshot.tsx
└── CompareView.tsx

Co-located tests: every file above ships with a matching `*.test.ts`/`*.test.tsx` per
constitution Principle V (e.g., `app/lib/ai/narrative.ts` + `app/lib/ai/narrative.test.ts`,
`components/AlbumHeader.tsx` + `components/AlbumHeader.test.tsx`).
```

**Structure Decision**: Single Next.js App Router project, per constitution Principle I — no
separate backend service. All external-provider calls and all Supabase/Groq access happen only
inside `app/lib/` and `app/actions/`, never from Client Components, satisfying Principle I's
"frontend MUST NOT call any external provider or the database directly" rule.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
