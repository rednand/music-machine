---

description: "Task list for Complete Album Ingestion (Tracks, Performance, Curiosities, Influence)"
---

# Tasks: Complete Album Ingestion (Tracks, Performance, Curiosities, Influence)

**Input**: Design documents from `/specs/006-complete-album-ingestion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-modules.md, quickstart.md

**Tests**: Included and REQUIRED — the project constitution (Principle V, NON-NEGOTIABLE) mandates a
co-located test for every modified/new function, with external services mocked, and forbids
coverage regressing below 80%.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation
and testing of each story. All four stories add to the same shared orchestration function
(`assembleAlbumContext` in `app/lib/ingestion/album-context.ts`), so — unlike a typical feature —
they are best done in priority order rather than by separate people in parallel; see "Dependencies"
below for exactly why.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are exact and relative to the repository root

## Path Conventions

Single existing Next.js project (plan.md Project Structure) — no new project/package:

- `app/lib/providers/provider.interface.ts`, `discography-provider.ts` (+ `.test.ts`)
- `app/lib/ingestion/ingest-album.ts`, `album-context.ts` (+ `.test.ts` each)
- `app/lib/ai/curiosity-influence.ts` (new, + `.test.ts`)

## Phase 1: Setup

- [ ] T001 [P] Use Serena MCP tools (constitution Principle VI) to review the current shape of
      `app/lib/providers/provider.interface.ts`, `app/lib/providers/discography-provider.ts`,
      `app/lib/ingestion/ingest-album.ts`, `app/lib/ingestion/album-context.ts`,
      `app/lib/ai/narrative.ts`, `app/lib/ai/publishing-gate.ts`, and the `curiosity`/`influence`/
      `performance-record` repositories in `app/lib/db/`, confirming they still match the shapes
      described in plan.md/data-model.md/contracts/internal-modules.md before editing.

**Checkpoint**: No code changes in this phase — proceed once current shapes are confirmed.

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by multiple user stories.

None as separate tasks — Phase 3 (US1) establishes the one genuinely shared piece (the
independent-failure-isolation pattern inside `generateAllFacets`/`assembleAlbumContext`, research.md
§5) as part of its own implementation task (T008), since it can't be usefully built before there's
at least one new `persist*` step to isolate. Phases 4-6 each extend that same pattern rather than
rebuilding it.

**Checkpoint**: Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - See the actual tracklist for any album (Priority: P1) 🎯 MVP

**Goal**: Retrieve and store an album's individual tracks from the same external catalog source
already used for its own metadata, and show them on every view.

**Independent Test**: Open a not-yet-viewed album whose Discogs release has track data and verify
its tracklist renders with numbers, titles, and durations; reload and verify it's served from
storage, not re-fetched; open an album with no track-level data and verify the existing "no
tracklist" treatment shows instead of a broken state.

### Tests for User Story 1

- [ ] T002 [P] [US1] Add `RawTrackData` and a `fetchTracks` method to `CreditsProviderAdapter` in
      `app/lib/providers/provider.interface.ts` (contracts/internal-modules.md) — a type-only
      change, no test needed for this task itself, but it unblocks T003/T005 below
- [ ] T003 [P] [US1] Update `app/lib/providers/discography-provider.test.ts` to cover
      `fetchTracks`: maps a release response's `tracklist` (title, position, `mm:ss` duration
      parsed to seconds) into `RawTrackData[]`; returns `[]` when no release is found, reusing the
      same search-miss fixture pattern already used for `fetchCredits` (spec.md US1 AC3;
      research.md §1)
- [ ] T005 [P] [US1] Update `app/lib/ingestion/ingest-album.test.ts` to cover: `IngestedAlbum.tracks`
      is populated from `providers.discography.fetchTracks(query)`, called alongside the existing
      parallel provider calls in `ingestAlbum`
- [ ] T007 [P] [US1] Update `app/lib/ingestion/album-context.test.ts` to cover: a first view of an
      album whose `ingestAlbum` result includes tracks persists them via a new `persistTracks` call
      and returns them in `body.tracks`; a second view (tracks already stored) does not call
      `persistTracks` again; an album with no track data keeps `body.tracks` empty (spec.md US1
      AC1-3)

### Implementation for User Story 1

- [ ] T004 [US1] Implement `DiscographyProvider.fetchTracks` in
      `app/lib/providers/discography-provider.ts`, reusing the same search → release-lookup flow
      already used by `fetchCredits` (depends on T002, T003)
- [ ] T006 [US1] Update `app/lib/ingestion/ingest-album.ts`: add `tracks: RawTrackData[]` to
      `IngestedAlbum`, add `fetchTracks` to the `discography` pick in `IngestionProviders`, and call
      it inside the existing `Promise.all` (depends on T004, T005)
- [ ] T008 [US1] Update `app/lib/ingestion/album-context.ts`: add `persistTracks` to
      `AlbumContextDeps`; in `generateAllFacets`, persist `ingested.tracks` via `persistTracks` only
      when the existing tracks read is empty (mirroring the existing credits pattern; research.md
      §4), running each new `persist*` step (this one and the ones added in later phases)
      independently (e.g., via `Promise.allSettled` or individual try/catch) so one failing does not
      reject the others or the existing narrative-facet generation (research.md §5; FR-012); return
      the resulting tracks in `GenerateAllFacetsResult`; update `assembleAlbumContext` to use that
      returned value for `body.tracks` instead of the stale upfront `findTracks` read (depends on
      T006, T007)

**Checkpoint**: User Story 1 is independently functional — opening any album for the first time now
shows its real tracklist, and this can be demoed/deployed on its own.

---

## Phase 4: User Story 2 - See performance data that was actually found (Priority: P2)

**Goal**: Stop discarding the performance records `ingestAlbum` already fetches — persist and show
them.

**Independent Test**: Open an album whose sources return at least one performance record and verify
it appears (and remains on reload, served from storage); open one with none and verify the existing
"não disponível" message is unchanged.

**Depends on**: Phase 3 (T008 establishes the shared persist/isolation pattern in
`album-context.ts` that this phase extends — same file, sequential).

### Tests for User Story 2

- [ ] T009 [P] [US2] Update `app/lib/ingestion/album-context.test.ts` to cover: a first view of an
      album whose `ingestAlbum` result includes performance records persists them via a new
      `persistPerformanceRecords` call and returns them in `body.performance`; a second view reuses
      stored records without re-persisting; an album with none keeps `body.performance` as `null`
      (spec.md US2 AC1-2)

### Implementation for User Story 2

- [ ] T010 [US2] Update `app/lib/ingestion/album-context.ts`: add `persistPerformanceRecords` to
      `AlbumContextDeps`; in `generateAllFacets`, persist `ingested.performanceRecords` only when
      the existing performance read is empty, isolated the same way as T008's tracks step; return
      the result in `GenerateAllFacetsResult`; update `assembleAlbumContext` to use it for
      `body.performance` instead of the stale upfront `findPerformanceRecords` read (depends on
      T008, T009)

**Checkpoint**: User Stories 1 AND 2 both work — tracks and performance data are now real and
independently verifiable.

---

## Phase 5: User Story 3 - Read grounded curiosities about an album (Priority: P3)

**Goal**: Synthesize curiosities from an album's already-gathered source material, subject to the
existing no-fabrication gate, and show them.

**Independent Test**: Open a well-documented album and verify at least one curiosity appears with a
traceable source; open an album with no qualifying source material and verify the existing empty
state is unchanged; reload and verify curiosities aren't regenerated.

**Depends on**: Phase 4 (extends the same shared file/pattern; independent of US2's *data*).

### Tests for User Story 3

- [ ] T011 [P] [US3] Create `app/lib/ai/curiosity-influence.test.ts` covering `synthesizeCuriosities`:
      given source excerpts containing a distinctive fact, returns a `GeneratedFactItem` with
      `sourceIds` pointing at the excerpt it came from; given no qualifying material, returns no
      items rather than inventing one; given a Groq client error, returns `generationFailed: true`
      (spec.md US3 AC1-2; contracts/internal-modules.md)
- [ ] T013 [P] [US3] Update `app/lib/ingestion/album-context.test.ts` to cover: a first view with a
      qualifying source fact synthesizes and persists a curiosity (validated via the existing
      `validateStatements` gate) attributable to its source; no qualifying fact leaves curiosities
      empty; a second view reuses stored curiosities without regenerating (spec.md US3 AC1-3)

### Implementation for User Story 3

- [ ] T012 [US3] Create `app/lib/ai/curiosity-influence.ts` with `synthesizeCuriosities`, following
      `narrative.ts`'s prompt-building/`extractJsonObject`-parsing pattern
      (contracts/internal-modules.md; research.md §2) (depends on T011)
- [ ] T014 [US3] Update `app/lib/ingestion/album-context.ts`: add `persistCuriosities` to
      `AlbumContextDeps`; in `generateAllFacets`, call `synthesizeCuriosities` over the same
      `sourceExcerpts` already built for narrative, run the results through the existing
      `validateStatements` gate, persist only validated items (`source_id = sourceIds[0]`) only when
      the existing curiosities read is empty, isolated the same way as T008/T010; return the result
      in `GenerateAllFacetsResult` and use it for `body.curiosities` (depends on T010, T012, T013)

**Checkpoint**: User Stories 1-3 all work — curiosities now appear when the sources support them.

---

## Phase 6: User Story 4 - See what an album influenced or was influenced by (Priority: P4)

**Goal**: Synthesize influence relationships the same grounded way as curiosities, viewable even
when the other side isn't yet in the catalog.

**Independent Test**: Open an album whose sources describe a concrete influence relationship and
verify it appears with its explanation; verify a relationship whose other side isn't in the catalog
still renders (no broken link); open an album with no such material and verify the existing empty
state is unchanged.

**Depends on**: Phase 5 (extends the same shared file/pattern and the same new AI module).

### Tests for User Story 4

- [ ] T015 [P] [US4] Update `app/lib/ai/curiosity-influence.test.ts` to cover `synthesizeInfluence`:
      same validated/empty/`generationFailed` behavior as `synthesizeCuriosities`, with
      influence-specific prompt framing that asks for the relationship's direction and the other
      side's name in the explanation text (spec.md US4 AC1, AC3; research.md §3)
- [ ] T017 [P] [US4] Update `app/lib/ingestion/album-context.test.ts` to cover: a qualifying
      relationship is synthesized, persisted with the current album on the correct side
      (`from_album_id` or `to_album_id` per research.md §3), and shown even when the named other
      side doesn't resolve to an existing artist/album (explanation text still present, target id
      left unset); no qualifying relationship leaves influence empty; a second view reuses stored
      influence without regenerating (spec.md US4 AC1-3)

### Implementation for User Story 4

- [ ] T016 [US4] Add `synthesizeInfluence` to `app/lib/ai/curiosity-influence.ts` (depends on T012,
      T015)
- [ ] T018 [US4] Update `app/lib/ingestion/album-context.ts`: add `persistInfluence` to
      `AlbumContextDeps`; in `generateAllFacets`, call `synthesizeInfluence`, validate via the
      existing gate, attempt to resolve the named other side against the existing artist/album
      repositories (filling `to_artist_id`/`to_album_id`/`from_artist_id`/`from_album_id` only on a
      confident match, per research.md §3), persist only when the existing influence read is empty,
      isolated the same way as the prior three steps; return the result in `GenerateAllFacetsResult`
      and use it for `body.influence` (depends on T014, T016, T017)

**Checkpoint**: All four user stories are independently functional and work together — tracks,
performance, curiosities, and influence are all real for every album going forward.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across the whole feature, per quickstart.md and the constitution.

- [X] T019 [P] Add or extend a test in `app/lib/ingestion/album-context.test.ts` asserting FR-012
      end-to-end: a Groq failure during curiosity/influence generation still leaves tracks,
      performance data, and narrative sections populated when those succeeded; a track-fetch
      failure still leaves narrative/curiosities/influence populated when those succeeded (spec.md
      Edge Cases; research.md §5) — depends on T008, T010, T014, T018
- [X] T020 [P] Run `npm run test:coverage` and confirm coverage has not regressed below 80%
      (constitution Principle V)
- [X] T021 Run `npm run lint` and confirm it passes with no errors (constitution Development
      Workflow)
- [X] T022 Walk through every scenario in `specs/006-complete-album-ingestion/quickstart.md`
      manually, including the independent-failure check (temporarily invalid `GROQ_API_KEY`), and
      confirm no scenario leaves a broken or endlessly-loading page

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Empty — no separately-blocking work (see note in that phase).
- **User Story 1 (Phase 3)**: Depends on Phase 1 only.
- **User Story 2 (Phase 4)**: Depends on Phase 3 — extends the same `AlbumContextDeps` interface,
  the same `generateAllFacets` function, and the same isolation pattern T008 establishes in
  `app/lib/ingestion/album-context.ts`. The *data* (performance records) is independent of tracks;
  the *file* is not.
- **User Story 3 (Phase 5)**: Depends on Phase 4, for the same shared-file reason.
- **User Story 4 (Phase 6)**: Depends on Phase 5, for the same shared-file reason, and reuses the
  `app/lib/ai/curiosity-influence.ts` module Phase 5 creates.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Parallel Opportunities

- T001 (Setup) has nothing else to run alongside it, but nothing blocks starting it immediately.
- Within Phase 3: T002 (type addition) unblocks T003 and T005, which can then be written in
  parallel (different test files: `discography-provider.test.ts` vs `ingest-album.test.ts`).
- Within Phase 5 and Phase 6: the `curiosity-influence.test.ts` tasks (T011, T015) can be written in
  parallel with the corresponding `album-context.test.ts` tasks (T013, T017), since they cover
  different files.
- T019 and T020 in Polish touch different concerns (a specific test vs. a full coverage run) and can
  run in parallel once T008/T010/T014/T018 are all done.
- True cross-story parallelism (different people on US1 vs US2 vs US3 vs US4 at the same time) is
  **not** practical here — every story's final implementation task edits the same
  `app/lib/ingestion/album-context.ts` function. If multiple people want to work simultaneously, split
  by *layer* instead: one person on the provider/AI-module tests+implementations (T002-T006, T011-
  T012, T015-T016), another integrating each into `album-context.ts` in priority order (T008, T010,
  T014, T018) once its prerequisites land.

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# After T002 (type addition) lands:
Task: "Update discography-provider.test.ts for fetchTracks (T003)"
Task: "Update ingest-album.test.ts for IngestedAlbum.tracks (T005)"

# Then, sequentially (each depends on the last, all in the same story):
Task: "Implement DiscographyProvider.fetchTracks (T004)"
Task: "Wire tracks into ingest-album.ts (T006)"
Task: "Update album-context.test.ts for track persistence (T007)"
Task: "Persist tracks in album-context.ts + establish isolation pattern (T008)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 3 (User Story 1 — real tracklists).
3. **STOP and VALIDATE**: open a not-yet-viewed album and confirm its tracklist renders and persists.
4. Deploy/demo if ready — this alone fixes the most visible gap reported by the user.

### Incremental Delivery

1. Phase 1 → Phase 3 (US1) → validate → deploy (MVP).
2. Add Phase 4 (US2 — performance data) → validate → deploy.
3. Add Phase 5 (US3 — curiosities) → validate → deploy.
4. Add Phase 6 (US4 — influence) → validate → deploy.
5. Phase 7 (Polish) once all four are in.

## Notes

- [P] tasks touch different files with no unresolved dependency at the time they're started.
- Every implementation task has a paired test task per the constitution's mandatory-coverage rule.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before moving on.
