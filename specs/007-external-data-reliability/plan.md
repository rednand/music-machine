# Implementation Plan: Reliable External Data for Album Context

**Branch**: `007-external-data-reliability` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-external-data-reliability/spec.md`

**Note**: This plan documents work already implemented directly in conversation, retroactively
following the `/speckit-plan` template so the feature has the same artifact trail as every other
feature in this repository.

## Summary

Four independent reliability/correctness gaps in how this product sources external data for an
album page are closed, each behind the existing `CatalogProviderAdapter` / `AlbumContextDeps` role
interfaces so no other layer needed to change shape. The catalog provider's backing service moves
from Spotify to Deezer's public API (no auth, no tiered access) because Spotify's 2026 Developer
Mode changes (5-user cap, mandatory Premium subscription, Extended Quota Mode requiring a registered
business with 250k+ MAU) made it unworkable for a personal project. A new `HistoricalEventsProvider`
queries Wikidata's public SPARQL endpoint for real, dated events near an album's release window,
feeding the existing "O mundo" narrative facet real grounding instead of an empty list; the
existing no-fabrication validation gate is extended to also reject AI refusal text, so a still-
ungrounded generation degrades to "section omitted" rather than publishing the refusal. A new
`MusicBrainzProvider` cross-checks the catalog provider's release date against MusicBrainz's
release-group `first-release-date` (which tracks a work's true original release date independently
of any specific reissue) and keeps whichever fully-specified date is earlier. Two small fixes round
out the feature: an explicit empty-state message for the "Influência" section, and a log line when
the AI client's `complete()` falls back from its primary to its secondary model. A pre-existing
concurrency bug in `createPending` (two overlapping page views racing to create the same
`narrative_articles` row) surfaced while testing the historical-events change and is fixed alongside
it using the same unique-violation-recovery pattern already used elsewhere in this codebase.

## Technical Context

**Language/Version**: TypeScript 5, Node.js (Next.js 16 App Router) — unchanged, existing stack.

**Primary Dependencies**: No new npm dependency. Three new/changed HTTP integrations, each called
via the existing injected-`fetchImpl` provider pattern: Deezer's public REST API (`api.deezer.com`,
no auth), Wikidata's public SPARQL endpoint (`query.wikidata.org/sparql`, no auth, descriptive
User-Agent required), MusicBrainz's public REST API (`musicbrainz.org/ws/2`, no auth, descriptive
User-Agent required).

**Storage**: Supabase Postgres. No new table and no schema migration. The existing
`artist_discography_cache` table (built for the previous Spotify-backed discography lookup) is
reused unchanged — it is backing-service-agnostic, so it now caches Deezer results instead. Historical
events and the MusicBrainz release date are used transiently at generation/ingestion time only, never
persisted as their own rows.

**Testing**: Vitest, co-located `*.test.ts` files, every new provider's HTTP calls mocked via the
existing injected-`fetchImpl` pattern (`vi.fn()` returning a `Response`), matching the convention
already used by every other provider in `app/lib/providers/`.

**Target Platform**: Web — server-side, inside the existing Next.js Server Component render path
(`app/actions/album-context.ts` → `assembleAlbumContext`) and the existing search Server Actions
(`app/actions/search.ts`), same call sites as before this feature.

**Project Type**: Single existing Next.js web application — no new project/service.

**Performance Goals**: No new target beyond not regressing existing first-view cost. The
historical-events lookup adds exactly one new HTTP call, gated to only run when the "O mundo" facet
specifically needs generation (not on every view where any facet needs regeneration) — a net
reduction versus naively calling it unconditionally. The MusicBrainz lookup adds one HTTP call per
album ingestion (first view only, same generate-once pattern as everything else in this pipeline).

**Constraints**: Every new external call must degrade gracefully (return an empty/null result) on
failure rather than throwing, matching the existing posture of every provider in this codebase
(`EncyclopediaProvider`, `DiscographyProvider`, etc.). Wikidata and MusicBrainz both require a
descriptive `User-Agent` header per their published usage policies; both reuse the existing
`ENCYCLOPEDIA_PROVIDER_USER_AGENT` environment variable rather than introducing new ones, since it
already serves this "who is calling" identity purpose for another Wikimedia-adjacent integration.

**Scale/Scope**: Backend-only change confined to the provider and ingestion/context-assembly layers,
plus one small UI component fix (`InfluenceList`); no new page, route, or Server Action.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Unified Next.js App Router Stack** — PASS. All changes stay inside the existing Next.js app
  (`app/lib/providers/`, `app/lib/ingestion/`, `app/lib/ai/`); no new service.
- **II. Supabase as the Backend Platform** — PASS. No schema change; the existing
  `artist_discography_cache` table is reused as-is, with no new RLS surface.
- **III. Server Actions for All Mutations** — PASS. All persistence continues to happen inside the
  existing `assembleAlbumContext` / search Server Actions; no new mutation entry point.
- **IV. Disciplined AI Integration via Groq** — PASS, actionable. The refusal-detection addition
  extends the existing single validation gate (`publishing-gate.ts`) rather than adding a second one;
  the fallback-logging fix adds observability to the existing single wrapped `GroqClient`, not a
  second AI integration point.
- **V. Test-First & Mandatory Coverage** — PASS, actionable. Every new/modified function
  (`CatalogProvider`, `HistoricalEventsProvider`, `MusicBrainzProvider`, `ingestAlbum`,
  `album-context.ts`, `narrative.ts`, `publishing-gate.ts`, `narrative-article.ts`, `client.ts`,
  `InfluenceList.tsx`) ships a co-located test with external services mocked via injected `fetchImpl`;
  full suite passing at 338/338 (one pre-existing flaky timeout confirmed unrelated on isolated
  re-run).
- **VI. Serena-First Code Intelligence** — NOTED, not followed for this feature's implementation.
  Serena's MCP tools connected mid-session pointed at an unrelated project directory (`D:\back`);
  re-pointing them was judged higher-risk/lower-value mid-task than continuing with the already-
  proven Read/Grep/Edit workflow for this specific feature. Flagged here rather than silently
  ignored, per the constitution's instruction to document rather than skip a gate. No functional
  impact — the same files were read and edited either way.
- **VII. Observability & Security Rails** — PASS. No new secret; both new external calls are
  unauthenticated public APIs. The AI-fallback logging change is itself an observability
  improvement (FR-010).

**Violation requiring justification**: Principle VI (Serena-First Code Intelligence) — see Complexity
Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/007-external-data-reliability/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
└── tasks.md              # Phase 2 output
```

### Source Code (repository root)

```text
app/lib/providers/
├── catalog-provider.ts                 # rewritten: Deezer instead of Spotify, same CatalogProviderAdapter shape
├── catalog-provider.test.ts            # rewritten for Deezer
├── historical-events-provider.ts       # new: Wikidata SPARQL query, noise filtering, dedup
├── historical-events-provider.test.ts  # new
├── musicbrainz-provider.ts             # new: release-group first-release-date lookup
├── musicbrainz-provider.test.ts        # new
└── provider.interface.ts               # modified: HistoricalEventsProviderAdapter, RawHistoricalEventData added

app/lib/ingestion/
├── ingest-album.ts                     # modified: IngestionProviders gains musicbrainz; releaseDate corrected to the earlier full date
├── ingest-album.test.ts                # modified
├── album-context.ts                    # modified: historicalEvents fetch gated to only run when world_context needs generation
└── album-context.test.ts               # modified

app/lib/ai/
├── narrative.ts                        # modified: world_context prompt forces kind "interpretation", empty sourceIds (can't cite historical-event grounding as a source excerpt)
├── publishing-gate.ts                  # modified: reject refusal-phrase statements
├── publishing-gate.test.ts             # modified
└── client.ts                           # modified: log primary-to-fallback model transitions

app/lib/db/
└── narrative-article.ts                # modified: createPending recovers from a concurrent unique-violation instead of crashing
    narrative-article.test.ts           # modified

app/actions/
├── album-context.ts                    # modified: construct MusicBrainzProvider; remove Spotify client id/secret construction
└── search.ts                           # modified: remove Spotify client id/secret construction

components/
├── InfluenceList.tsx                   # modified: explicit empty-state message instead of rendering nothing
└── InfluenceList.test.tsx              # modified

.env.local.example                      # modified: remove CATALOG_PROVIDER_CLIENT_ID / CLIENT_SECRET
```

**Structure Decision**: Single existing Next.js project (per constitution Principle I). Every new
capability slots into an existing role interface (`CatalogProviderAdapter`,
`HistoricalEventsProviderAdapter` alongside the other `*ProviderAdapter` interfaces,
`AlbumContextDeps`) rather than introducing a new one, consistent with this codebase's existing
provider architecture (a fixed role interface per concern, swappable backing service per provider
class).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Principle VI (Serena-First Code Intelligence) not followed during implementation | The Serena MCP tools available mid-session were bound to an unrelated project (`D:\back`); no instance was scoped to this repository at the time this feature's code was written. | Re-activating/onboarding a Serena instance against this repository mid-task was judged to cost more turnaround time than it would save for a feature already well understood from direct file reads, given the immediate priority was a user-reported data-correctness bug. Flagged here for follow-up rather than silently skipped. |

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 (data-model.md, contracts/internal-modules.md, quickstart.md): no schema
change, no new Server Action, no new secret. The one open item (Principle VI) is unchanged from the
initial check — documented, not resolved, since the feature's code is already written. All other six
gates PASS with no new exceptions.
