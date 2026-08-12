# Research: Search & Context Refinements for MVP

## 1. How `resolveSearchCandidate` avoids trusting client-supplied catalog data

**Decision**: The client sends back only `{ query: string, externalId: string }` — the exact
search query that produced the candidate list, plus the specific candidate's external id. The
Server Action re-runs `catalog.searchByText(query)` itself, finds the entry whose `externalId`
matches, and ingests only that one (reusing the existing dedupe-by-slug rule). If the provider no
longer returns that id for that query (transient provider inconsistency), the action returns a
clear error rather than falling back to trusting anything the client sent.

**Rationale**: The most direct implementation — have the client echo back the full candidate
record (title, artist, release date, cover, etc.) it already received from the initial search —
would let any client-side call to the Server Action inject arbitrary rows into the catalog, since
nothing would verify those fields came from the provider. Re-deriving from a fresh, server-side
provider call keeps the exact same trust boundary the old auto-fallback already had (the server,
never the client, talks to the external provider), while still only ever persisting the one item
the user selected.

**Alternatives considered**:
- *Trust the client-echoed candidate fields directly*: simplest, but turns a read-only search
  result into an unauthenticated arbitrary-write vector. Rejected — this is exactly the kind of
  gap constitution Principle VII exists to catch.
- *Add a provider "get by id" endpoint and call that instead of re-searching by text*: more
  precise (avoids the small chance the same query's top-N results shift between the two calls),
  but requires a new provider method and a new adapter test double for no meaningful gain at this
  catalog's size — the same `externalId` reappearing in a re-search of the same query within the
  few seconds a user takes to click is the overwhelmingly common case. Rejected for this MVP;
  worth revisiting if the catalog provider adds a native by-id lookup later.

## 2. Persisting the two "click-to-save" outcomes (already-known vs. still-a-candidate)

**Decision**: `searchCatalog(query)` returns a discriminated `SearchResultItem` — a `"known"`
variant for anything already in the local catalog (rendered as a direct link, exactly like
today), and a `"candidate"` variant for external-provider hits that are not yet saved (rendered
as a button that calls `resolveSearchCandidate`, shows a waiting state, then navigates to the
resulting `/albums/[albumId]`). `"candidate"` results only ever appear when the local search
found nothing (unchanged trigger condition from 002/003).

**Rationale**: Keeps the existing `searchCatalog` contract's shape (one array, one loop to
render) while making "is this safe to just open, or does opening it need to save something
first" an explicit, typed distinction the UI must handle — rather than an implicit assumption that
every returned item already has a durable id.

**Alternatives considered**: Returning two separate arrays (`known[]`, `candidates[]`) was
considered; a single discriminated array was preferred since the UI renders both kinds in one
combined, disambiguated list (matching how the reference layout and existing tests already treat
search results as one ranked list).

## 3. Broadening "o mundo na época" to cover pop culture

**Decision**: Extend the existing per-facet focus instruction for `world_context` in
`app/lib/ai/narrative.ts` to explicitly ask for popular-culture and contemporary-trend content
(fashion, entertainment, everyday customs) alongside the political/technological framing already
required, still constrained to the same already-gathered source excerpts and the same
no-fabrication rule.

**Rationale**: The user's ask is a coverage/breadth change to an existing, already-validated
prompt shape — not a new capability. The existing encyclopedia-provider source material
(Wikipedia-style context facts) already typically contains pop-culture-adjacent content for
well-documented eras; the gap was in the instruction, not the data. This keeps constitution
Principle IV's "single wrapped client, no new call shape" intact.

**Alternatives considered**: Integrating a dedicated historical/pop-culture events provider (the
long-disclosed `historical_events` table population gap) would give richer, more reliable
coverage, but is a materially larger research/integration effort the user explicitly declined for
this MVP in favor of the prompt-only approach.

## 4. Song search matching and disambiguation

**Decision**: `searchSongs(query)` matches `tracks.title` via case-insensitive `ilike` (same
pattern as `searchAlbums`/`searchArtists`), then resolves each match's `Album` and `Artist` to
return `{ trackId, title, albumId, albumTitle, artistName }`. No external-provider fallback for
songs in this MVP (spec.md Assumptions) — an unmatched song search shows the same "no results,
try an album search" guidance FR-010 requires.

**Rationale**: Reuses the exact `ilike`-based search pattern already proven for albums/artists;
avoids adding track-level provider search (a real capability gap in the current
`CatalogProviderAdapter`, which only supports album-level search) to keep this MVP's scope to
what was actually requested.

**Alternatives considered**: Extending `CatalogProviderAdapter` with a track-search method was
considered so song search could also benefit from click-to-save, but this doubles the surface
area of Research §1's re-derivation rule (needing a second, track-shaped verification path) for a
capability the user did not ask for this round. Deferred.

## 5. Rendering a track list on the album page for the first time

**Decision**: `AlbumContextBody` gains `tracks: TrackRow[]`, populated via a new
`findTracksByAlbumId` repository query, always returned (empty array when none exist — same
omit-rather-than-break convention as `performance`/`curiosities`). The album page renders a new
`TrackList` component; when a `?track=<trackId>` query param is present (arrives from a song
search selection), the matching track is visually highlighted.

**Rationale**: FR-009 (open the album page with the selected song highlighted) requires some
rendered track list to highlight an entry within — none exists today (only a numeric
`trackCount` is shown). This is the minimal addition needed to satisfy that requirement without
inventing a separate track-detail page, consistent with the clarification that song results open
the album page rather than a dedicated song page.

**Alternatives considered**: Passing the highlighted track via a route segment
(`/albums/[albumId]/tracks/[trackId]`) instead of a query param was considered, but a query param
keeps the same canonical album URL for both a plain visit and a song-search-originated visit,
which matches FR-009's framing ("that song's album context page... with the song highlighted") as
one page, not a distinct route.

## 6. Removing the standalone timeline destination without losing the underlying data path

**Decision**: Delete `app/(public)/artists/page.tsx`, `app/(public)/artists/[artistId]/page.tsx`,
`app/actions/artist-timeline.ts`, and `components/ArtistTimeline.tsx` (each with its test).
`findAlbumsByArtistId` (added to `app/lib/db/album.ts` in 003) is kept and called directly from
`assembleAlbumContext`, which populates a new `otherAlbumsByArtist` field on `AlbumContextBody`,
rendered inline by a new `OtherAlbumsByArtist` component — reusing the same repository query the
deleted pages used, so no data-access logic is rewritten, only re-wired.

**Rationale**: The user asked to remove the separate destination while keeping the substance
("deixe dentro do contexto do álbum ou da música"); deleting the now-unused page/action/component
avoids dead code, while keeping the one genuinely reusable piece (`findAlbumsByArtistId`) where it
already lived.
