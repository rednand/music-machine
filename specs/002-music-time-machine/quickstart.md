# Quickstart: Music Time Machine

**Date**: 2026-08-12 | **Contracts**: [contracts/server-actions.md](./contracts/server-actions.md)
**Data model**: [data-model.md](./data-model.md)

Validates the feature end-to-end once implemented; no implementation code here. Full task
breakdown belongs to `/speckit-tasks`.

## Prerequisites

- A Supabase project (URL + anon key + service-role key) with the tables from data-model.md
  created, RLS enabled with public-read policies (research.md §6)
- A Groq API key
- Provider credentials for whichever external sources were selected per research.md §1
- Next.js dev server running (`npm run dev`)

## Setup

1. Run the Supabase migrations for the tables in data-model.md.
2. Seed or ingest at least one well-documented album (e.g., the *Control* example from the
   spec's own narrative illustration) so the scenarios below have real data.
3. Confirm `getAlbumContext` for the seeded album returns `state: "ready"` (not stuck `pending`).

## Validation scenarios (map to spec.md User Stories)

### Scenario 1 — Read an album's full story (User Story 1, P1)

1. Search the seeded artist name via the search box (or `searchCatalog`).
2. Open the returned album.
3. **Expect**: header (cover, title, artist, release date, tracks, credits) plus every section —
   artist's moment, world at the time, musical scene, performance (or its "unavailable" state),
   reception-then-vs-legacy-now, curiosities, influence — all rendered as connected narrative
   prose, each factual statement carrying a visible, clickable source.
4. If the seeded album has no performance data, **expect** that section to show as unavailable,
   never fabricated or blank-broken.
5. Open an influenced/recommended album from the page → land on that album's own page.

### Scenario 2 — Influence and recommendations (User Story 2, P2)

1. On the seeded album's page, view the influence and recommendations sections.
2. **Expect**: each entry carries a short narrative reason, not a bare name; each is clickable.
3. If no confirmed influence exists for the seeded album, **expect** that section to be absent
   rather than filled with a speculative guess.

### Scenario 3 — Explore a year (User Story 3, P3)

1. Call `getYearSnapshot` (or use the year picker) for the seeded album's release year.
2. **Expect**: major releases, top hits, and cultural/historical context render as a short
   narrative overview; any category with no data is simply absent, not padded.

### Scenario 4 — Compare two albums (User Story 4, P4)

1. Call `compareAlbums` for two seeded albums.
2. **Expect**: both `ComparisonView` objects populated per dimension, with `null` (not an error)
   for any unavailable dimension.
3. Call it with the same album twice.
4. **Expect**: `{ error: "same_album" }`, per the contract's self-comparison rule.

## Quality gates to check manually before sign-off

- No response anywhere contains full song lyrics or copied review/article text (FR-021).
- Every `NarrativeArticle` statement of kind `fact` has at least one resolvable source
  (FR-014, FR-015).
- Every `Curiosity` visibly shows its `status` (confirmed/unconfirmed/disputed) — never
  presented as settled fact when it isn't (FR-009, FR-013).
- All user-facing text is pt-BR, including when sources were originally in another language.
- A newly-generated `NarrativeArticle` publishes without a manual approval step, but a
  deliberately malformed generation (a fact statement with no source) is held in
  `failed_validation` and never shown to users (research.md §4).
