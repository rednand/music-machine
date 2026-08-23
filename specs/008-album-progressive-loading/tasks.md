---

description: "Task list for Album Progressive Loading"
---

# Tasks: Album Progressive Loading

**Input**: Design documents from `/specs/008-album-progressive-loading/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/server-actions.md](contracts/server-actions.md),
[quickstart.md](quickstart.md)

**Tests**: Included. Constitution Principle V ("Test-First & Mandatory Coverage,
NON-NEGOTIABLE") requires every unit of functionality created or modified to ship with
co-located automated tests — this is a standing project rule, not a per-feature opt-in.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repository root

## Phase 1: Setup

**Purpose**: No new project, dependencies, or scaffolding is needed — this is a change to an
existing Next.js app (constitution Principle I). The only "setup" is agreeing on the shared
types both later phases build on.

- [X] T001 Add the shared result types from [data-model.md](data-model.md) and
      [contracts/server-actions.md](contracts/server-actions.md) — `TechnicalSheetResult`,
      `NarrativeResult`, and the derived `GenerationStatus` (`not_started` / `in_progress` /
      `ready`) — as exported types in `app/lib/ingestion/album-context.ts`, alongside the
      existing `AlbumContextResult` type (kept temporarily for the old call sites until T004
      removes it)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Split the single `assembleAlbumContext`/`getAlbumContext` pairing into a
technical-sheet path and a narrative path. Both User Story 1 and User Story 2 depend on this
split existing — no story-specific work can start until it's done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `app/lib/ingestion/album-context.ts`, extract `assembleTechnicalSheet(albumId,
      deps)`: finds the album (returns `{state:"not_found"}` if missing), runs `ingestAlbum` +
      `persistCredits`/`persistTracks`/`persistPerformanceRecords` (today's
      `album-context.ts:247-264`), resolves `findSameEraAlbums`, `findArtistDiscography`, and
      `resolveRecommendations` (today's `album-context.ts:452-462` + `397-422`), and returns a
      `TechnicalSheetResult` — **without** checking or being blocked by
      `narrative_articles` status at all
- [X] T003 [P] In `app/lib/ingestion/album-context.ts`, extract `assembleNarrative(albumId,
      deps)`: reuses the existing facet resolve-or-generate-or-pending logic
      (`generateAllFacets`, `publishFacet`, the `narrative_articles` status checks from today's
      `assembleAlbumContext` lines 432-439 and 465-490) to compute and return a `NarrativeResult`
      keyed off the derived `GenerationStatus`, independent of technical-sheet data
- [X] T004 In `app/lib/ingestion/album-context.ts`, remove the now-unused monolithic
      `assembleAlbumContext` and its `AlbumContextResult` type once T002/T003 cover its behavior
- [X] T005 [P] In `app/actions/album-context.ts`, replace `getAlbumContext` with
      `getAlbumTechnicalSheet(albumId)` (calls `assembleTechnicalSheet`, same DI wiring for
      Supabase/providers already present in this file) and `getAlbumNarrative(albumId)` (calls
      `assembleNarrative`, same DI wiring for the AI clients already present in this file)
- [X] T006 `app/lib/ingestion/album-context.test.ts`: update/split existing
      `assembleAlbumContext` tests into tests for `assembleTechnicalSheet` (asserts it returns
      ready technical data without triggering or waiting on AI generation, and does so even when
      narrative generation is mid-flight for that album — this fixes today's bug where the
      "pending" early-return skips technical data entirely) and `assembleNarrative` (asserts the
      not_started/in_progress/ready/error states derive correctly from `narrative_articles` rows)
- [X] T007 [P] `app/actions/album-context.test.ts`: add/update tests for `getAlbumTechnicalSheet`
      and `getAlbumNarrative` wiring (mocking Supabase/AI clients per constitution Principle V)

**Checkpoint**: Foundation ready — both entry points exist, tested, and return the right shape.
User story implementation can now begin.

---

## Phase 3: User Story 1 - See album details as soon as they're available (Priority: P1) 🎯 MVP

**Goal**: Selecting a new album opens the album page as soon as the technical sheet/tracklist is
ready, with AI-dependent sections showing a loading indicator instead of blocking the whole page.

**Independent Test**: Select a new album from search; the page must render title, artist,
tracklist, and credits before any AI-written text appears, with visible loading placeholders
where that text will go.

### Implementation for User Story 1

- [X] T008 [US1] Update `app/(public)/albums/[albumId]/page.tsx` to await only
      `getAlbumTechnicalSheet(albumId)` (instead of `getAlbumContext`), render the page shell
      (`Header`, `AlbumTabs`, `AlbumInfoCards`, `TrackList`, `CreditsList`, `PerformancePanel`,
      `MusicalSceneGrid`, `OtherAlbumsByArtist`, `RecommendationsList`) with that data, and pass
      `albumId` into a new narrative section (T010) instead of reading `body.artistMoment` /
      `body.worldContext` / `body.receptionVsLegacy` / `body.influence` / `body.curiosities`
      directly
- [X] T009 [P] [US1] Update `app/(public)/albums/[albumId]/loading.tsx` copy so it describes
      waiting for the technical sheet/tracklist specifically (not the full album context, which
      no longer blocks this fallback)
- [X] T010 [US1] Create `components/NarrativeSections.tsx`: a client component that takes
      `albumId` and an initial `NarrativeResult`, and renders `NarrativeSection`,
      `CategoryCardGrid`, `ReceptionSplit`, `InfluenceList`, and `CuriositiesList` each wrapped so
      that a `not_started`/`in_progress` status shows `components/LoadingIndicator.tsx` in that
      section's place instead of the section itself (polling wired in T014, US2)
- [X] T011 [P] [US1] `components/NarrativeSections.test.tsx`: test that each AI-dependent section
      renders its loading placeholder when status is `not_started`/`in_progress`, and renders
      normally when given `ready` data with content
- [X] T012 [P] [US1] `app/(public)/albums/[albumId]/page.test.tsx` (or equivalent): test that the
      page renders technical-sheet content from a mocked `getAlbumTechnicalSheet` without calling
      or awaiting `getAlbumNarrative`

**Checkpoint**: Opening a new album's page shows technical data immediately, with loading
placeholders for AI sections — independently verifiable without User Story 2 existing yet.

---

## Phase 4: User Story 2 - AI-generated content appears without a page reload (Priority: P2)

**Goal**: Once AI narrative generation finishes, the sections that were showing loading
placeholders update in place automatically.

**Independent Test**: With the page open in the loading state from User Story 1, wait for
generation to finish and confirm the sections populate on their own, with no reload.

### Implementation for User Story 2

- [X] T013 [P] [US2] In `app/actions/album-context.ts`, gate `getAlbumNarrative` with a per-user
      rate limit using the existing `InMemoryRateLimiter` (`app/lib/rate-limit.ts`, currently
      unused by any Server Action) — required by constitution Principle III since this action can
      trigger Groq/Gemini calls
- [X] T014 [US2] Add polling to `components/NarrativeSections.tsx` (or a wrapping
      `components/NarrativePoller.tsx`): call `getAlbumNarrative(albumId)` on a fixed interval
      while status is `not_started`/`in_progress`, update the rendered sections in place when it
      becomes `ready`, and stop polling once `ready` or `error` is reached
- [X] T015 [US2] Ensure `app/(public)/albums/[albumId]/page.tsx` (re)opened for an album whose
      narrative previously finished renders the finished content directly on first paint (calls
      `getAlbumNarrative` once server-side for the initial value, per contracts/server-actions.md,
      instead of always starting the client in a loading state)
- [X] T016 [P] [US2] `app/lib/rate-limit.test.ts`: add a test covering the new per-user guard
      usage on `getAlbumNarrative` (repeated calls within the window are rejected/deferred, not
      silently duplicated)
- [X] T017 [P] [US2] `components/NarrativeSections.test.tsx`: add a test that polling stops after
      a `ready` or `error` result, and that content swaps in without unmounting/remounting the
      rest of the page

**Checkpoint**: User Stories 1 and 2 together deliver the full "open early, fill in
automatically" experience.

---

## Phase 5: User Story 3 - Clear feedback when something goes wrong (Priority: P3)

**Goal**: Failures in technical-sheet retrieval or AI generation show clear, scoped error states
instead of indefinite loading or a broken page.

**Independent Test**: Force a technical-data failure for a new album and confirm an error message
appears instead of an infinite loader; separately, force one AI facet to fail and confirm only
that section shows an error while the others load/display normally.

### Implementation for User Story 3

- [X] T018 [US3] In `app/lib/ingestion/album-context.ts`, ensure `assembleTechnicalSheet` catches
      catalog/provider ingestion failures and returns `{state:"error", message}` (per
      contracts/server-actions.md) instead of throwing
- [X] T019 [P] [US3] Update `app/(public)/albums/[albumId]/page.tsx` to render a clear error
      message when `getAlbumTechnicalSheet` returns `{state:"error"}` (spec FR-006)
- [X] T020 [US3] Update `components/NarrativeSections.tsx` so that a `NarrativeResult` of
      `{state:"error"}`, or a `ready` result where an individual facet is empty due to
      `failed_validation`, renders a per-section error state for just that section rather than
      blocking the others (spec FR-007)
- [X] T021 [P] [US3] `app/lib/ingestion/album-context.test.ts`: add tests for
      `assembleTechnicalSheet` returning `{state:"error"}` on a simulated provider failure
- [X] T022 [P] [US3] `components/NarrativeSections.test.tsx`: add tests for the per-section error
      rendering (`error` state and a `ready` result with one failed facet)

**Checkpoint**: All three user stories are independently functional; failures are visible and
scoped instead of hanging or crashing the page.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories.

- [ ] T023 Run [quickstart.md](quickstart.md) end-to-end against the dev server (happy path,
      resume-after-close, duplicate-selection, and both failure scenarios)
- [X] T024 Run `yarn test` and confirm coverage does not regress below the project's 80% floor
      (constitution Principle V)
- [X] T025 Run `npm run lint` and confirm it passes with no errors (constitution: Development
      Workflow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 only
- **User Story 2 (Phase 4)**: Depends on Phase 2; builds on the `NarrativeSections` component
  introduced in Phase 3 (T010) but is independently testable once that component exists in its
  loading-only form
- **User Story 3 (Phase 5)**: Depends on Phase 2; touches the same files as Phases 3-4 (error
  branches) but is independently testable via forced failures
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Within Each Phase

- Tests for a task's file are written alongside (not strictly before) that task's implementation
  here, since most tasks modify existing, already-tested modules rather than greenfield ones —
  run the relevant test file after each task and before moving to the next.
- T004 (delete old `assembleAlbumContext`) must come after T002 and T003.
- T015 (US2) depends on T010 (US1) and T013/T014 (US2) existing first.

### Parallel Opportunities

- T003 and T005's narrative half can proceed alongside T002's technical half once both are
  scoped, but T004 must wait for both.
- T009, T011, T012 (US1) can run in parallel with each other once T008/T010 land.
- T013 and T016 (US2, rate limiting) can run in parallel with T014/T017 (US2, polling UI).
- T019, T021, T022 (US3) can run in parallel once T018/T020 land.

---

## Parallel Example: Foundational Phase

```bash
Task: "Extract assembleTechnicalSheet in app/lib/ingestion/album-context.ts"
Task: "Extract assembleNarrative in app/lib/ingestion/album-context.ts"
# Both land, then:
Task: "Remove old assembleAlbumContext/AlbumContextResult"
Task: "Split getAlbumContext into getAlbumTechnicalSheet/getAlbumNarrative in app/actions/album-context.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: confirm the technical sheet renders immediately with loading
   placeholders where AI content will go (quickstart.md section 1, steps 1-4)
5. Deploy/demo if ready — this alone already removes the single biggest source of perceived wait

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → technical sheet renders early, AI sections show loading (MVP)
3. User Story 2 → AI sections fill in automatically, resumable after tab close
4. User Story 3 → failures are visible instead of silent/indefinite
5. Polish → full quickstart validation, coverage, lint

## Notes

- [P] tasks touch different files, or the same file in non-overlapping ways, with no dependency
  on an incomplete task
- Commit after each task or logical group
- Avoid combining T004 (deletion) with T002/T003 (extraction) in the same commit — land the new
  functions and their tests first, delete the old one once both are proven equivalent
