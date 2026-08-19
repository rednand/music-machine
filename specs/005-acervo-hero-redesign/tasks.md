---

description: "Task list for Discover Page Hero & Spotlight Restyle"
---

# Tasks: Discover Page Hero & Spotlight Restyle

**Input**: Design documents from `/specs/005-acervo-hero-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/component-props.md, quickstart.md

**Tests**: Included and REQUIRED — the project constitution (Principle V, NON-NEGOTIABLE) mandates a
co-located test for every modified component and forbids coverage regressing below 80%. All test
files already exist for the components this feature touches; tasks below extend them.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repository root

## Path Conventions

Single existing Next.js App Router project (plan.md Project Structure) — no new project/package:

- `app/(public)/page.tsx`, `app/(public)/page.test.tsx`
- `components/FeaturedAlbumCard.tsx`, `components/FeaturedAlbumCard.test.tsx`
- `components/CollectionList.tsx`, `components/CollectionList.test.tsx`

## Phase 1: Setup

**Purpose**: No new dependencies, tooling, or scaffolding are required (plan.md Technical Context —
this feature reuses the existing stack, components, and data). Setup is limited to confirming the
current shape of the three files this feature touches, using the project's mandated code-navigation
tool.

- [X] T001 [P] Use Serena MCP tools (constitution Principle VI) to review the current symbols and
      structure of `app/(public)/page.tsx`, `components/FeaturedAlbumCard.tsx`, and
      `components/CollectionList.tsx` before making any edit, confirming they still match the
      shapes described in plan.md/data-model.md/contracts/component-props.md.

**Checkpoint**: No code changes in this phase — proceed once current file shapes are confirmed.

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by multiple user stories.

None. This feature introduces no new entity, service, Server Action, or shared infrastructure
(data-model.md) — `DiscoveryPageEntry` and `buildDiscoveryPage()` are already in place and require
no change. Each user story below depends only on Phase 1 and, where noted, on an earlier user
story's edits to a shared file.

**Checkpoint**: Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - A bolder, more editorial hero on first load (Priority: P1) 🎯 MVP

**Goal**: Replace the current single-sentence `<h1>` with a two-line display title (accent-colored
second line) plus an italic tagline, keeping the eyebrow label, description paragraph, and
`SearchForm` unchanged.

**Independent Test**: Load `/` and verify the two-line title (with accent second line) and italic
tagline render above the unchanged description and search bar; verify a search submission still
navigates exactly as before; verify the title/tagline stay readable at a mobile viewport width.

### Tests for User Story 1

- [X] T002 [US1] Update `app/(public)/page.test.tsx` to assert: the headline renders two visually
      distinct lines (first line default color, second line using the accent color class/style),
      an italic tagline element is present immediately after the headline, and the existing
      description paragraph and `SearchForm` still render unchanged (spec.md US1 Acceptance
      Scenarios 1-2; research.md §1)

### Implementation for User Story 1

- [X] T003 [US1] In `app/(public)/page.tsx`, replace the current `<h1>` content ("Escolha um ano e
      viaje no tempo pela música.") with the two-line display title structure (neutral first line +
      accent-colored second line via a nested `<span>`, per research.md §1) followed by a separate
      italic tagline element — leave the eyebrow label div, the description `<p>`, and
      `<SearchForm />` untouched (FR-001, FR-002)

**Checkpoint**: User Story 1 is independently functional — the hero reads as a two-line title with
tagline, search still works, and this can be demoed/deployed on its own.

---

## Phase 4: User Story 2 - Featured albums shown as a stacked card visual (Priority: P2)

**Goal**: Replace the flat 2×2 grid of `FeaturedAlbumCard`s with an overlapping, tilted card stack
(artist name + release year printed on each card) and remove the album-count/artist-count badges.

**Independent Test**: Load `/` with a non-empty catalog and verify the featured albums render as an
overlapping, tilted stack with artist/year visible on each card, each card still opening its
album's page; verify the count badges are gone; verify the stack degrades cleanly with fewer than 4
albums (including exactly one).

**Depends on**: Phase 3 (T003 edits `app/(public)/page.tsx`'s hero block; this phase edits the
featured-stack block of the same file — sequential, not parallel, to avoid merge conflicts on one
file).

### Tests for User Story 2

- [X] T004 [P] [US2] Update `components/FeaturedAlbumCard.test.tsx` to cover the new `index`/`total`
      props: artist name and release year render as an overlay inside the card (not below it), the
      card's tilt/offset/z-index reflects its `index` deterministically, and the existing
      `Link` to `/albums/[albumId]` and cover-image/placeholder rendering are unchanged (contracts/
      component-props.md; FR-003, FR-004)

### Implementation for User Story 2

- [X] T005 [P] [US2] Update `components/FeaturedAlbumCard.tsx` to accept `index: number` and
      `total: number` props (contracts/component-props.md), move the artist-name/release-year
      markup into an overlay positioned inside the card, and derive a per-`index` rotation/offset/
      z-index (research.md §2) so cards visually overlap and tilt when rendered as a stack
- [X] T006 [US2] In `app/(public)/page.tsx`, update the featured-albums block: pass `index` (map
      position) and `total` (`covers.length`) to each `<FeaturedAlbumCard>` in the existing
      `covers` map, and delete the album-count/artist-count badge `<div>` beneath it, with no
      replacement element (FR-003, FR-005, FR-006; depends on T005 for the new prop contract)
- [X] T007 [US2] Update `app/(public)/page.test.tsx` to assert the featured stack renders up to 4
      `FeaturedAlbumCard`s with correct `index`/`total` wiring, that it degrades to fewer cards
      (including exactly one) when the catalog has fewer albums, and that the album-count/artist-
      count badges no longer render (spec.md US2 Acceptance Scenarios 1, 3, 4; depends on T003's
      prior edits to this same test file)

**Checkpoint**: User Stories 1 AND 2 both work independently — hero title, tagline, and the
tilted/overlapping featured card stack (no count badges) are all live.

---

## Phase 5: User Story 3 - A short collection preview with a link to see everything (Priority: P3)

**Goal**: Show only the first 2 entries of "O acervo" by default, with a "ver o acervo inteiro"
action that reveals the rest of the already-fetched collection in place.

**Independent Test**: Load `/` with more than 2 albums and verify only 2 entries show under "O
acervo" plus a "ver o acervo inteiro" action; activating it reveals every remaining album; with 2
or fewer albums, every album shows and no such action appears; with zero albums, the existing empty
state is unaffected.

**Depends on**: Phase 1 only — `components/CollectionList.tsx` is not touched by Phases 3-4, and
`app/(public)/page.tsx` already passes the full `result.collection` to `<CollectionList>` unchanged
(contracts/component-props.md), so this story can be implemented independently of, and in parallel
with, Phases 3-4.

### Tests for User Story 3

- [X] T008 [P] [US3] Update `components/CollectionList.test.tsx` to cover the new `previewCount`
      prop (default 2): with more entries than `previewCount`, only the first `previewCount` render
      plus a "ver o acervo inteiro" action; activating that action reveals the remaining entries;
      with entries at or below `previewCount`, every entry renders and no action appears; the
      existing empty-entries-returns-null behavior is unchanged (spec.md US3 Acceptance Scenarios
      1-4; contracts/component-props.md)

### Implementation for User Story 3

- [X] T009 [P] [US3] Convert `components/CollectionList.tsx` to a Client Component
      (`"use client"`), add an optional `previewCount` prop (default `2`, research.md §3) and an
      `isExpanded` boolean state (`useState`, default `false`); when `entries.length >
      previewCount` and not expanded, render only the first `previewCount` entries followed by a
      "ver o acervo inteiro" button/link that sets `isExpanded` to `true`; leave the existing
      per-entry markup (thumbnail, year · artist, title, hook) unchanged (FR-007, FR-008, FR-009)

**Checkpoint**: All three user stories are independently functional — hero restyle, featured card
stack, and collection preview all work together on the Discover page.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across the whole feature, per quickstart.md and the constitution.

- [X] T010 Run `npm run test:coverage` and confirm coverage has not regressed below 80%
      (constitution Principle V)
- [X] T011 Run `npm run lint` and confirm it passes with no errors (constitution Development
      Workflow)
- [X] T012 Walk through every scenario in `specs/005-acervo-hero-redesign/quickstart.md` manually
      (catalog sizes: zero, one, a few, many albums; mobile viewport width) and confirm no broken,
      empty, or overlapping content per spec.md's Edge Cases and SC-004
- [X] T013 [P] If the featured-stack JSX added to `app/(public)/page.tsx` in T006 is complex enough
      to clutter the page, extract it into a new `components/FeaturedAlbumStack.tsx` (+ co-located
      `FeaturedAlbumStack.test.tsx`) per plan.md's optional Project Structure entry — skip this
      task if the inline version already reads cleanly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Empty — no blocking work.
- **User Story 1 (Phase 3)**: Depends on Phase 1 only.
- **User Story 2 (Phase 4)**: Depends on Phase 1; edits to `app/(public)/page.tsx` and
  `app/(public)/page.test.tsx` must happen after Phase 3's edits to those same files (sequential on
  those two files only — `FeaturedAlbumCard.tsx`/`.test.tsx` edits are independent).
- **User Story 3 (Phase 5)**: Depends on Phase 1 only — fully independent of Phases 3-4 (different
  files); may be implemented in parallel with them.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Parallel Opportunities

- T001 (Setup) has no dependents blocking it from running alongside early planning.
- Phase 5 (US3, `CollectionList.*`) can run entirely in parallel with Phases 3-4 (US1/US2, which
  both touch `page.tsx`/`page.test.tsx`).
- Within Phase 4: T004/T005 (`FeaturedAlbumCard.*`) can run in parallel with each other and with
  Phase 5's T008/T009; T006/T007 (`page.tsx`/`page.test.tsx`) must wait for T005 and for Phase 3.
- T013 (optional extraction) can run in parallel with T010-T012.

---

## Parallel Example: Phases 4 & 5 together (after Phase 3 completes)

```bash
# Featured-card component work (US2) and collection-preview work (US3) touch disjoint files:
Task: "Update components/FeaturedAlbumCard.test.tsx for index/total overlay (T004)"
Task: "Update components/FeaturedAlbumCard.tsx to accept index/total (T005)"
Task: "Update components/CollectionList.test.tsx for previewCount (T008)"
Task: "Convert components/CollectionList.tsx to a Client Component with previewCount (T009)"

# Only after T005 lands:
Task: "Update app/(public)/page.tsx featured block + remove badges (T006)"
Task: "Update app/(public)/page.test.tsx for the featured stack (T007)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 3 (User Story 1 — hero title/tagline restyle).
3. **STOP and VALIDATE**: confirm the new hero renders correctly and search still works.
4. Demo/deploy if ready — this alone already matches the reference's most visible change.

### Incremental Delivery

1. Phase 1 → Phase 3 (US1) → validate → deploy (MVP).
2. Add Phase 4 (US2 — featured card stack + badge removal) → validate → deploy.
3. Add Phase 5 (US3 — collection preview), independently or in parallel with step 2 → validate →
   deploy.
4. Phase 6 (Polish) once all three stories are in.

## Notes

- [P] tasks touch different files with no unresolved dependency.
- Every implementation task has a paired test task per the constitution's mandatory-coverage rule.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before moving on.
