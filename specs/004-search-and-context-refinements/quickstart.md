# Quickstart: Search & Context Refinements for MVP

**Date**: 2026-08-12 | **Contracts**: [contracts/server-actions.md](./contracts/server-actions.md)
**Data model**: [data-model.md](./data-model.md)

Validates the feature end-to-end once implemented; no implementation code here.

## Prerequisites

- The existing 002/003 Supabase schema and provider credentials already in place.
- At least one album already known locally with a couple of tracks (for song search and track-
  list rendering to have something real to match against).
- Next.js dev server running (`npm run dev`).

## Validation scenarios (map to spec.md User Stories)

### Scenario 1 — Search only saves what you click (User Story 1, P1)

1. Search for an artist/album not yet known locally (e.g., one with several similarly-named
   releases) via `/`.
2. **Expect**: multiple candidates appear; none are yet openable as a stable link.
3. Reload the page (or check the catalog directly) without clicking anything.
4. **Expect**: zero new albums were added.
5. Search the same query again, select exactly one candidate.
6. **Expect**: a waiting state appears, then the browser lands on that album's context page.
7. Check the catalog.
8. **Expect**: exactly one new album exists — the one selected, not any of the other candidates.
9. Search the same query a third time.
10. **Expect**: the previously-selected item now appears as a `known` result (direct link, no
    re-fetch), and any other candidates from the first search still are not saved.

### Scenario 2 — Search by song (User Story 2, P2)

1. On `/`, switch the search mode selector to "música".
2. Search for a known track's title.
3. **Expect**: results show the song title plus its album and artist.
4. Select a result.
5. **Expect**: the album's context page opens with that track visibly highlighted in its track
   list.
6. Search for a song title that matches nothing.
7. **Expect**: a clear "no results, try an album search" state, not a broken page.

### Scenario 3 — Richer "o mundo na época" (User Story 3, P3)

1. Open a well-documented album's context page.
2. **Expect**: the "o mundo na época" section includes at least one statement about popular
   culture or contemporary trends, alongside any political/technological framing, still with a
   visible source.

### Scenario 4 — Artist's other albums live inline (User Story 4, P4)

1. Open the context page of an album by an artist with two or more known albums.
2. **Expect**: an inline section lists the artist's other known albums, in chronological order,
   each linking to its own context page.
3. Open the context page of an album by an artist with exactly one known album.
4. **Expect**: that inline section is simply absent.
5. Inspect the top navigation from any page.
6. **Expect**: only Descobrir and Eras — no "Linhas" entry, and `/artists` no longer resolves.

## Quality gates to check manually before sign-off

- `resolveSearchCandidate` is called with only `{ query, externalId }` — never a full record —
  confirmed by inspecting the network payload from `SearchForm`'s click handler.
- No test or manual run shows a candidate persisted before it was explicitly selected.
- The pop-culture broadening never introduces an unsourced statement — spot-check a few generated
  sections against their listed sources.
