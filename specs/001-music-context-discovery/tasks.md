---

description: "Task list for Music Context — Historical & Cultural Discovery"
---

# Tasks: Music Context — Historical & Cultural Discovery

**Input**: Design documents from `/specs/001-music-context-discovery/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md,
quickstart.md

**Tests**: Mandatory, not optional — the project constitution's Principle I (Test-First &
Mandatory Coverage, NON-NEGOTIABLE) requires automated tests for every unit of functionality
created. Every phase below therefore includes a Tests sub-phase; write and confirm those
tests fail before doing the matching implementation task.

**Organization**: Tasks are grouped by user story (from spec.md, priority order P1–P5) to
enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths are included in every description

## Path Conventions

Web application split per plan.md: `backend/src/`, `backend/tests/`, `frontend/src/`,
`frontend/tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create the backend/frontend directory structure per plan.md's Project Structure
  (`backend/src/{domain,providers,ingestion,ai,services,cache,repositories,api}`,
  `backend/tests/{contract,integration,unit}`, `frontend/src/{pages,components,services}`,
  `frontend/tests/{unit,e2e}`)
- [ ] T002 Initialize the backend Node.js/TypeScript project with Fastify, Prisma, ioredis,
  and a GPT SDK dependency in `backend/package.json`
- [ ] T003 [P] Initialize the frontend React/TypeScript project with Vite, React Router,
  TanStack Query, and Tailwind CSS in `frontend/package.json`
- [ ] T004 [P] Configure ESLint and Prettier for both `backend/` and `frontend/`
- [ ] T005 [P] Configure Vitest for `backend/` (`backend/vitest.config.ts`) and `frontend/`
  (`frontend/vitest.config.ts`), plus Playwright for `frontend/tests/e2e`
  (`frontend/playwright.config.ts`)
- [ ] T006 Add a `docker-compose.yml` at the repo root provisioning local PostgreSQL and
  Redis for development
- [ ] T007 [P] Add `.env.example` documenting required environment variables (Spotify,
  MusicBrainz, Last.fm, Discogs, and GPT API credentials, database/Redis URLs) without
  committing real secrets

**Checkpoint**: Toolchain and empty project skeletons exist for both `backend/` and
`frontend/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be built

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Define the Prisma schema for all entities in data-model.md (Artist, Album, Track,
  Release, Genre, Label, Chart, ChartEntry, Review, HistoricalEvent, TimelineEvent, Source,
  ContextArticle, Recommendation) in `backend/prisma/schema.prisma`
- [ ] T009 Generate and apply the initial Prisma migration for the schema from T008
- [ ] T010 [P] Define the shared provider-adapter interface (per Principle IV's
  provider-abstraction requirement) in `backend/src/providers/provider.interface.ts`
- [ ] T011 [P] Implement the Redis-backed cache and per-provider rate-limit/backoff module in
  `backend/src/cache/rate-limit-cache.ts`
- [ ] T012 [P] Implement the `Source` repository, enforcing that `attributionText` is present
  whenever `licenseType` requires it, in `backend/src/repositories/source.repository.ts`
- [ ] T013 Set up the Fastify application skeleton with routing and middleware structure in
  `backend/src/api/app.ts`
- [ ] T014 [P] Configure structured logging and centralized error handling in
  `backend/src/api/error-handler.ts`
- [ ] T015 [P] Set up the frontend API client (TanStack Query client + typed fetch wrapper
  against `contracts/api.md`) in `frontend/src/services/apiClient.ts`
- [ ] T016 [P] Set up the frontend routing skeleton with placeholder pages in
  `frontend/src/App.tsx`
- [ ] T017 [P] Unit test the rate-limit/cache module (cache hit/miss, backoff behavior) in
  `backend/tests/unit/rate-limit-cache.test.ts`
- [ ] T018 [P] Unit test the `Source` repository's attribution-required validation in
  `backend/tests/unit/source.repository.test.ts`
- [ ] T019 Contract test that the Fastify app boots and a health-check route responds in
  `backend/tests/contract/health.test.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Discover the context of an album (Priority: P1) 🎯 MVP

**Goal**: A user can search for an artist/album/track and open a context page narrating the
artist's moment, the era's musical scene, what was happening in the world, the release
timeline, chart performance (when available), critical reception, legacy, and
contemporaneous albums, with every factual claim traceable to a source.

**Independent Test**: Search a seeded, well-documented artist/album, open its context page,
and verify every mandatory section (including the "what was happening in the world"
historical-context section) renders with sourced content, and that missing performance data
degrades gracefully instead of being fabricated (spec.md Scenario 1–4).

### Tests for User Story 1 ⚠️

> Write these first and confirm they fail before implementing the tasks below them.

- [ ] T020 [P] [US1] Contract test for `GET /search` (including the same-title
  disambiguation and empty-results cases) in `backend/tests/contract/search.test.ts`
- [ ] T021 [P] [US1] Contract test for `GET /albums/{albumId}/context` (including the
  `worldContext` array, the `performance: null` case, and the `202 pending` case) in
  `backend/tests/contract/album-context.test.ts`
- [ ] T022 [P] [US1] Contract test for `GET /tracks/{trackId}/context` (standalone single,
  no `trackCount`) in `backend/tests/contract/track-context.test.ts`
- [ ] T023 [P] [US1] Integration test for the Spotify provider adapter (mocked HTTP) in
  `backend/tests/integration/providers/spotify.test.ts`
- [ ] T024 [P] [US1] Integration test for the MusicBrainz provider adapter (mocked HTTP) in
  `backend/tests/integration/providers/musicbrainz.test.ts`
- [ ] T025 [P] [US1] Integration test for the Discogs provider adapter (mocked HTTP) in
  `backend/tests/integration/providers/discogs.test.ts`
- [ ] T026 [P] [US1] Integration test for the Last.fm provider adapter (mocked HTTP) in
  `backend/tests/integration/providers/lastfm.test.ts`
- [ ] T027 [P] [US1] Integration test for the Wikidata/Wikipedia provider adapter, including
  its chart/certification/sales infobox extraction (mocked HTTP), in
  `backend/tests/integration/providers/wikidata.test.ts`
- [ ] T028 [US1] Integration test for the source-priority reconciliation pipeline, including
  the conflicting-sources-at-the-same-tier case, in
  `backend/tests/integration/reconciliation.test.ts`
- [ ] T029 [US1] Integration test for the grounded AI narrative pipeline (GPT call mocked)
  asserting every `fact` statement carries at least one `sourceId` and the automated
  publishing gate rejects a malformed statement, in `backend/tests/integration/ai-pipeline.test.ts`
- [ ] T030 [P] [US1] Unit test for the HistoricalEvent relevance-scoring/per-category-cap
  curation logic (FR-011, FR-012, FR-011a) in
  `backend/tests/unit/historical-event-curation.test.ts`
- [ ] T031 [P] [US1] Integration test for the Chart, ChartEntry, Review, and TimelineEvent
  repositories (persistence round-trip) in
  `backend/tests/integration/repositories/chart-review-timeline.test.ts`
- [ ] T032 [US1] Integration test for the `ContextArticle` repository's state transitions
  (`pending` → `published`, `pending` → `failed_validation`, `published` → `stale` →
  `pending`) in `backend/tests/integration/context-article-state.test.ts`
- [ ] T033 [P] [US1] End-to-end test for spec.md Scenario 1 (search → context page, including
  the world-context section → click a source link → open a same-era album) in
  `frontend/tests/e2e/album-context.spec.ts`

### Implementation for User Story 1

- [ ] T034 [P] [US1] Implement the Spotify adapter (catalog, cover art, artists, albums,
  tracks) in `backend/src/providers/spotify/spotify.adapter.ts`
- [ ] T035 [P] [US1] Implement the MusicBrainz adapter (artists, albums, dates, labels,
  credits, identifiers) in `backend/src/providers/musicbrainz/musicbrainz.adapter.ts`
- [ ] T036 [P] [US1] Implement the Discogs adapter (releases, formats, credits, labels,
  versions) in `backend/src/providers/discogs/discogs.adapter.ts`
- [ ] T037 [P] [US1] Implement the Last.fm adapter (tags, similar artists, popularity) in
  `backend/src/providers/lastfm/lastfm.adapter.ts`
- [ ] T038 [P] [US1] Implement the Wikidata/Wikipedia adapter (context, biographies,
  historical relationships, license/attribution metadata, and best-effort chart/
  certification/sales infobox extraction per research.md §10) in
  `backend/src/providers/wikidata/wikidata.adapter.ts`
- [ ] T039 [P] [US1] Create the Artist, Album, Track, Release, Genre, and Label domain models
  in `backend/src/domain/`
- [ ] T040 [P] [US1] Create the HistoricalEvent domain model and the relevance-scoring/
  per-category-cap curation service (FR-011, FR-012, FR-011a) in
  `backend/src/domain/historical-event.ts` and
  `backend/src/services/historical-event-curation.service.ts`
- [ ] T041 [US1] Implement the source-priority reconciliation service (FR-017 order) in
  `backend/src/ingestion/reconciliation.service.ts` (depends on T034–T038)
- [ ] T042 [US1] Implement the ingestion pipeline orchestrator that normalizes and reconciles
  data from all adapters into domain models in `backend/src/ingestion/ingest.service.ts`
  (depends on T041)
- [ ] T043 [US1] Implement Chart, ChartEntry, Review, and TimelineEvent repositories in
  `backend/src/repositories/` (depends on T008)
- [ ] T044 [US1] Implement the grounded AI narrative synthesis pipeline (structured-data
  prompt assembly, fact/interpretation/opinion/unconfirmed tagging, per-statement citation
  binding, pt-BR synthesis of non-Portuguese sources) in
  `backend/src/ai/narrative.service.ts` (depends on T041)
- [ ] T045 [US1] Implement the automated publishing validation gate (citation completeness,
  banned-content checks for lyrics/copied text, schema validation) in
  `backend/src/ai/publishing-gate.service.ts` (depends on T044)
- [ ] T046 [US1] Implement the `ContextArticle` repository with `pending` / `published` /
  `failed_validation` / `stale` state transitions in
  `backend/src/repositories/context-article.repository.ts`
- [ ] T047 [US1] Implement the search service (artist/album/track lookup with
  disambiguation) in `backend/src/services/search.service.ts` (depends on T039)
- [ ] T048 [US1] Implement the `GET /search` route in
  `backend/src/api/routes/search.route.ts` (depends on T047)
- [ ] T049 [US1] Implement the album-context assembly service (header, career moment,
  musical scene, world context via T040's curation service, timeline, performance,
  reception, legacy, same-era) in `backend/src/services/album-context.service.ts` (depends
  on T040, T042, T043, T044, T046)
- [ ] T050 [US1] Implement the `GET /albums/{albumId}/context` route in
  `backend/src/api/routes/album-context.route.ts` (depends on T049)
- [ ] T051 [US1] Implement the `GET /tracks/{trackId}/context` route reusing the album-context
  assembly logic minus album-only fields in
  `backend/src/api/routes/track-context.route.ts` (depends on T049)
- [ ] T052 [P] [US1] Implement the frontend Search page in
  `frontend/src/pages/SearchPage.tsx`
- [ ] T053 [P] [US1] Implement the frontend Context page and its Header, Timeline,
  WorldContext, ChartPerformance, ReceptionList, and SameEraList components in
  `frontend/src/pages/ContextPage.tsx` and `frontend/src/components/`
- [ ] T054 [US1] Wire search-result-to-context-page navigation in `frontend/src/App.tsx`
  (depends on T052, T053)
- [ ] T055 [US1] Implement the "unavailable" (not fabricated/blank) rendering state for
  missing performance data in `frontend/src/components/ChartPerformance.tsx`
- [ ] T056 [US1] Add structured logging for search and context-assembly operations in
  `backend/src/services/search.service.ts` and `backend/src/services/album-context.service.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the
MVP.

---

## Phase 4: User Story 2 - Explore a moment in music history (Priority: P2)

**Goal**: A user selects a year, month, or decade and sees a curated snapshot of releases,
rising artists, top songs, and cultural context for that period.

**Independent Test**: Select a specific month/year with no prior search and verify a
populated, non-exhaustive snapshot appears (spec.md Scenario 2).

### Tests for User Story 2 ⚠️

- [ ] T057 [P] [US2] Contract test for `GET /periods` (year, year+month, and decade query
  forms; sparse-period partial-array case) in `backend/tests/contract/periods.test.ts`
- [ ] T058 [P] [US2] End-to-end test for spec.md Scenario 2 (period explorer) in
  `frontend/tests/e2e/period-explorer.spec.ts`

### Implementation for User Story 2

- [ ] T059 [US2] Implement the periods service aggregating releases, rising artists, top
  singles, and curated events (reusing T040's curation service) for a given year/month/decade
  in `backend/src/services/periods.service.ts` (depends on T042, T040)
- [ ] T060 [US2] Implement the `GET /periods` route in
  `backend/src/api/routes/periods.route.ts` (depends on T059)
- [ ] T061 [P] [US2] Implement the frontend Period Explorer page in
  `frontend/src/pages/PeriodExplorerPage.tsx`
- [ ] T062 [US2] Wire the year/month/decade picker to the Period Explorer page in
  `frontend/src/App.tsx` (depends on T061)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Discover through a curated home experience (Priority: P3)

**Goal**: A visitor with no specific query opens the home screen and finds a "today in music
history" highlight, decade browsing, and featured albums.

**Independent Test**: Open the home screen with no prior interaction and verify the
highlight, decade entry points, and featured albums are present and each links to a valid
context page (spec.md Scenario 3).

### Tests for User Story 3 ⚠️

- [ ] T063 [P] [US3] Contract test for `GET /home` in `backend/tests/contract/home.test.ts`
- [ ] T064 [P] [US3] End-to-end test for spec.md Scenario 3 (home discovery) in
  `frontend/tests/e2e/home.spec.ts`

### Implementation for User Story 3

- [ ] T065 [US3] Implement the home service ("on this day" lookup, decade entry points,
  featured-album selection) in `backend/src/services/home.service.ts` (depends on T042)
- [ ] T066 [US3] Implement the `GET /home` route in `backend/src/api/routes/home.route.ts`
  (depends on T065)
- [ ] T067 [P] [US3] Implement the frontend Home page with the on-this-day highlight, decade
  navigation, and featured albums in `frontend/src/pages/HomePage.tsx`

**Checkpoint**: User Stories 1, 2, and 3 all work independently.

---

## Phase 6: User Story 4 - Compare two albums (Priority: P4)

**Goal**: A user selects two albums and sees a side-by-side comparison across date,
performance, singles, reception, genre, context, impact, and legacy.

**Independent Test**: Select any two albums and verify a side-by-side comparison renders,
with unavailable dimensions shown as such rather than blocking the view; verify comparing an
album to itself is rejected (spec.md Scenario 4).

### Tests for User Story 4 ⚠️

- [ ] T068 [P] [US4] Contract test for `GET /compare`, including the 400 self-comparison
  case, in `backend/tests/contract/compare.test.ts`
- [ ] T069 [P] [US4] End-to-end test for spec.md Scenario 4 (compare two albums) in
  `frontend/tests/e2e/compare.spec.ts`

### Implementation for User Story 4

- [ ] T070 [US4] Implement the comparison service, including rejecting self-/duplicate-
  release comparisons, in `backend/src/services/compare.service.ts` (depends on T049)
- [ ] T071 [US4] Implement the `GET /compare` route in
  `backend/src/api/routes/compare.route.ts` (depends on T070)
- [ ] T072 [P] [US4] Implement the frontend Compare page (side-by-side view) in
  `frontend/src/pages/ComparePage.tsx`

**Checkpoint**: User Stories 1–4 all work independently.

---

## Phase 7: User Story 5 - Get contextual recommendations beyond similarity (Priority: P5)

**Goal**: While viewing an album's context page, a user sees recommended albums each
explained by a non-similarity reason (same era, genre movement, influence, or historical
importance).

**Independent Test**: View any album's context page and verify each recommendation states a
non-similarity reason, and that opening a recommendation lands on that album's own context
page (spec.md Scenario 5).

### Tests for User Story 5 ⚠️

- [ ] T073 [P] [US5] Contract test for `GET /albums/{albumId}/recommendations` in
  `backend/tests/contract/recommendations.test.ts`
- [ ] T074 [P] [US5] End-to-end test for spec.md Scenario 5 (contextual recommendations) in
  `frontend/tests/e2e/recommendations.spec.ts`

### Implementation for User Story 5

- [ ] T075 [US5] Implement the Recommendation/RelatedAlbum/RelatedArtist domain model and the
  reasoned-recommendation service (same_era, same_genre_movement, direct_influence,
  historical_importance, contemporary_artist) in `backend/src/domain/recommendation.ts` and
  `backend/src/services/recommendation.service.ts` (depends on T042)
- [ ] T076 [US5] Implement the `GET /albums/{albumId}/recommendations` route in
  `backend/src/api/routes/recommendations.route.ts` (depends on T075)
- [ ] T077 [P] [US5] Implement the frontend RecommendationCard component (showing the reason
  and explanation) in `frontend/src/components/RecommendationCard.tsx`

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements and validation that span multiple user stories

- [ ] T078 [P] Run every scenario in quickstart.md end-to-end against a seeded reference
  dataset and record results
- [ ] T079 [P] Add unit tests for domain validation rules (`Artist.activeTo` ordering,
  `Album.trackCount` never fabricated, `Source.attributionText` requirement) in
  `backend/tests/unit/domain-validation.test.ts`
- [ ] T080 Security/compliance pass: confirm no secrets are committed, rate-limit handling is
  active on every provider call, and no endpoint returns full lyrics or copied review text
  (FR-023, FR-024)
- [ ] T081 [P] Update `README.md` at the repo root with setup and run instructions consistent
  with quickstart.md
- [ ] T082 Verify the Performance Goals from plan.md (search ≤ 500ms p95, cached context page
  ≤ 2s p95, first-ever generation ≤ 12s p95 before falling back to a "preparing" state)
- [ ] T083 Code cleanup and refactor pass across `backend/src/` and `frontend/src/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Stories 2–5 (Phases 4–7)**: Depend on Foundational; Phases 4, 5, and 7 additionally
  reuse services built in Phase 3 (T042 ingestion, T049 album-context assembly, T040
  historical-event curation) but do not require Phase 3's own tests/checkpoints to be
  revisited — each story remains independently testable through its own contract/e2e tests
- **Polish (Phase 8)**: Depends on all desired user story phases being complete

### Within Each User Story

- Tests are written first and confirmed to fail before their matching implementation task
- Domain models before services; services before routes; routes before frontend wiring
- Story is complete and independently testable before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run together
- All Foundational tasks marked [P] can run together (within Phase 2)
- Once Foundational completes, Phase 3 (US1) can start; Phases 4/5/7 can start on domain
  scaffolding in parallel but their service tasks that depend on T042/T049/T040 must wait for
  those Phase 3 tasks to land
- All [P] tests within a story can run together
- All [P] provider adapters (T034–T038) can be implemented together

---

## Parallel Example: User Story 1 provider adapters

```bash
Task: "Implement the Spotify adapter in backend/src/providers/spotify/spotify.adapter.ts"
Task: "Implement the MusicBrainz adapter in backend/src/providers/musicbrainz/musicbrainz.adapter.ts"
Task: "Implement the Discogs adapter in backend/src/providers/discogs/discogs.adapter.ts"
Task: "Implement the Last.fm adapter in backend/src/providers/lastfm/lastfm.adapter.ts"
Task: "Implement the Wikidata/Wikipedia adapter in backend/src/providers/wikidata/wikidata.adapter.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Deploy/demo if ready — this alone satisfies the spec's stated success criteria (search →
   open → understand context → discover another album)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate → deploy/demo (MVP)
3. User Story 2 (period exploration) → validate → deploy/demo
4. User Story 3 (home discovery) → validate → deploy/demo
5. User Story 4 (comparison) → validate → deploy/demo
6. User Story 5 (contextual recommendations) → validate → deploy/demo

## Notes

- [P] tasks touch different files with no unmet dependency
- [Story] labels map every phase-3+ task to its user story for traceability
- Per the project constitution: use Serena MCP tools for all code search/navigation while
  implementing these tasks (not grep/ripgrep), and do not add code comments or emojis to
  source files
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
