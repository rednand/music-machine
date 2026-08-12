---

description: "Task list template for feature implementation"
---

# Tasks: Editorial Discovery Page & Artist Timelines

**Input**: Design documents from `/specs/003-discovery-page-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md,
quickstart.md

**Tests**: Required by constitution Principle V (Test-First & Mandatory Coverage,
NON-NEGOTIABLE) — every task below ships with a co-located test.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup

**Not applicable** — this feature introduces no new dependency, environment variable, migration,
or tooling change (plan.md Technical Context, research.md). The existing 002 toolchain (Next.js,
Vitest, Supabase, shadcn/ui) is reused as-is.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure both user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Update the top navigation to exactly Descobrir (`/`) / Eras (`/years`) / Linhas
  (`/artists`) in `components/AppShell.tsx` (+ update `components/AppShell.test.tsx`)
- [X] T002 [P] Expose `created_at` on `AlbumRow`, and add `findAlbumsOrderedByCreatedAt`,
  `findAlbumsByArtistId`, and `findAllArtists` to `app/lib/db/album.ts` (+ tests in
  `app/lib/db/album.test.ts`) — ordering per research.md §2 (`created_at` desc, `title` asc
  tiebreaker)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Land on an editorial Discover page (Priority: P1) 🎯 MVP

**Goal**: Replace the bare search box with an editorial Discover page: headline, subheading,
search bar, one auto-selected featured album, and a collection list — each entry carrying a
one-line hook reused verbatim from that album's own published narrative.

**Independent Test**: Load the Discover page against a catalog with zero, one, and many albums
and verify the spotlight/collection/empty-state render correctly per quickstart.md Scenarios 1–3;
verify search still works; verify hooks are omitted (not fabricated) for albums with no published
narrative yet.

### Tests for User Story 1 ⚠️

- [X] T003 [P] [US1] Test for the hook-derivation rule (facet preference order; `null` when no
  facet has a published statement) in `app/lib/discovery/hook.test.ts`
- [X] T004 [P] [US1] Test for the collection aggregation — featured pick, full ordering, the
  zero-album and single-album edge cases — in `app/lib/discovery/collection.test.ts`
- [X] T005 [US1] Test for the `getDiscoveryPage` Server Action in `app/actions/discovery.test.ts`
- [X] T006 [P] [US1] Component test for `FeaturedAlbumCard` in
  `components/FeaturedAlbumCard.test.tsx`
- [X] T007 [P] [US1] Component test for `CollectionList`, including the hook-omitted case, in
  `components/CollectionList.test.tsx`
- [X] T008 [P] [US1] Component test for the redesigned Discover page — empty/single/many-album
  states, search still working, each entry linking to `/albums/[albumId]` (FR-006) — in
  `app/(public)/page.test.tsx`
- [X] T008b [P] [US1] Component test for the extracted `SearchForm` client component in
  `components/SearchForm.test.tsx`

### Implementation for User Story 1

- [X] T009 [P] [US1] Implement hook derivation in `app/lib/discovery/hook.ts` (depends on T003)
- [X] T010 [US1] Implement the collection aggregation (featured + ordered list) in
  `app/lib/discovery/collection.ts` (depends on T002, T009, T004)
- [X] T011 [US1] Implement the `getDiscoveryPage` Server Action in `app/actions/discovery.ts`
  (depends on T010, T005)
- [X] T012 [P] [US1] Implement the `FeaturedAlbumCard` component (links to `/albums/[albumId]`,
  FR-006) in `components/FeaturedAlbumCard.tsx` (depends on T006)
- [X] T013 [P] [US1] Implement the `CollectionList` component (each entry links to
  `/albums/[albumId]`, FR-006) in `components/CollectionList.tsx` (depends on T007)
- [X] T013b [P] [US1] Implement the `SearchForm` client component (extracted interactive search
  bar + `searchCatalog` call) in `components/SearchForm.tsx` (depends on T008b) — per plan.md's
  architecture note resolving /speckit-analyze finding U1
- [X] T014 [US1] Rewrite `app/(public)/page.tsx` as an `async` Server Component: contextual
  label/headline/subheading, `SearchForm`, `FeaturedAlbumCard`, `CollectionList`, and the
  empty-state (FR-009), fetching `getDiscoveryPage()` server-side (depends on T011, T012, T013,
  T013b, T008)

**Checkpoint**: The Discover page is fully functional and independently testable. The "Linhas"
nav link exists (T001) but resolves to a 404 until User Story 2 lands — acceptable for an MVP-only
deploy of this story, per plan.md's incremental-delivery approach. Note: "Eras" (`/years`) already
404s today independently of this feature, since 002's own year-explorer user story (US3) was never
implemented — this feature only renames its nav label, it does not introduce that gap.

---

## Phase 4: User Story 2 - Follow an artist's career as a timeline (Priority: P2)

**Goal**: A visitor can open any artist's timeline (their known albums in chronological order)
from the "Linhas" nav destination or from any of that artist's album pages.

**Independent Test**: Open the timeline for an artist with two-plus albums and one with exactly
one album, and verify both render correctly per quickstart.md Scenario 4; verify the artist picker
at `/artists` lists known artists; verify an album page links to its artist's timeline.

### Tests for User Story 2 ⚠️

- [X] T015 [P] [US2] Test for `getArtistTimeline` (chronological order, `not_found`, single-album
  artist) and `listArtistsForPicker` in `app/actions/artist-timeline.test.ts`
- [X] T016 [P] [US2] Component test for `ArtistTimeline`, including the single-entry case and
  that each album entry links to `/albums/[albumId]` (FR-012), in
  `components/ArtistTimeline.test.tsx`
- [X] T017 [P] [US2] Component test for the artist picker page, including the zero-artist empty
  state, in `app/(public)/artists/page.test.tsx`
- [X] T018 [P] [US2] Component test for the artist timeline page, including `not_found`, in
  `app/(public)/artists/[artistId]/page.test.tsx`

### Implementation for User Story 2

- [X] T019 [US2] Implement `getArtistTimeline` and `listArtistsForPicker` in
  `app/actions/artist-timeline.ts` (depends on T002, T015)
- [X] T020 [P] [US2] Implement the `ArtistTimeline` component in `components/ArtistTimeline.tsx`
  (depends on T016)
- [X] T021 [US2] Implement the artist picker page in `app/(public)/artists/page.tsx` (depends on
  T019, T017)
- [X] T022 [US2] Implement the artist timeline page in `app/(public)/artists/[artistId]/page.tsx`,
  resolving the pre-existing dangling `/artists/[id]` link from search results (depends on T019,
  T020, T018)
- [X] T023 [US2] Add a link to the artist's timeline on `app/(public)/albums/[albumId]/page.tsx`
  (+ update `app/(public)/albums/[albumId]/page.test.tsx`) (depends on T022)

**Checkpoint**: User Stories 1 and 2 both work independently; the "Linhas" nav link and the
pre-existing dangling search-result artist link now both resolve correctly.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation that spans both user stories

- [X] T024 [P] Run quickstart.md Scenarios 1–5 end-to-end against a real Supabase project with a
  mix of published, pending, and never-generated albums, and record results
- [X] T025 [P] Verify the Performance Goals from plan.md (Discover page ≤ 800ms p95, artist
  timeline ≤ 500ms p95) with the catalog size available
- [X] T026 Confirm neither new Server Action makes a Groq call (quickstart.md's quality gate;
  research.md §1) — verify via the test doubles used in T005/T015 rather than a live call count
- [ ] T027 [P] Add a responsive-layout check (desktop/tablet/mobile) for the Discover, artist
  picker, and artist timeline pages, per constitution's existing FR-023-style baseline
- [ ] T028 Code cleanup and refactor pass across `app/lib/discovery/`, `app/actions/discovery.ts`,
  and `app/actions/artist-timeline.ts`
- [ ] T029 Run a moderated usability check of the Discover page against SC-001 (90% of
  first-time visitors correctly describe what to do next within 10 seconds) and record results —
  **requires human participants; cannot be executed by an implementation agent**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: N/A — nothing to do
- **Foundational (Phase 2)**: No dependencies — start immediately; BLOCKS both user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (T002's `findAlbumsOrderedByCreatedAt`) only
- **User Story 2 (Phase 4)**: Depends on Foundational (T002's `findAlbumsByArtistId`/
  `findAllArtists`) only — does not depend on User Story 1's own tasks, though T023 edits a file
  User Story 1 does not touch (`albums/[albumId]/page.tsx`), so the two stories never conflict on
  the same file
- **Polish (Phase 5)**: Depends on both desired user story phases being complete

### Within Each User Story

- Tests are written first and confirmed to fail before their matching implementation task
- Pure aggregation/derivation logic (`hook.ts`, `collection.ts`) before the Server Action that
  wires it to real repositories; Server Actions before page/component wiring
- Story is complete and independently testable before moving to the next priority

### Parallel Opportunities

- T001 and T002 (Foundational) touch different files and can run together
- All [P] tests within a story can run together
- T009/T012/T013 (US1) and T020 (US2) touch different files each and can run in parallel with
  their own story's other [P] tasks

---

## Parallel Example: Foundational phase

```bash
Task: "Update the top navigation in components/AppShell.tsx"
Task: "Extend app/lib/db/album.ts with created_at, findAlbumsOrderedByCreatedAt, findAlbumsByArtistId, findAllArtists"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: quickstart.md Scenarios 1–3 against a real catalog
4. Deploy/demo if ready (the "Linhas" nav link will 404 until User Story 2 lands — acceptable for
   this MVP checkpoint)

### Incremental Delivery

1. Foundational → foundation ready
2. Add User Story 1 → validate independently → deploy/demo (MVP)
3. Add User Story 2 → validate independently → deploy/demo (both nav links now resolve)
4. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
