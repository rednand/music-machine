---

description: "Task list template for feature implementation"
---

# Tasks: Search & Context Refinements for MVP

**Input**: Design documents from `/specs/004-search-and-context-refinements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md,
quickstart.md

**Tests**: Required by constitution Principle V (Test-First & Mandatory Coverage,
NON-NEGOTIABLE) — every task below ships with a co-located test.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup

**Not applicable** — no new dependency, environment variable, migration, or tooling change
(plan.md Technical Context). The existing toolchain is reused as-is.

## Phase 2: Foundational

**Not applicable** — no single prerequisite blocks all four stories simultaneously (plan.md).
Real file-level coupling exists only *between specific stories* (US1↔US2 on `SearchForm.tsx`;
US2↔US4 on `album-context.ts`/the album page) — called out explicitly in Dependencies below rather
than forced into an artificial shared phase.

---

## Phase 3: User Story 1 - Search results never pollute the catalog before they're chosen (Priority: P1) 🎯 MVP

**Goal**: Search shows local matches plus live, unsaved external candidates; only the exact item
a user selects is ever persisted, re-derived server-side rather than trusted from the client.

**Independent Test**: Search for something new, confirm candidates appear without any being
saved, then select exactly one and confirm only that one persists — per quickstart.md Scenario 1.

### Tests for User Story 1 ⚠️

- [X] T001 [P] [US1] Test for `ingestSingleCandidate` (dedupe-by-slug, required-fields check,
  replacing the old loop-based `ingestSearchResults`) in
  `app/lib/ingestion/search-fallback.test.ts`
- [X] T002 [US1] Test for `searchCatalog` returning discriminated `known`/`candidate` results
  and never persisting a `candidate` as a side effect, in `app/actions/search.test.ts`
- [X] T003 [US1] Test for `resolveSearchCandidate` — re-derives via a fresh `searchByText(query)`
  call matched by `externalId` (never trusts client-supplied fields), dedupes against an existing
  slug, and returns a typed error when the provider no longer confirms the candidate — in
  `app/actions/search.test.ts`
- [X] T004 [P] [US1] Component test for `SearchForm`'s candidate click-to-save flow (waiting
  state while resolving, navigation on success, visible failure message on error) in
  `components/SearchForm.test.tsx`

### Implementation for User Story 1

- [X] T005 [US1] Replace `ingestSearchResults` with `ingestSingleCandidate` in
  `app/lib/ingestion/search-fallback.ts`, keeping the existing `slugify`/`resolveArtist` helpers
  (depends on T001)
- [X] T006 [US1] Update `searchCatalog` in `app/actions/search.ts` to return the discriminated
  `SearchResultItem` union (`known` | `candidate`) with no persistence side effect (depends on
  T002)
- [X] T007 [US1] Implement `resolveSearchCandidate(query, externalId)` in `app/actions/search.ts`
  per contracts/server-actions.md (depends on T005, T003)
- [X] T008 [US1] Update `SearchForm.tsx`: render `candidate` results as a button that calls
  `resolveSearchCandidate`, shows a waiting state, then navigates to `/albums/[albumId]` on
  success or a failure message on error (depends on T007, T004)

**Checkpoint**: User Story 1 is fully functional and independently testable — the catalog is
never polluted by unselected search results.

---

## Phase 4: User Story 2 - Search by song, not just by album (Priority: P2)

**Goal**: A mode selector next to the search input lets users search songs; results open the
song's album context page with the track highlighted, which requires rendering a track list on
the album page for the first time.

**Independent Test**: Switch to "música" mode, search a known song title, select a result, and
verify the album page opens with that track highlighted — per quickstart.md Scenario 2.

**Note**: T012 modifies `SearchForm.tsx`, the same file US1's T008 modifies — implement after
User Story 1 lands, not in parallel with it, even though the stories are otherwise independent.

### Tests for User Story 2 ⚠️

- [X] T009 [P] [US2] Test for `findTracksByAlbumId` (ordered by track number) and
  `findTracksByTitle` (case-insensitive match) in `app/lib/db/album.test.ts`
- [X] T010 [US2] Test for `searchSongs`, including the no-match case, in
  `app/actions/song-search.test.ts`
- [X] T011 [P] [US2] Component test for `TrackList` — renders tracks, highlights the one matching
  a given track id, omits nothing when the highlighted id doesn't match any track — in
  `components/TrackList.test.tsx`
- [X] T012 [P] [US2] Component test for `SearchForm`'s album/música mode selector, including
  branching to song search, in `components/SearchForm.test.tsx`
- [X] T013 [US2] Test extending `assembleAlbumContext` to include `tracks` (`[]` when none known)
  in `app/lib/ingestion/album-context.test.ts`, and `getAlbumContext` wiring in
  `app/actions/album-context.test.ts`
- [X] T014 [US2] Component test for the album page rendering `TrackList` and highlighting the
  track from a `?track=` query param, in `app/(public)/albums/[albumId]/page.test.tsx`

### Implementation for User Story 2

- [X] T015 [US2] Implement `findTracksByAlbumId`/`findTracksByTitle` in `app/lib/db/album.ts`
  (depends on T009)
- [X] T016 [US2] Implement `searchSongs` in `app/actions/song-search.ts` (depends on T015, T010)
- [X] T017 [P] [US2] Implement the `TrackList` component in `components/TrackList.tsx` (depends
  on T011)
- [X] T018 [US2] Add the album/música mode selector and song-search branch to `SearchForm.tsx`
  (depends on T008, T016, T012)
- [X] T019 [US2] Extend `AlbumContextDeps`/`AlbumContextBody` with `tracks` in
  `app/lib/ingestion/album-context.ts`; wire `findTracksByAlbumId` in
  `app/actions/album-context.ts` (depends on T015, T013)
- [X] T020 [US2] Render `TrackList` and read the `?track=` search param in
  `app/(public)/albums/[albumId]/page.tsx` (depends on T019, T017, T014)

**Checkpoint**: User Stories 1 and 2 both work independently. Song search works end to end.

---

## Phase 5: User Story 3 - The "world at the time" narrative covers more than politics and technology (Priority: P3)

**Goal**: Broaden the `world_context` facet's guidance to also cover popular culture and
contemporary social trends, using only already-gathered source material.

**Independent Test**: Open a well-documented album's page and verify its "o mundo na época"
section includes a sourced pop-culture statement, not only political/technological framing — per
quickstart.md Scenario 3.

### Tests for User Story 3 ⚠️

- [X] T021 [P] [US3] Test asserting the `world_context` prompt explicitly requests
  popular-culture/contemporary-trend content, in `app/lib/ai/narrative.test.ts`

### Implementation for User Story 3

- [X] T022 [US3] Broaden `FACET_FOCUS.world_context` in `app/lib/ai/narrative.ts` (depends on
  T021)

**Checkpoint**: User Stories 1–3 all work independently.

---

## Phase 6: User Story 4 - An artist's other work lives inside the album context, not a separate page (Priority: P4)

**Goal**: Remove the standalone "Linhas" timeline destination and its pages; show the artist's
other known albums inline on the album context page instead, reusing 003's existing
`findAlbumsByArtistId`.

**Independent Test**: Open an album's page for an artist with two or more albums and verify the
inline "other albums" section renders correctly and the top navigation no longer has a "Linhas"
entry — per quickstart.md Scenario 4.

**Note**: T031/T032 modify the same `album-context.ts`/album-page files as User Story 2 — implement
after User Story 2 lands, not in parallel with it.

### Tests for User Story 4 ⚠️

- [X] T023 [P] [US4] Update `AppShell.test.tsx` to assert only Descobrir and Eras remain (no
  Linhas entry)
- [X] T024 [P] [US4] Update `Header.test.tsx`, removing the now-obsolete timeline-link assertion
- [X] T025 [P] [US4] Component test for `OtherAlbumsByArtist` — renders the list in chronological
  order, renders nothing when empty — in `components/OtherAlbumsByArtist.test.tsx`
- [X] T026 [US4] Test extending `assembleAlbumContext` to include `otherAlbumsByArtist` (excludes
  the current album, `[]` when the artist has no others) in
  `app/lib/ingestion/album-context.test.ts`
- [X] T027 [US4] Component test for the album page rendering `OtherAlbumsByArtist`, in
  `app/(public)/albums/[albumId]/page.test.tsx`

### Implementation for User Story 4

- [X] T028 [P] [US4] Remove the "Linhas" nav item from `components/AppShell.tsx` (depends on
  T023)
- [X] T029 [P] [US4] Remove the "ver linha do tempo do artista" link from `components/Header.tsx`
  (depends on T024)
- [X] T030 [P] [US4] Implement the `OtherAlbumsByArtist` component in
  `components/OtherAlbumsByArtist.tsx` (depends on T025)
- [X] T031 [US4] Extend `AlbumContextDeps`/`AlbumContextBody` with `otherAlbumsByArtist`, wiring
  the existing `findAlbumsByArtistId` in `app/lib/ingestion/album-context.ts` and
  `app/actions/album-context.ts` (depends on T019, T026)
- [X] T032 [US4] Render `OtherAlbumsByArtist` on `app/(public)/albums/[albumId]/page.tsx`
  (depends on T031, T030, T027)
- [X] T033 [US4] Delete `app/(public)/artists/page.tsx` (+ test),
  `app/(public)/artists/[artistId]/page.tsx` (+ test), `app/actions/artist-timeline.ts` (+ test),
  and `components/ArtistTimeline.tsx` (+ test) — nothing else references them once T028–T032 land
  (depends on T032)

**Checkpoint**: All four user stories are independently functional; the "Linhas" destination and
its pages are fully removed.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation that spans all four user stories

- [X] T034 [P] Run quickstart.md Scenarios 1–4 end-to-end against a real Supabase project and
  provider credentials, and record results
- [X] T035 Review `resolveSearchCandidate` against research.md §1's rule (only `query`/`externalId`
  accepted; all other fields re-derived server-side) — confirm no client-supplied catalog field
  is ever trusted for the write
- [X] T036 [P] Run the full test suite and `tsc --noEmit`; confirm no orphaned import references
  the deleted `artist-timeline.ts`/`ArtistTimeline.tsx`/`/artists` pages
- [X] T037 Code cleanup and refactor pass across all files touched by this feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational (Phases 1–2)**: N/A — nothing to do
- **User Story 1 (Phase 3)**: No dependencies — start immediately
- **User Story 2 (Phase 4)**: Independent in principle, but T012/T018 touch `SearchForm.tsx`
  alongside User Story 1's T004/T008 — implement after Phase 3 lands
- **User Story 3 (Phase 5)**: Fully independent — touches only `app/lib/ai/narrative.ts`; can be
  done at any point, in parallel with any other phase
- **User Story 4 (Phase 6)**: Independent in principle, but T026/T031/T032 touch
  `album-context.ts`/the album page alongside User Story 2's T013/T019/T020 — implement after
  Phase 4 lands
- **Polish (Phase 7)**: Depends on all desired user story phases being complete

### Within Each User Story

- Tests are written first and confirmed to fail before their matching implementation task
- Data-access/pure-logic changes before the Server Action that wires them; Server Actions before
  page/component wiring
- Story is complete and independently testable before moving to the next priority

### Parallel Opportunities

- User Story 3 (Phase 5) can run in parallel with any other phase — it touches no shared file
- All [P] tests within a story can run together
- T028/T029/T030 (US4) touch three different files and can run together

---

## Parallel Example: User Story 3 (fully independent of the others)

```bash
Task: "Test the broadened world_context prompt in app/lib/ai/narrative.test.ts"
Task: "Broaden FACET_FOCUS.world_context in app/lib/ai/narrative.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1
2. **STOP and VALIDATE**: quickstart.md Scenario 1 against a real catalog — confirm zero
   unselected candidates are ever saved
3. Deploy/demo if ready

### Incremental Delivery

1. User Story 1 → validate independently → deploy/demo (MVP: no more catalog pollution)
2. User Story 2 → validate independently → deploy/demo (song search works)
3. User Story 3 → validate independently → deploy/demo (richer world-context) — can slot in
   anytime, even before US2, since it has zero file overlap with anything else
4. User Story 4 → validate independently → deploy/demo (Linhas removed, inlined)
5. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- This feature deletes files as part of its own scope (US4) — deletions are tasks like any other,
  not an afterthought, and their tests are removed in the same task so nothing is left orphaned
