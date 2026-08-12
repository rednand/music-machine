# Quickstart: Music Context — Historical & Cultural Discovery

**Date**: 2026-08-11 | **Contracts**: [contracts/api.md](./contracts/api.md) | **Data model**:
[data-model.md](./data-model.md)

This guide validates the feature end-to-end once implemented; it does not contain
implementation code. Full task breakdown belongs to `/speckit-tasks`.

## Prerequisites

- Node.js 22 LTS, PostgreSQL and Redis available locally (e.g., via Docker Compose services
  defined in the implementation phase)
- API credentials for Spotify, MusicBrainz, Last.fm, Discogs, and a GPT API key, provided as
  environment variables (never committed — see constitution/global rules on secrets)
- Backend and frontend dependencies installed (`backend/`, `frontend/`)

## Setup

1. Start PostgreSQL and Redis (implementation phase defines the exact compose file).
2. Run backend database migrations (Prisma).
3. Seed or ingest a small reference dataset that includes at least one well-documented
   album (e.g., an artist/album pair comparable to Janet Jackson's *Control*, 1986, used as
   the product's own conceptual example) so the validation scenarios below have real data to
   exercise.
4. Start the backend (`GET /search` should respond) and the frontend dev server.

## Validation scenarios (map to spec.md User Stories)

### Scenario 1 — Discover an album's context (User Story 1, P1)

1. Search for the seeded artist name via `GET /search?q=<artist>&type=artist` or through the
   frontend search box.
2. Open the returned album result → context page.
3. **Expect**: header fields populated (cover, title, artist, release date, genre, label,
   duration, track count); career-moment, musical-scene, timeline, reception, legacy, and
   same-era sections all render; every factual statement shown has a visible, clickable
   source.
4. If the seeded album has no chart/sales data, **expect** the performance section to show
   as unavailable, not fabricated or blank-broken.
5. Open a "same era" recommendation → land on that album's own context page (continued
   exploration).

### Scenario 2 — Explore a time period (User Story 2, P2)

1. Request `GET /periods?year=1986&month=8` (or the frontend's period picker for the same).
2. **Expect**: releases, rising artists, top singles, and cultural events for that period;
   any category with no data is simply absent, not padded.

### Scenario 3 — Home discovery (User Story 3, P3)

1. Load `GET /home` (or the frontend home page).
2. **Expect**: an "on this day" entry when the seed data includes a matching anniversary,
   decade browsing entry points, and featured albums that each link to a valid context page.

### Scenario 4 — Compare two albums (User Story 4, P4)

1. Request `GET /compare?a=<id1>&b=<id2>` for two seeded albums.
2. **Expect**: both `ComparisonView` objects populated per dimension, with `null` (not an
   error) for any unavailable dimension.
3. Request the same album for both `a` and `b`.
4. **Expect**: a 400 response per the contract's self-comparison rule.

### Scenario 5 — Contextual recommendations (User Story 5, P5)

1. Request `GET /albums/{albumId}/recommendations` for a seeded album.
2. **Expect**: each recommendation includes a non-similarity `reason` and a pt-BR
   `explanation` a user could read as-is.

## Quality gates to check manually before sign-off

- No response anywhere contains full song lyrics or copied review text (FR-023, FR-024).
- Every `ContextArticle` statement of kind `fact` has at least one resolvable source
  (Principle III / FR-015).
- All user-facing text is pt-BR (FR-030), including for sources originally in English.
- A newly-generated `ContextArticle` publishes without a manual approval step, but a
  deliberately malformed generation (e.g., a fact statement with no source) is held in
  `failed_validation` and never shown to users (FR-029, research.md §7).
