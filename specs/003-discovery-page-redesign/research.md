# Research: Editorial Discovery Page & Artist Timelines

## 1. How to derive each album's one-line editorial hook (FR-007, FR-008)

**Decision**: The hook is the verbatim `text` of the first published `NarrativeStatement` from a
fixed preference order of facets — `reception_vs_legacy` first (it tends to produce the most
"headline-like" sentence, e.g. "O disco em que a estrela pop virou autora"-style framing), falling
back to `artist_moment` if `reception_vs_legacy` has no published statements yet. If neither facet
has a published statement, the album has no hook (FR-008) — the Discover page renders that entry
without one rather than blocking on generation or fabricating text.

**Rationale**: The spec (FR-007) requires the hook to introduce no claim beyond what the album's
own narrative already established and sourced. Reusing an already-validated, already-published
sentence verbatim makes that guarantee true by construction — there is no new text for the
publishing gate (`validateStatements`) to re-check, and no new Groq call that could fail, get
truncated, or drift from the source material. It also costs nothing extra at read time: the
Discover page already needs to know whether an album's narrative exists at all (to decide whether
to link into a ready page), so reading one more already-fetched statement is free.

**Alternatives considered**:
- *Dedicated Groq call to compress/paraphrase the full narrative into one punchy sentence*:
  produces a more "editorial" tone tuned specifically for a hook, but adds a new AI call path (a
  fifth prompt shape, per constitution Principle IV's "single wrapped client" discipline, that
  would still need its own defensive parsing and its own publishing-gate-style validation to avoid
  reintroducing exactly the malformed-JSON and fabrication risks fixed earlier for the four
  narrative facets). Rejected for this feature: the cost/fragility is disproportionate to what a
  landing-page teaser needs, and it does not staying meaningfully more "grounded" than reusing an
  already-approved sentence.
- *Truncate the full first paragraph to N characters*: cheap, but produces visually broken
  mid-sentence cutoffs and reads nothing like the reference layout's polished one-liners. Rejected.
- *Store a separate, manually-curated tagline field*: would need an editorial/admin workflow that
  does not exist in this anonymous, no-accounts product. Rejected as out of scope.

## 2. "Most recently added" ordering and tiebreaker (FR-004, Edge Cases)

**Decision**: Order by `albums.created_at` descending, with `albums.title` ascending as a stable
tiebreaker for rows sharing the same timestamp. The featured pick is simply the first row of this
ordering; the collection list uses the same ordering in full (including the featured album, per
the reference layout, which repeats the spotlighted album as the collection's first entry).

**Rationale**: `created_at` already exists on the `albums` table (`supabase/migrations/
20260812000000_init.sql`) with a default of `now()`, so no migration is needed — only exposing it
through `AlbumRow` and adding an `order("created_at", { ascending: false })` query. A title-based
tiebreaker is simple, has no dependency on any other table, and is stable across reloads (same
input rows always produce the same order), which the spec's edge case explicitly requires.

**Alternatives considered**:
- *Tiebreak by `id`*: equally stable, but a raw UUID has no human-legible meaning if ever
  inspected while debugging; title is just as stable and easier to reason about. Rejected in
  favor of title.
- *Random featured pick per visit*: rejected directly by the user during specification (chose
  "most recently added" over "random" and "manually curated").

## 3. Route structure for artist timelines and the artist picker (FR-011, FR-014)

**Decision**: `/artists` is the picker (FR-014) — a simple list of known artists linking to their
timelines. `/artists/[artistId]` is the timeline itself (FR-011, FR-012). This also resolves a
pre-existing gap: `app/(public)/page.tsx`'s search-results list already links artist results to
`/artists/${result.id}`, and no page has ever existed at that route — this feature makes that link
resolve to something real instead of leaving it dangling.

**Rationale**: Reusing the same `/artists/[artistId]` path for both "the thing search already
links to" and "the new timeline" avoids introducing a second, differently-named route for the same
underlying concept (an artist's page), and avoids a redirect. The picker at `/artists` gives the
"Linhas" nav item a sensible destination when no artist is pre-selected, per FR-014.

**Alternatives considered**:
- *`/timelines` and `/timelines/[artistId]`*: matches the nav label literally, but creates two
  different URLs for "an artist's page" (`/artists/x` from search, `/timelines/x` from nav),
  which is confusing and does not fix the existing dangling link. Rejected.

## 4. Listing artists for the picker

**Decision**: Add `findAllArtists(): Promise<ArtistRow[]>` to the existing album repository
(`app/lib/db/album.ts`), returning all artists ordered by name. The picker at `/artists` renders
this list directly (name only, linking to `/artists/[artistId]`).

**Rationale**: Every `Artist` row already exists only because at least one `Album` references it
(the schema has no orphaned-artist-creation path), so "all artists" is already equivalent to "all
artists with at least one known album" — no extra filtering logic is needed.

**Alternatives considered**: A dedicated `findArtistsWithAlbums()` join was considered but is
redundant given the schema guarantee above; the simpler `findAllArtists()` is preferred.

## 5. Empty-state and single-item rendering (Edge Cases, FR-009, FR-015)

**Decision**: Both the Discover page's aggregation (`app/lib/discovery/collection.ts`) and the
artist-timeline Server Action return an explicit, typed "empty" / "single-entry" result rather
than `null`/throwing, and the page components branch on that result the same way `AlbumPage`
already branches on `not_found`/`pending`/`ready` (002's established pattern in `app/actions/
album-context.ts`). No new state machine or loading state is introduced — this feature has no
generation step to wait on.

**Rationale**: Consistent with the existing, already-tested pattern in this codebase rather than
inventing a new one; keeps the two new pages trivially testable with plain data fixtures (zero
albums, one album, many albums) instead of needing to mock a pending/async transition.
