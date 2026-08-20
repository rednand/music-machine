# Implementation Plan: Complete Album Ingestion (Tracks, Performance, Curiosities, Influence)

**Branch**: `006-complete-album-ingestion` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-complete-album-ingestion/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Four pieces of per-album data are designed into the schema and already partly wired but never
actually reach a visitor: tracks (repository method exists, nothing calls it), performance records
(fetched from the encyclopedia provider but discarded before being saved), and curiosities/influence
(repositories can persist and query them, but no generation step ever decides what to create). This
feature closes all four gaps inside the existing lazy, generate-once-then-serve-from-storage pattern
already used for narrative sections and credits (`assembleAlbumContext` in
`app/lib/ingestion/album-context.ts`) — no new page, route, or user-facing flow, and no new external
provider account. Tracks are sourced from the Discogs release response the app already fetches for
credits (extending `DiscographyProvider` to also return `tracklist`, avoiding a second external call).
Curiosities and influence are synthesized by a new Groq-backed step, modeled directly on the existing
`synthesizeNarrative` prompt-and-validate pattern, reusing the same no-fabrication gate discipline
(a fact without a traceable source is dropped, never invented).

## Technical Context

**Language/Version**: TypeScript 5, Node.js (Next.js 16 App Router) — unchanged, existing stack.

**Primary Dependencies**: `groq-sdk` (existing), `@supabase/supabase-js` (existing) — no new dependency. Track data reuses the Discogs REST API already called by `DiscographyProvider` (`app/lib/providers/discography-provider.ts`); no new external provider account is introduced.

**Storage**: Supabase Postgres. The `tracks`, `performance_records`, `curiosities`, and `influences` tables and their repositories already exist (`app/lib/db/album.ts`, `app/lib/db/performance-record.ts`, `app/lib/db/curiosity.ts`, `app/lib/db/influence.ts`) with working `create`/`find` methods — this feature adds callers, not schema or repository changes.

**Testing**: Vitest, co-located `*.test.ts` files, external HTTP mocked via injected `fetchImpl` (existing pattern in every provider test) and the Groq client mocked via `ChatCompletionClient` (existing pattern in `narrative.test.ts`).

**Target Platform**: Web — server-side generation inside the existing Next.js Server Component render path (`app/actions/album-context.ts` → `assembleAlbumContext`), triggered the first time an album's page is opened, same as narrative sections today.

**Project Type**: Single existing Next.js web application — no new project/service.

**Performance Goals**: No new target beyond not regressing the existing first-view cost: today's first view already makes parallel calls to 4 providers and up to 4 Groq completions; this feature adds 0 new HTTP round-trips for tracks (piggybacks on the already-fetched Discogs release response) and up to 2 more Groq completions (curiosities, influence), run in parallel with the existing narrative facet calls, consistent with FR-012's independent-failure requirement.

**Constraints**: Must not fabricate content — every curiosity and influence relationship traces to one specific source excerpt already gathered for that album (FR-006–FR-009), matching the constitution's existing Groq-integration and no-fabrication discipline. A failure generating any one of the four data kinds must not blank the other three or the existing narrative sections (FR-012).

**Scale/Scope**: Backend-only change confined to the ingestion/context-assembly layer and one provider; no new UI components (existing `TrackList`, `PerformancePanel`, `CuriositiesList`, `InfluenceList` components already render this data whenever it's present — verified they already handle non-empty arrays correctly, they've simply never received any).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Unified Next.js App Router Stack** — PASS. All changes stay inside the existing Next.js app
  (`app/lib/ingestion/`, `app/lib/providers/`, `app/lib/ai/`); no new service.
- **II. Supabase as the Backend Platform** — PASS. Reuses existing tables/repositories exactly as
  designed; no schema change, no new RLS policy needed (same public-catalog, service-role-write shape
  already governing `tracks`/`performance_records`/`curiosities`/`influences`).
- **III. Server Actions for All Mutations** — PASS. Persistence continues to happen inside
  `assembleAlbumContext`, invoked from the existing `getAlbumContext` Server Action
  (`app/actions/album-context.ts`) — no new mutation entry point.
- **IV. Disciplined AI Integration via Groq** — PASS, actionable. New curiosity/influence synthesis
  goes through the same single wrapped `ChatCompletionClient` already used for narrative, with the
  same structured-JSON-response contract and defensive parsing (`extractJsonObject`), and the same
  input-truncation discipline already applied to source excerpts.
- **V. Test-First & Mandatory Coverage** — PASS, actionable. Every new/modified function (extended
  `DiscographyProvider`, new curiosity/influence synthesis module, updated `ingestAlbum` and
  `assembleAlbumContext`) ships a co-located test with external services mocked; coverage must not
  regress below 80%.
- **VI. Serena-First Code Intelligence** — PASS, actionable. Implementation must use Serena MCP tools
  for symbol lookup/navigation across the touched ingestion/provider/db files.
- **VII. Observability & Security Rails** — PASS. No new secrets/endpoints; reuses the existing
  Discogs token and Groq API key already configured. No upload/payload surface introduced.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/006-complete-album-ingestion/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/lib/providers/
├── provider.interface.ts             # add RawTrackData; extend CreditsProviderAdapter (or add a sibling method) to expose fetchTracks
├── discography-provider.ts           # modified: map the already-fetched release response's tracklist too
└── discography-provider.test.ts      # modified: cover the new track mapping

app/lib/ingestion/
├── ingest-album.ts                   # modified: IngestedAlbum gains tracks[]; providers.discography gains fetchTracks in IngestionProviders
├── ingest-album.test.ts              # modified
├── album-context.ts                  # modified: persist tracks (createTrack) and performance records (create) when not already stored;
│                                      #   call the new curiosity/influence synthesis and persist their results, independently of narrative facets
└── album-context.test.ts             # modified

app/lib/ai/
├── curiosity-influence.ts            # new: synthesizeCuriosities / synthesizeInfluence, modeled on narrative.ts's prompt+parse+no-fabrication shape
└── curiosity-influence.test.ts       # new

app/lib/db/
├── album.ts                          # unchanged (createTrack already exists)
├── performance-record.ts             # unchanged (create already exists)
├── curiosity.ts                      # unchanged (create already exists)
└── influence.ts                      # unchanged (create already exists)

components/                           # unchanged — TrackList, PerformancePanel, CuriositiesList,
                                       # InfluenceList already render non-empty data correctly
```

**Structure Decision**: Single existing Next.js project (per constitution Principle I). All work is
confined to the provider and ingestion/context-assembly layers already established for credits and
narrative — no new project, route, or component. The one new file (`app/lib/ai/curiosity-influence.ts`)
sits alongside `narrative.ts` because it follows the identical prompt/parse/no-fabrication shape,
just with a different output structure (single `source_id` per item instead of a `sourceIds` array),
so it doesn't warrant merging into `narrative.ts` itself.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — the Constitution Check above passed with no exceptions, so this table is
intentionally empty.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 (data-model.md, contracts/internal-modules.md, quickstart.md): the design
adds one new file (`app/lib/ai/curiosity-influence.ts`) that goes through the same single wrapped
Groq client as `narrative.ts` and reuses the existing `validateStatements` gate rather than
introducing a second one; all persistence stays inside `assembleAlbumContext`'s existing dependency
interface (`AlbumContextDeps`), extended with four `persist*` methods rather than a new mutation
surface. No new Server Action, route, table, or RLS policy. All seven gates above still PASS with no
new exceptions.
