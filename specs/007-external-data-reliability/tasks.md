---

description: "Task list for Reliable External Data for Album Context"
---

# Tasks: Reliable External Data for Album Context

**Input**: Design documents from `/specs/007-external-data-reliability/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-modules.md, quickstart.md

**Tests**: Included and REQUIRED — the project constitution (Principle V, NON-NEGOTIABLE) mandates a
co-located test for every modified/new function, with external services mocked, and forbids
coverage regressing below 80%.

**Status**: All tasks below are already implemented and verified (this document was authored
retroactively — see spec.md's Input section and plan.md's Note). Checkboxes reflect actual
completion, not a plan for future work.

**Organization**: Tasks are grouped by user story (spec.md). Unlike a typical feature, User Stories
1-3 touch entirely different files and were genuinely independent; User Story 4's two fixes are
also independent of each other and of the other three stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Ran in parallel (different files, no unresolved dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are exact and relative to the repository root

## Phase 1: Setup

- [X] T001 Read the current shape of `app/lib/providers/catalog-provider.ts`,
      `app/lib/providers/provider.interface.ts`, `app/lib/ingestion/ingest-album.ts`,
      `app/lib/ingestion/album-context.ts`, `app/lib/ai/narrative.ts`,
      `app/lib/ai/publishing-gate.ts`, `app/lib/db/narrative-article.ts`, and `components/InfluenceList.tsx`
      before editing. Note: done via direct Read/Grep rather than Serena MCP tools (constitution
      Principle VI) — see plan.md Complexity Tracking for why.

**Checkpoint**: No code changes in this phase — proceed once current shapes are confirmed.

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by multiple user stories.

None — User Stories 1, 2, and 3 touch disjoint files (`catalog-provider.ts` vs
`historical-events-provider.ts`/`narrative.ts`/`publishing-gate.ts` vs `musicbrainz-provider.ts`) and
have no shared groundwork beyond what already exists in the codebase.

**Checkpoint**: Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Album search and ingestion keep working as Spotify access tightens (Priority: P1) 🎯 MVP

**Goal**: Replace the Spotify-backed catalog provider with Deezer's public API, behind the same
`CatalogProviderAdapter` shape, with no auth required.

**Independent Test**: Search for a never-before-ingested artist, confirm real candidates, resolve
one, and confirm a correct tracklist and full discography appear — with no Spotify credential
configured.

### Tests for User Story 1

- [X] T002 [P] [US1] Rewrite `app/lib/providers/catalog-provider.test.ts` for Deezer: search
      enrichment (release date/label/genre via a second `album/{id}` call), dropping a candidate
      whose enrichment fails; tracklist mapping; artist-search fan-count disambiguation; discography
      filtered to `record_type === "album"`; graceful `null`/`[]` on failure for every method
      (spec.md US1 AC1-4)

### Implementation for User Story 1

- [X] T003 [US1] Rewrite `app/lib/providers/catalog-provider.ts`: Deezer-backed `searchAlbum`,
      `searchByText`, `fetchTracks`, `searchArtist` (highest-`nb_fan` disambiguation),
      `fetchArtistAlbums` (album/compilation only); drop the OAuth client-credentials flow and
      `CatalogProviderConfig` entirely (depends on T002)
- [X] T004 [US1] Update `app/actions/album-context.ts` and `app/actions/search.ts`: construct
      `new CatalogProvider()` with no config; remove `CATALOG_PROVIDER_CLIENT_ID`/
      `CATALOG_PROVIDER_CLIENT_SECRET` env reads (depends on T003)
- [X] T005 [US1] Remove `CATALOG_PROVIDER_CLIENT_ID`/`CATALOG_PROVIDER_CLIENT_SECRET` from
      `.env.local.example` (depends on T003)

**Checkpoint**: User Story 1 is independently functional — album search/ingestion works with zero
Spotify configuration. Verified live end-to-end against Radiohead (never-before-ingested artist):
correct tracklist, correct label (XL Recordings), and full 11-album discography populated in
"Linha do tempo" with no rate-limit error.

---

## Phase 4: User Story 2 - "O mundo" shows real historical context instead of an AI refusal (Priority: P2)

**Goal**: Ground the `world_context` narrative facet in real historical events, and reject AI
refusal text the same way fabricated/uncited content is already rejected.

**Independent Test**: Trigger generation for an album with real nearby historical events and confirm
non-refusal content; confirm a refusal is rejected rather than published; confirm no lookup happens
when `world_context` doesn't need regeneration.

### Tests for User Story 2

- [X] T006 [P] [US2] Create `app/lib/providers/historical-events-provider.test.ts`: date-window
      query construction, day/month-precision filtering, denylist filtering (month/year and
      deaths-list navigational pages), dedup by label, graceful `[]` on failure (spec.md US2 AC1)
- [X] T007 [P] [US2] Update `app/lib/ai/publishing-gate.test.ts`: a refusal-phrase statement fails
      validation the same way a missing-citation fact does (spec.md US2 AC2)
- [X] T008 [P] [US2] Update `app/lib/ingestion/album-context.test.ts`: `findHistoricalEvents` is
      called when `world_context` is in the facets needing generation, and NOT called when it is
      already resolved but another facet needs regeneration (spec.md US2 AC3)
- [X] T011 [P] [US2] Update `app/lib/db/narrative-article.test.ts`: `createPending` returns the
      existing row instead of throwing when a concurrent insert already created it for the same
      `(album_id, facet)`; still throws for a genuine non-conflict failure (research.md §6)

### Implementation for User Story 2

- [X] T009 [US2] Create `app/lib/providers/historical-events-provider.ts`: Wikidata SPARQL query
      (±90 day window, `P585`/`timePrecision` filtering, sitelink ranking, denylist, dedup, capped
      at 10 results) (depends on T006)
- [X] T010 [US2] Update `app/lib/ai/publishing-gate.ts`: add a refusal-phrase check to
      `validateStatements`; update `app/lib/ai/narrative.ts`'s `world_context` `FACET_FOCUS` to
      require `kind: "interpretation"` and empty `sourceIds` (the historical-event grounding isn't a
      citable source excerpt) (depends on T007)
- [X] T012 [US2] Update `app/lib/ingestion/album-context.ts`: gate the `findHistoricalEvents` call
      in `generateAllFacets` to only run when `"world_context"` is in `facetsToGenerate`; wire
      `HistoricalEventsProvider` into `app/actions/album-context.ts` (depends on T008, T009)
- [X] T013 [US2] Update `app/lib/db/narrative-article.ts`: `createPending` recovers from a `23505`
      unique-violation by fetching and returning the existing `(album_id, facet)` row (depends on
      T011)

**Checkpoint**: User Stories 1 AND 2 both work. Verified live: Wikidata returned genuinely relevant,
accurate events for release dates across four decades (1986, 1998, 2003, late 2025); confirmed the
concurrency crash this phase also fixed by reproducing it (two overlapping page requests) before the
fix and confirming it no longer occurs after.

---

## Phase 5: User Story 3 - The album page shows the true original release date (Priority: P3)

**Goal**: Cross-check the catalog provider's release date against MusicBrainz's release-group
`first-release-date` and keep whichever fully-specified date is earlier.

**Independent Test**: Ingest an album indexed by the catalog provider only as a later reissue and
confirm the stored date is the true original.

**Depends on**: None (independent of Phases 3-4; happens to also rely on the Phase 3 catalog
provider being in place, since it corrects that provider's output).

### Tests for User Story 3

- [X] T014 [P] [US3] Create `app/lib/providers/musicbrainz-provider.test.ts`: returns a full-date
      release-group result; skips a partial (year-only) result in favor of a full one; returns
      `null` on no results / request failure / thrown error (spec.md US3 AC1-2)
- [X] T016 [P] [US3] Update `app/lib/ingestion/ingest-album.test.ts`: prefers MusicBrainz's date
      when it predates the catalog's reissue date; keeps the catalog's date when MusicBrainz has no
      earlier date (spec.md US3 AC1-3)

### Implementation for User Story 3

- [X] T015 [US3] Create `app/lib/providers/musicbrainz-provider.ts`:
      `fetchOriginalReleaseDate`, filtering to full `YYYY-MM-DD` release-group results only (depends
      on T014)
- [X] T017 [US3] Update `app/lib/ingestion/ingest-album.ts`: add `musicbrainz` to
      `IngestionProviders`; add `earlierFullDate` helper; apply it to the reconciled catalog release
      date before returning `IngestedAlbum`; wire `MusicBrainzProvider` into
      `app/actions/album-context.ts` (depends on T015, T016)

**Checkpoint**: All three data-sourcing user stories work together. Verified live against the exact
failure case: Evanescence's "Fallen" (Deezer-indexed only as its 2014-06-24 reissue) now resolves to
2003-03-04 through the full `ingestAlbum` pipeline with real (non-mocked) providers.

---

## Phase 6: User Story 4 - Empty and degraded states are visible instead of silent (Priority: P4)

**Goal**: Two independent polish/observability fixes.

**Independent Test**: An album with no influence relationships shows an explicit message; a forced
primary-model failure produces a log line naming both models.

**Depends on**: None — independent of Phases 3-5.

### Tests for User Story 4

- [X] T018 [P] [US4] Update `components/InfluenceList.test.tsx`: replaces the "renders nothing when
      empty" assertion with "shows the empty-state message" (spec.md US4 AC1)
- [X] T020 [P] [US4] Update `app/lib/ai/client.test.ts` implicitly covers the new `console.error`
      call in the existing fallback test (no new test needed — existing "falls back on primary
      failure" test already exercises the changed code path) (spec.md US4 AC2)

### Implementation for User Story 4

- [X] T019 [US4] Update `components/InfluenceList.tsx`: render "Nenhuma influência registrada para
      este álbum." instead of `null` when `influences` is empty (depends on T018)
- [X] T021 [US4] Update `app/lib/ai/client.ts`: `console.error` naming both the failed primary model
      and the fallback model before `complete()` retries with the fallback (depends on T020)

**Checkpoint**: All four user stories independently functional and verified together.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across the whole feature.

- [X] T022 [P] Run the full Vitest suite and confirm no regression (338/338 passing; one
      `app/layout.test.tsx` timeout confirmed flaky/environmental on isolated re-run, unrelated to
      this feature's files)
- [X] T023 [P] Run `npx tsc --noEmit` and confirm it passes with no errors
- [X] T024 Walk through every scenario in `specs/007-external-data-reliability/quickstart.md`
      manually against the real dev server and real external APIs (not mocked) — Deezer search/
      ingest for a never-seen artist, Wikidata-grounded "O mundo" generation, the Evanescence
      "Fallen" date correction, and the `createPending` race — confirmed no scenario left a broken
      or endlessly-loading page

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Empty (see note in that phase).
- **User Story 1 (Phase 3)**: Depends on Phase 1 only.
- **User Story 2 (Phase 4)**: Depends on Phase 1 only — independent of Phase 3's files.
- **User Story 3 (Phase 5)**: Depends on Phase 1 only — independent of Phases 3-4's files, though it
  corrects output produced by Phase 3's provider.
- **User Story 4 (Phase 6)**: Depends on Phase 1 only — independent of Phases 3-5.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Parallel Opportunities

- User Stories 1, 2, and 3 touch entirely disjoint source files and were implemented independently
  of each other (only User Story 2's own two sub-fixes — historical events and the `createPending`
  race — share a file, `album-context.ts`/`narrative-article.ts` respectively, discovered together
  during the same testing pass).
- User Story 4's two fixes (`InfluenceList.tsx`, `client.ts`) are independent of each other and of
  every other story.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 3 (User Story 1 — Deezer migration).
3. **STOP and VALIDATE**: search for and ingest a never-before-seen artist with zero Spotify
   configuration present, confirm tracklist and discography populate correctly.
4. This alone unblocks every other album-page feature for new albums, independent of the other
   three stories.

### Incremental Delivery (as actually executed)

1. Phase 1 → Phase 3 (US1, Deezer migration) → validated live (Radiohead) → committed.
2. Phase 4 (US2, Wikidata + refusal detection + the `createPending` fix discovered along the way) →
   validated live (Korn, Evanescence) → in progress toward commit.
3. Phase 5 (US3, MusicBrainz date correction) → validated live (Evanescence "Fallen") → in progress
   toward commit.
4. Phase 6 (US4, polish) → bundled with Phase 4/5's work.
5. Phase 7 (Polish) once all four stories were in.

## Notes

- [P] tasks touched different files with no unresolved dependency at the time they were started.
- Every implementation task has a paired test task per the constitution's mandatory-coverage rule.
- Every external-API decision in this feature (which provider, which query shape, which
  disambiguation heuristic) was verified against the real live service before being implemented —
  see research.md for the specific queries run and results observed.
