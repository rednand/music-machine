# Quickstart: Editorial Discovery Page & Artist Timelines

**Date**: 2026-08-12 | **Contracts**: [contracts/server-actions.md](./contracts/server-actions.md)
**Data model**: [data-model.md](./data-model.md)

Validates the feature end-to-end once implemented; no implementation code here. Full task
breakdown belongs to `/speckit-tasks`.

## Prerequisites

- The 002 Supabase schema already in place (no migration added by this feature).
- At least one album whose narrative has already been generated and published (any album from
  002's own quickstart works) so the hook-derivation scenarios below have real data.
- Next.js dev server running (`npm run dev`).

## Validation scenarios (map to spec.md User Stories)

### Scenario 1 — Land on the editorial Discover page (User Story 1, P1)

1. Open `/`.
2. **Expect**: a contextual label + headline + subheading, a working search bar, one featured
   album spotlight (cover, artist, year, one-line hook when its narrative is published), and a
   collection list below it including that same featured album plus every other known album.
3. Select the featured album → land on its existing narrative page (`/albums/[albumId]`).
4. Select a different entry from the collection list → land on that album's page.
5. Search for an artist/album via the search bar → existing `searchCatalog` behavior (including
   the external-provider fallback) still works unchanged.

### Scenario 2 — Hook omission when a narrative is not ready (User Story 1, Edge Case)

1. Trigger the automatic external-provider search fallback for a brand-new artist/album (per
   002's search fallback) so a new album exists with no published narrative yet.
2. Reload `/`.
3. **Expect**: that album's entry in the collection list renders (cover/year/title/artist) with
   no hook line — no blank placeholder, no fabricated text, no broken layout.

### Scenario 3 — Empty and single-album catalogs (User Story 1, Edge Cases)

1. Against a catalog with zero albums, open `/`.
2. **Expect**: an inviting empty state guiding the visitor to search, not an empty spotlight/list.
3. Against a catalog with exactly one album, open `/`.
4. **Expect**: that one album appears as both the spotlight and the collection list's only entry,
   without a duplicated-looking or broken layout.

### Scenario 4 — Follow an artist's timeline (User Story 2, P2)

1. From an album's page, select the link to that artist's timeline.
2. **Expect**: `/artists/[artistId]` renders that artist's known albums ordered by release date,
   each showing at least its year and title.
3. Select an album from the timeline → land on that album's own narrative page.
4. Open `/artists` directly (the "Linhas" nav destination) without pre-selecting an artist.
5. **Expect**: a list of known artists, each linking to their own timeline (FR-014).
6. Open the timeline for an artist with exactly one known album.
7. **Expect**: it renders that single entry correctly, not an error or empty page (FR-015).

### Scenario 5 — Navigation reflects the new information architecture (User Story 1, Acceptance 6)

1. From any page, inspect the top navigation.
2. **Expect**: exactly three destinations — Descobrir (`/`), Eras (`/years`), Linhas (`/artists`).
3. **Expect**: no "Comparar" entry in the top navigation (it remains a valid future destination,
   just not linked from top nav by this feature — see spec.md Assumptions).

## Quality gates to check manually before sign-off

- Every hook shown on the Discover page is byte-for-byte a substring already present in that
  album's own published `NarrativeArticle` statements — never a new sentence (FR-007, SC-002).
- The featured album and collection ordering do not change between two reloads with no new album
  added (deterministic ordering, research.md §2).
- No new Groq call is made by either new Server Action (verify via test mocks / manual log check)
  — this feature must not increase AI-call volume (research.md §1).
- The pre-existing `/artists/[id]` link from the search-results list (in `app/(public)/page.tsx`,
  now folded into the Discover page) resolves to a real page instead of a 404.
