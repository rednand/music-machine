---

description: "Task list for Music Time Machine"
---

# Tasks: Music Time Machine

**Input**: Design documents from `/specs/002-music-time-machine/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md,
quickstart.md

**Tests**: Mandatory, not optional — the project constitution's Principle V (Test-First &
Mandatory Coverage, NON-NEGOTIABLE) requires automated tests co-located with every source file,
mocking external services, coverage ≥80%. Every phase below includes a Tests sub-phase; write
and confirm those tests fail before doing the matching implementation task.

**Organization**: Tasks are grouped by user story (from spec.md, priority order P1–P4) to enable
independent implementation and testing of each story. `Influence` (the confirmed-relationship
entity rendered on every album page per spec.md US1 Acceptance Scenario 2 and FR-010) is built in
User Story 1, not User Story 2 — only `Recommendation` (the "listen next" suggestion entity) is
new in User Story 2. This keeps Phase 3 independently completable per its own acceptance
criteria.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in every description; tests are co-located next to their source
  file (e.g., `app/lib/x.ts` ships with `app/lib/x.test.ts`), per constitution Principle V.

## Path Conventions

Single Next.js App Router project per plan.md: `app/(public)/`, `app/actions/`, `app/lib/`,
`components/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize the Next.js (App Router) project with TypeScript, Tailwind CSS, and a
  shadcn/ui component set (`components.json`) at the repository root
- [X] T002 [P] Configure ESLint so `npm run lint` passes with no errors, per the constitution's
  Development Workflow
- [X] T003 [P] Configure Vitest and `@vitest/coverage-v8` for co-located tests (`app/**/*.test.ts`,
  `app/**/*.test.tsx`)
- [X] T004 [P] Add `.env.local.example` documenting required environment variables (Supabase URL/
  anon key/service-role key, Groq API key, chosen external-provider credentials, Sentry DSN) per
  constitution Principle VII — without committing real secrets
- [X] T005 [P] Configure Sentry instrumentation scaffolding (server, edge, client entry points)
- [X] T006 [P] Add `lucide-react` and `sonner`, wiring a `<Toaster>` provider for the app

**Checkpoint**: Toolchain and an empty Next.js project skeleton exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be built

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Write the Supabase SQL migration for every table in data-model.md (Artist, Album,
  Track, Credit, PerformanceRecord, Review, HistoricalEvent, Curiosity, Influence,
  Recommendation, Source, NarrativeArticle) with RLS enabled and a public `SELECT` policy on each
  (research.md §6), no write policy for anon/authenticated roles
- [X] T008 [P] Implement the Supabase SSR client in `app/lib/supabase/server.ts` (+
  `server.test.ts`, Supabase mocked)
- [X] T009 [P] Implement the Supabase browser client in `app/lib/supabase/client.ts` (+
  `client.test.ts`)
- [X] T010 [P] Implement the Supabase service-role client in `app/lib/supabase/admin.ts` (+
  `admin.test.ts`); this module MUST NOT be imported from any file under a `"use client"`
  boundary
- [X] T011 [P] Define the shared external-provider adapter interface in
  `app/lib/providers/provider.interface.ts` (+ `provider.interface.test.ts` validating a mock
  adapter conforms)
- [X] T012 [P] Implement the wrapped Groq client with a fallback strategy in
  `app/lib/ai/client.ts` (+ `client.test.ts`, Groq SDK mocked), per constitution Principle IV
- [X] T013 [P] Implement defensive structured-output parsing (regex-extract JSON before
  `JSON.parse`) in `app/lib/ai/parse-response.ts` (+ `parse-response.test.ts`)
- [X] T014 [P] Implement the source-priority reconciliation function (FR-016 order) in
  `app/lib/ingestion/reconciliation.ts` (+ `reconciliation.test.ts`), including the
  conflicting-sources-at-the-same-tier case
- [X] T015 [P] Implement the per-client-IP rate limiter for AI-backed Server Actions in
  `app/lib/rate-limit.ts` (+ `rate-limit.test.ts`), per constitution Principle III
- [X] T016 Set up the root layout (`app/layout.tsx`) with Tailwind/shadcn providers, the Sonner
  `<Toaster>`, and the responsive shell (sidebar for tablet/desktop, bottom nav for mobile) (+
  `layout.test.tsx`)
- [X] T017 [P] Configure Next.js data-cache defaults (revalidation window) for external-provider
  fetches in `app/lib/cache.ts` (+ `cache.test.ts`), per research.md §7

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Read an album's full story (Priority: P1) 🎯 MVP

**Goal**: A user can search an artist/album and read a narrative page — header with credits, the
artist's moment, the world at the time, the musical scene (grounded in real same-era chart
contemporaries), performance, reception-then-vs-legacy-now, curiosities (status clearly marked),
and confirmed influence — with every factual statement traceable to a source.

**Independent Test**: Search a seeded, well-documented album, open its page, and verify every
mandatory section — including influence — renders as connected prose with sourced content, and
that missing performance data degrades gracefully instead of being fabricated (quickstart.md
Scenario 1).

### Tests for User Story 1 ⚠️

> Write these first and confirm they fail before implementing the tasks below them.

- [X] T018 [P] [US1] Test for the catalog provider (mocked HTTP) in
  `app/lib/providers/catalog-provider.test.ts`
- [X] T019 [P] [US1] Test for the discography/credits provider (mocked HTTP) in
  `app/lib/providers/discography-provider.test.ts`
- [X] T020 [P] [US1] Test for the tags/popularity provider (mocked HTTP) in
  `app/lib/providers/popularity-provider.test.ts`
- [X] T021 [P] [US1] Test for the encyclopedia provider, including its best-effort chart/
  certification/award extraction (mocked HTTP), in
  `app/lib/providers/encyclopedia-provider.test.ts`
- [X] T022 [US1] Test for the album ingestion orchestrator (calls all providers, reconciles
  conflicting fields) in `app/lib/ingestion/ingest-album.test.ts`
- [X] T023 [P] [US1] Test for the HistoricalEvent relevance-scoring/per-category-cap curation
  logic in `app/lib/historical-events.test.ts`
- [X] T024 [P] [US1] Test for the same-era album/single lookup helper (±1–2 year window,
  research.md §9) in `app/lib/same-era.test.ts`
- [X] T025 [US1] Test for the Groq narrative pipeline (mocked Groq call), asserting every `fact`
  statement carries at least one `sourceId` across all four facets (artist_moment,
  world_context, musical_scene, reception_vs_legacy), AND that the `musical_scene` facet's
  prompt input includes same-era album/single data from T024's helper (not a bare album
  description), in `app/lib/ai/narrative.test.ts`
- [X] T026 [US1] Test for the automated publishing gate (citation completeness, banned-content/
  copied-text check) in `app/lib/ai/publishing-gate.test.ts`
- [X] T027 [P] [US1] Tests for the Album/Credit, PerformanceRecord, Review, Curiosity, and Source
  Supabase data-access modules (Supabase client mocked) in `app/lib/db/album.test.ts`,
  `app/lib/db/performance-record.test.ts`, `app/lib/db/review.test.ts`,
  `app/lib/db/curiosity.test.ts`, and `app/lib/db/source.test.ts`
- [X] T028 [US1] Test for the NarrativeArticle data-access module's `pending` / `published` /
  `failed_validation` / `stale` state transitions in `app/lib/db/narrative-article.test.ts`
- [X] T029 [P] [US1] Test for Influence data-access in `app/lib/db/influence.test.ts`
- [X] T030 [US1] Test for the `searchCatalog` Server Action, including same-title
  disambiguation and empty-results cases, in `app/actions/search.test.ts`
- [X] T031 [US1] Test for the `getAlbumContext` Server Action, including the `ready` / `pending`
  / `not_found` states, the `performance: null` case, and a populated `influence` array in the
  `ready` state, in `app/actions/album-context.test.ts`
- [X] T032 [P] [US1] Component test asserting `PerformancePanel` shows an "indisponível" message
  instead of fabricating data when performance is `null`, in
  `components/PerformancePanel.test.tsx`
- [X] T033 [P] [US1] Component test asserting `CuriositiesList` visibly renders a different
  label/style per `status` value (confirmed vs. unconfirmed vs. disputed) rather than presenting
  all items uniformly as fact, in `components/CuriositiesList.test.tsx`
- [X] T034 [P] [US1] Component test asserting the album page renders every mandatory section
  (including `WorldContext` and `InfluenceList`), in
  `app/(public)/albums/[albumId]/page.test.tsx`

### Implementation for User Story 1

- [X] T035 [P] [US1] Implement the catalog provider (artist/album/track metadata, cover art) in
  `app/lib/providers/catalog-provider.ts`
- [X] T036 [P] [US1] Implement the discography/credits provider (formats, labels, detailed
  personnel credits) in `app/lib/providers/discography-provider.ts`
- [X] T037 [P] [US1] Implement the tags/popularity provider in
  `app/lib/providers/popularity-provider.ts`
- [X] T038 [P] [US1] Implement the encyclopedia provider (biographical/historical context,
  license/attribution metadata, best-effort chart/certification/award extraction per
  research.md §2) in `app/lib/providers/encyclopedia-provider.ts`
- [X] T039 [US1] Implement the album ingestion orchestrator in
  `app/lib/ingestion/ingest-album.ts` (depends on T035–T038, T014)
- [X] T040 [P] [US1] Implement the HistoricalEvent domain type and the relevance-scoring/
  per-category-cap curation function in `app/lib/historical-events.ts`
- [X] T041 [P] [US1] Implement the same-era album lookup helper (±1–2 year window, research.md
  §9) in `app/lib/same-era.ts`
- [X] T042 [US1] Implement the Groq narrative pipeline — prompt assembly per facet
  (artist_moment, world_context, musical_scene, reception_vs_legacy), structured-JSON parsing,
  pt-BR synthesis of non-Portuguese sources — in `app/lib/ai/narrative.ts` (depends on T012,
  T013, T039, T040, **T041** — the `musical_scene` facet's prompt MUST be built from T041's
  same-era data, not from the album alone)
- [X] T043 [US1] Implement the automated publishing validation gate in
  `app/lib/ai/publishing-gate.ts` (depends on T042)
- [X] T044 [P] [US1] Implement Supabase data-access for Album/Track/Credit in
  `app/lib/db/album.ts`
- [X] T045 [P] [US1] Implement Supabase data-access for PerformanceRecord in
  `app/lib/db/performance-record.ts`
- [X] T046 [P] [US1] Implement Supabase data-access for Review in `app/lib/db/review.ts`
- [X] T047 [P] [US1] Implement Supabase data-access for Curiosity (defaulting `status` to
  `unconfirmed` unless a source explicitly confirms it) in `app/lib/db/curiosity.ts`
- [X] T048 [P] [US1] Implement Supabase data-access for Source, enforcing that
  `attribution_text` is present whenever `license_type` requires it, in `app/lib/db/source.ts`
- [X] T049 [US1] Implement Supabase data-access for NarrativeArticle with `pending` /
  `published` / `failed_validation` / `stale` state transitions in
  `app/lib/db/narrative-article.ts` (depends on T043)
- [X] T050 [P] [US1] Implement Influence data-access in `app/lib/db/influence.ts`
- [X] T051 [US1] Implement the `searchCatalog` Server Action in `app/actions/search.ts` (depends
  on T044)
- [X] T052 [US1] Implement the `getAlbumContext` Server Action assembling header, artist's
  moment, world context, musical scene, performance, reception-vs-legacy, curiosities, and
  influence in `app/actions/album-context.ts` (depends on T039, T042, T044–T050, T015)
- [X] T053 [P] [US1] Implement the search page in `app/(public)/page.tsx`
- [X] T054 [P] [US1] Implement the `AlbumHeader`, `NarrativeSection`, `WorldContext`,
  `PerformancePanel` (with the "indisponível" state per FR-007), `ReceptionThenVsLegacyNow`,
  `CuriositiesList` (rendering each item's confirmed/unconfirmed/disputed status visibly), and
  `InfluenceList` components in `components/`
- [X] T055 [US1] Implement the album page assembling all components in
  `app/(public)/albums/[albumId]/page.tsx` (depends on T052, T054)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP,
and it satisfies its own Acceptance Scenario 2 (influence included) without depending on any
later phase.

---

## Phase 4: User Story 2 - Follow influence and get contextual recommendations (Priority: P2)

**Goal**: Building on User Story 1's influence section, a user also gets contextual "listen
next" recommendations, each with a narrative reason.

**Independent Test**: Open any album's page, view its recommendations section, and verify each
entry carries a narrative reason and links to that album's own page (quickstart.md Scenario 2).

### Tests for User Story 2 ⚠️

- [X] T056 [P] [US2] Test for Recommendation data-access and its reasoned-recommendation logic
  (same_era, same_genre_movement, direct_influence, historical_importance) in
  `app/lib/db/recommendation.test.ts`
- [X] T057 [US2] Test extending `getAlbumContext` to include a populated `recommendations` field
  in `app/actions/album-context.test.ts`
- [X] T058 [P] [US2] Component test asserting `RecommendationsList` renders a narrative reason
  for each entry in `components/RecommendationsList.test.tsx`

### Implementation for User Story 2

- [X] T059 [P] [US2] Implement Recommendation data-access and the reasoned-recommendation logic
  in `app/lib/db/recommendation.ts`
- [X] T060 [US2] Extend `getAlbumContext` to populate `recommendations` in
  `app/actions/album-context.ts` (depends on T059)
- [X] T061 [P] [US2] Implement the `RecommendationsList` component in
  `components/RecommendationsList.tsx`
- [X] T062 [US2] Wire `RecommendationsList` click-through navigation on the album page in
  `app/(public)/albums/[albumId]/page.tsx` (depends on T061)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Explore a specific year (Priority: P3)

**Goal**: A user picks a year and sees a narrative snapshot of major releases, top hits, and
cultural/historical context for that year.

**Independent Test**: Select a year with no prior search and verify a populated narrative
snapshot appears, with sparse years showing only what's available (quickstart.md Scenario 3).

### Tests for User Story 3 ⚠️

- [ ] T063 [P] [US3] Test for the `getYearSnapshot` Server Action, including the sparse-year
  partial-data case, in `app/actions/year-explorer.test.ts`
- [ ] T064 [P] [US3] Component test for `YearSnapshot`'s narrative rendering and sparse-data
  handling in `components/YearSnapshot.test.tsx`

### Implementation for User Story 3

- [ ] T065 [US3] Implement the year-snapshot aggregation (releases, top hits, curated cultural
  events reusing T040's curation) in `app/lib/ingestion/year-snapshot.ts` (depends on
  T035–T038, T040)
- [ ] T066 [US3] Implement the `getYearSnapshot` Server Action in `app/actions/year-explorer.ts`
  (depends on T065)
- [ ] T067 [P] [US3] Implement the `YearSnapshot` component in `components/YearSnapshot.tsx`
- [ ] T068 [US3] Implement the year explorer page in `app/(public)/years/[year]/page.tsx`
  (depends on T066, T067)

**Checkpoint**: User Stories 1–3 all work independently.

---

## Phase 6: User Story 4 - Compare two albums (Priority: P4)

**Goal**: A user picks two albums and sees a side-by-side comparison of their story,
performance, reception, and legacy.

**Independent Test**: Compare any two albums and verify a side-by-side view with unavailable
dimensions shown as such; verify comparing an album to itself is rejected (quickstart.md
Scenario 4).

### Tests for User Story 4 ⚠️

- [ ] T069 [P] [US4] Test for the `compareAlbums` Server Action, including the same-album
  rejection case, in `app/actions/compare.test.ts`
- [ ] T070 [P] [US4] Component test for `CompareView`'s unavailable-dimension handling in
  `components/CompareView.test.tsx`

### Implementation for User Story 4

- [ ] T071 [US4] Implement the comparison aggregation, including same-album/same-edition
  rejection, in `app/lib/ingestion/compare-albums.ts` (depends on T044–T049)
- [ ] T072 [US4] Implement the `compareAlbums` Server Action in `app/actions/compare.ts`
  (depends on T071)
- [ ] T073 [P] [US4] Implement the `CompareView` component in `components/CompareView.tsx`
- [ ] T074 [US4] Implement the compare page in `app/(public)/compare/page.tsx` (depends on T072,
  T073)

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements and validation that span multiple user stories

- [ ] T075 [P] Run every scenario in quickstart.md end-to-end against a seeded reference dataset
  and record results
- [ ] T076 [P] Add unit tests for domain validation rules (`Artist.active_to` ordering,
  `Album.track_count` never fabricated, `Source.attribution_text` requirement,
  `Curiosity.status` defaulting) in `app/lib/domain-validation.test.ts`
- [ ] T077 Security/compliance pass: confirm no secrets are committed, RLS policies are verified
  read-only for anon/authenticated roles (T007), the rate limiter is active on
  `getAlbumContext`'s first-generation path, and no response returns full lyrics or copied
  review/article text (FR-021)
- [ ] T078 [P] Update `README.md` with setup and run instructions consistent with quickstart.md
- [ ] T079 Verify the Performance Goals from plan.md (search ≤ 500ms p95, cached album page
  ≤ 2s p95, first-ever generation ≤ 12s p95 before falling back to a "preparando" state)
- [ ] T080 Confirm Sentry captures a deliberately-thrown error at the server, edge, and client
  layers, per constitution Principle VII
- [ ] T081 [P] Add a responsive-layout verification test (viewport matrix across desktop,
  tablet, and mobile breakpoints) covering the search, album, year, and compare pages, per FR-023
- [ ] T082 [P] Define the baseline catalog for SC-003 (a fixed list of widely-recognized albums)
  and a coverage-reporting script that measures what percentage have a complete page, in
  `app/lib/reporting/baseline-coverage.ts` (+ test)
- [ ] T083 [P] Add dedicated tests for the search page, the year-snapshot aggregation, and the
  compare-albums aggregation in `app/(public)/page.test.tsx`,
  `app/lib/ingestion/year-snapshot.test.ts`, and `app/lib/ingestion/compare-albums.test.ts`
  (previously only indirectly exercised through their Server Action tests)
- [ ] T084 Code cleanup and refactor pass across `app/`

---

## Phase 8: Search fallback via external providers (enhancement to User Story 1, FR-024)

**Goal**: When a search has zero local matches, automatically look the subject up via external
providers and persist a minimal Artist/Album record so it becomes openable — without duplicating
existing local records or narrative generation (which still follows T052's generate-once path).

**Independent Test**: Search for an artist/album that has zero local rows but is findable via the
catalog provider; verify a result appears, is openable, and a second identical search does not
create a duplicate row.

### Tests for Phase 8 ⚠️

- [X] T085 [P] Test for `CatalogProvider.searchByText` (free-text query, no artist/album
  disambiguation) in `app/lib/providers/catalog-provider.test.ts`
- [X] T086 [P] Test for `createArtist`/`findArtistByName` in `app/lib/db/album.test.ts`
- [X] T087 [P] Test for the search-fallback ingestion logic (dedup against existing local
  artists/albums, slug generation, minimal-record mapping) in
  `app/lib/ingestion/search-fallback.test.ts`
- [X] T088 Test extending `searchCatalog` to trigger the fallback only when local results are
  empty, and to skip it entirely otherwise, in `app/actions/search.test.ts`

### Implementation for Phase 8

- [X] T089 [P] Implement `CatalogProvider.searchByText` in `app/lib/providers/catalog-provider.ts`
  (depends on T085)
- [X] T090 [P] Implement `createArtist`/`findArtistByName` in `app/lib/db/album.ts` (depends on
  T086)
- [X] T091 Implement the search-fallback ingestion orchestrator in
  `app/lib/ingestion/search-fallback.ts` (depends on T089, T090, T087)
- [X] T092 Wire the fallback into `searchCatalog` in `app/actions/search.ts`, using the
  service-role admin client for the write path per constitution Principle II/III (depends on T091,
  T088)

**Checkpoint**: A previously-unsearchable-but-real album becomes discoverable and openable on
first search, with no duplicate rows on repeat searches.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only — includes `Influence` (data-access
  and component), since it's required by the story's own acceptance criteria
- **User Stories 2–4 (Phases 4–6)**: Depend on Foundational; each reuses services built in
  Phase 3 (T039 ingestion, T040 historical-event curation, T041 same-era, T044–T050 data-access,
  T052 `getAlbumContext`) but does not require Phase 3's own tests/checkpoint to be revisited —
  each story remains independently testable through its own Server Action/component tests
- **Polish (Phase 7)**: Depends on all desired user story phases being complete
- **Search fallback (Phase 8)**: Depends on Foundational (T044 album data-access) and reuses
  T052's `getAlbumContext`/generate-once path unchanged; independent of Phases 4–7

### Within Each User Story

- Tests are written first and confirmed to fail before their matching implementation task
- Providers/domain helpers before ingestion; ingestion + same-era + historical-event curation
  before the AI pipeline; data-access before Server Actions; Server Actions before page/component
  wiring
- Story is complete and independently testable before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run together
- All Foundational tasks marked [P] can run together (within Phase 2)
- Once Foundational completes, Phase 3 (US1) can start; Phases 4/5/6 can start on their own
  data-access/domain scaffolding in parallel, but tasks depending on
  T039/T040/T041/T044–T050/T052 must wait for those Phase 3 tasks to land
- All [P] tests within a story can run together
- All [P] providers (T035–T038) can be implemented together

---

## Parallel Example: User Story 1 providers

```bash
Task: "Implement the catalog provider in app/lib/providers/catalog-provider.ts"
Task: "Implement the discography/credits provider in app/lib/providers/discography-provider.ts"
Task: "Implement the tags/popularity provider in app/lib/providers/popularity-provider.ts"
Task: "Implement the encyclopedia provider in app/lib/providers/encyclopedia-provider.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Deploy/demo if ready — this alone satisfies the spec's stated success criteria (search → read
   → understand the story → open another album)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate → deploy/demo (MVP)
3. User Story 2 (recommendations, building on US1's influence section) → validate → deploy/demo
4. User Story 3 (year explorer) → validate → deploy/demo
5. User Story 4 (comparison) → validate → deploy/demo

## Notes

- [P] tasks touch different files with no unmet dependency
- [Story] labels map every phase-3+ task to its user story for traceability
- Per the project constitution: use Serena MCP tools for all code search/navigation while
  implementing these tasks (not grep/ripgrep), and do not add code comments or emojis to source
  files
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
