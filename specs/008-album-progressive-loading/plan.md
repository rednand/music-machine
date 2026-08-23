# Implementation Plan: Album Progressive Loading

**Branch**: `008-album-progressive-loading` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-album-progressive-loading/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Split the album detail page's single, all-or-nothing data load into two phases: fetch and
persist the technical sheet/tracklist (`ingestAlbum`, credits, tracks, performance records)
first and render the page as soon as that resolves, then kick off AI narrative generation
(`synthesizeNarrative`/`synthesizeCuriosities`/`synthesizeInfluence` + facet publishing) as a
background continuation that a small client-side poller surfaces in place, replacing per-section
loading placeholders with finished content once ready — without a page reload.

## Technical Context

**Language/Version**: TypeScript 5, Node.js runtime (Next.js 16.3.0 server)

**Primary Dependencies**: Next.js 16 (App Router, Server Actions), React 19, `@supabase/supabase-js` /
`@supabase/ssr`, `groq-sdk` (via existing `GroqClient`/`FallbackChatCompletionClient`/`GeminiClient`
wrappers in `app/lib/ai/`), Tailwind CSS, shadcn/ui primitives

**Storage**: Supabase (PostgreSQL) — reuses existing `albums`, `tracks`, `credits`,
`performance_records`, `narrative_articles` (+ statements), `curiosities`, `influences` tables;
no schema changes required

**Testing**: Vitest (`vitest run` / `yarn test`), co-located `*.test.ts` files, external services
(Supabase, AI clients) mocked per constitution Principle V

**Target Platform**: Server-rendered web app (Next.js App Router), evergreen browsers

**Project Type**: Web application (single Next.js project, no separate backend)

**Performance Goals**: Album page must render with technical sheet/tracklist as soon as that
data alone is available, decoupled from AI-generation latency (today the page is blocked on the
slower of the two); no numeric latency target is introduced by this feature beyond that ordering
change (see spec SC-001)

**Constraints**: AI-generation Server Action(s) must remain rate-limited per authenticated user
(constitution Principle III, since they trigger Groq/Gemini calls); no new external services or
infra (e.g., WebSockets/SSE) introduced — reuse Server Actions and polling from the client,
consistent with the existing single-Next.js-app architecture

**Scale/Scope**: One route (`app/(public)/albums/[albumId]/page.tsx`) and its supporting Server
Actions/ingestion module; no new pages, no new persisted entities — a UI/orchestration change
over existing data

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Unified Next.js App Router Stack** — PASS. No new service is introduced; the split entry
  points remain Server Actions/Server Components inside the same Next.js project.
- **II. Supabase as the Backend Platform** — PASS. No schema change; reads/writes continue to go
  through the existing repositories (`app/lib/db/*`) and RLS-scoped `supabase` client; the
  admin client stays server-only as today.
- **III. Server Actions for All Mutations** — GATE: the action that triggers/continues AI
  narrative generation (a costly, abusable operation) MUST enforce a per-user rate limit; the
  read-only technical-sheet fetch does not mutate beyond idempotent ingest-if-missing and can
  reuse the existing pattern in `getAlbumContext`. Must be verified in Phase 1 design and again
  before implementation.
- **IV. Disciplined AI Integration via Groq** — PASS. Reuses the existing `GroqClient` /
  `FallbackChatCompletionClient` / `GeminiClient` wrapper chain unchanged; no new AI call sites
  bypassing it.
- **V. Test-First & Mandatory Coverage** — GATE: new/changed modules (split ingestion entry
  point, narrative-status polling action, client polling component) must ship with co-located
  tests per Principle V; tracked in `/speckit-tasks`.
- **VI. Serena-First Code Intelligence** — Process rule for implementation; no artifact impact.
- **VII. Observability & Security Rails** — GATE: failures in the background narrative
  generation (already logged via `console.error` in `album-context.ts`) must remain visible to
  Sentry; no new secrets/env vars are introduced by this feature.

**Post-Phase 1 re-check**: `contracts/server-actions.md` now specifies that
`getAlbumNarrative` enforces a per-user rate limit (III) and returns an explicit `"error"` state
instead of throwing (VII, error visibility); `data-model.md` confirms no new tables/columns, so
existing RLS policies are unaffected (II). All gates remain PASS; the two GATE items above
(rate limiting, test coverage) carry forward as task-level requirements for `/speckit-tasks`
rather than open design questions.

No violations requiring Complexity Tracking — this fits within the existing single-project
structure with no new services, dependencies, or architectural layers.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
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
├── (public)/albums/[albumId]/
│   ├── page.tsx              # Server Component — split into: await technical sheet,
│   │                         # render shell immediately, hand narrative status to a
│   │                         # client poller instead of awaiting everything
│   └── loading.tsx           # Existing route-level Suspense fallback — now only covers
│                              # the technical-sheet fetch, not AI generation
├── actions/
│   └── album-context.ts      # getAlbumContext split into getAlbumTechnicalSheet(albumId)
│                              # (fast, no AI) and getAlbumNarrative(albumId) (existing
│                              # resolve-or-generate-or-pending logic, called by the poller)
└── lib/
    ├── ingestion/
    │   └── album-context.ts  # assembleAlbumContext split: technical-sheet assembly no
    │                          # longer blocked behind the narrative "pending" early-return;
    │                          # generateAllFacets' AI step (synthesizeNarrative/
    │                          # synthesizeCuriosities/synthesizeInfluence + publishFacet)
    │                          # becomes the piece the poller waits on
    └── ai/                    # unchanged: GroqClient / GeminiClient / FallbackChatCompletionClient

components/
├── NarrativeSection.tsx, CategoryCardGrid.tsx, ReceptionSplit.tsx,
│   InfluenceList.tsx, CuriositiesList.tsx                  # gain a loading/error variant
├── LoadingIndicator.tsx      # reused for the per-section loading placeholder
└── [new] NarrativePoller.tsx (or similar)                  # Client Component: polls
    getAlbumNarrative(albumId) on an interval, swaps placeholders for content in place

tests/ (co-located *.test.ts next to each source file, per constitution Principle V)
```

**Structure Decision**: Single Next.js App Router project (no separate frontend/backend
directories, consistent with constitution Principle I). The change is confined to: the album
route's Server Component, the `getAlbumContext`/`assembleAlbumContext` split into a technical-sheet
path and a narrative path, and one new small Client Component for in-place polling. No new
top-level directories are introduced.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
