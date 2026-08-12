# Feature Specification: Search & Context Refinements for MVP

**Feature Branch**: `004-search-and-context-refinements`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "eu nao gostei, vc nao mudou muito o layout. coisas q eu quero pra um
MVP agora, tira essa pagina de linha do tempo por enqnto, deixe dentro do contexto do album ou da
musica. MAS TEM 2 coisas q eu quero pra agora, primeiro eu quero que quando eu buscar algo, só
popule o banco qndo eu clicar nesse, pra nao ficar populando coisas como por exemplo Thriller 40 e
thriller 25, é pra guardar só o q eu clicar. Alem disso, eu quero que o contexto explore mais
sobre cultura pop e coisas q aconteciam na epoca. Outra coisa, tem q ter opção de buscar por
musica tbm, coloque um dropdown ao lado do input de busca pra eu selecionar se é musica ou album."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search results never pollute the catalog before they're chosen (Priority: P1)

A user searches for an artist or album and sees a list of matching results — some already known
to the product, some found live from external sources. Nothing is added to the catalog just from
appearing in that list. Only the one result the user actually opens gets saved, permanently and
exactly once.

**Why this priority**: The prior automatic-fallback behavior saved every candidate a search
turned up (e.g., searching "Thriller" saved "Thriller", "Thriller 40", and "Thriller 25 Super
Deluxe Edition" all at once), silently filling the catalog with near-duplicate editions the user
never asked to keep. This is a data-quality problem affecting every future search and every future
"em destaque"/"acervo" view, so it is fixed first.

**Independent Test**: Search for something not yet known to the catalog, confirm several
candidates appear, then close the app/reload without clicking any of them — verify none of those
candidates were saved. Then repeat the search, click exactly one candidate, and verify only that
one is now permanently in the catalog.

**Acceptance Scenarios**:

1. **Given** a search returns candidates not yet known to the catalog, **When** the user views the
   results without selecting any, **Then** none of those candidates are persisted.
2. **Given** the same search results, **When** the user selects one candidate, **Then** that
   candidate — and only that one — is saved to the catalog, and the user is taken to its context
   page.
3. **Given** a candidate the user selects is not yet known, **When** the system is saving it,
   **Then** the user sees a clear waiting state rather than a dead link or a blank page.
4. **Given** the user runs the same search again after selecting a candidate, **When** results
   are shown, **Then** the previously-selected item now appears as an already-known result (not
   duplicated, not re-fetched from the external source).
5. **Given** saving the selected candidate fails (the external source errors or returns unusable
   data), **When** this happens, **Then** the user sees a clear failure message and nothing
   partial or broken is left in the catalog.

---

### User Story 2 - Search by song, not just by album (Priority: P2)

A user wants to find a specific song, not just an album. Next to the search input, they can
choose whether they're searching for an album or a song, and get matching results either way.
Opening a song result takes them to its album's context page with that song highlighted.

**Why this priority**: A real, frequently-needed way to start a search (by song title) that
today has no path at all, but the product still delivers its core value through album search
without it.

**Independent Test**: Switch the search mode to "música", search for a known song title, and
verify matching songs appear, each identified by title and the album/artist they belong to;
select one and verify it opens that album's context page with the song highlighted.

**Acceptance Scenarios**:

1. **Given** the search mode selector next to the search input, **When** the user sets it to
   "música", **Then** searches are matched against song titles rather than album titles.
2. **Given** a song search that matches one or more known songs, **When** results are shown,
   **Then** each result shows the song title along with its album and artist, to disambiguate
   same-titled songs.
3. **Given** the user selects a song result, **When** its context page opens, **Then** it is that
   song's album context page, with the selected song visibly highlighted.
4. **Given** a song search matches nothing in the local catalog, **When** results are shown,
   **Then** the user sees a clear "no results" state guiding them to try an album search instead,
   rather than a broken or misleading result.

---

### User Story 3 - The "world at the time" narrative covers more than politics and technology (Priority: P3)

While reading an album's page, the "o mundo na época" section currently leans on political,
cultural, and technological framing. A user wants that section to also capture popular culture and
the everyday things people were into at the time — what was trending, what people were talking
about — not just headline-level world events.

**Why this priority**: A content-quality improvement to an already-shipped section — valuable for
the product's storytelling differentiator, but the page still delivers its core value without it.

**Independent Test**: Open a well-documented album's page and verify its "o mundo na época"
section includes at least one statement about popular culture/contemporary trends, not solely
political or technological framing, still properly sourced.

**Acceptance Scenarios**:

1. **Given** an album with well-documented source material for its era, **When** its "o mundo na
   época" section is generated, **Then** it includes at least one statement about popular culture
   or contemporary social trends, in addition to any political/technological framing.
2. **Given** the source material available for an album's era has little to no pop-culture
   content, **When** that section is generated, **Then** it still only states what the sources
   support — it never invents pop-culture details to fill the gap (per the existing
   no-fabrication rule).

---

### User Story 4 - An artist's other work lives inside the album/song context, not a separate page (Priority: P4)

A user reading about an album also wants to see what else that artist made, but without leaving
the page for a separate destination. The dedicated timeline page and its own top-navigation entry
are removed for this MVP; the same information — the artist's other known works, in order —
appears directly inside the album (or song) context page instead.

**Why this priority**: Simplifies the MVP's navigable surface per explicit direction; the
underlying value (seeing an artist's other work) is preserved, just relocated, so this is a
scope-reduction/consolidation change rather than new capability.

**Independent Test**: Open an album's context page for an artist with two or more known albums
and verify the artist's other known works appear inline, in chronological order, each opening its
own context page — with no separate "Linhas"/timeline destination anywhere in the top navigation.

**Acceptance Scenarios**:

1. **Given** an album's context page, **When** the artist has other known albums, **Then** those
   are listed inline on that same page, in chronological order, each linking to its own context
   page.
2. **Given** an artist with only one known album, **When** its context page is viewed, **Then**
   that inline section is simply omitted rather than shown empty or broken.
3. **Given** the top navigation, **When** a user inspects it, **Then** there is no dedicated
   timeline/"Linhas" destination.

---

### Edge Cases

- What happens when the user selects a search candidate, but before saving finishes, selects a
  different candidate instead? The system must not end up saving both, or saving the wrong one —
  only the candidate the user is currently waiting on should be persisted.
- What happens when a song search matches songs from multiple different albums with the same
  song title? Each result must be disambiguated by its album and artist, same as the existing
  album-title disambiguation.
- What happens when a not-yet-known candidate the user selects turns out, once fetched in full, to
  already match something already in the catalog (e.g., a duplicate under a slightly different
  external identifier)? The system must not create a duplicate entry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT persist any search candidate to the catalog merely because it
  appeared in a list of results — this replaces the previous behavior of automatically saving
  every external-provider candidate found during a search.
- **FR-002**: When a user selects a search result that is not yet known to the catalog, the
  system MUST save exactly that one item, and no other candidate from the same search.
- **FR-003**: While a selected, not-yet-known candidate is being saved, the system MUST show the
  user a clear waiting state rather than a dead link, a blank page, or no feedback.
- **FR-004**: If saving a selected candidate fails, the system MUST show a clear failure message
  and MUST NOT leave a partially-created or broken entry in the catalog.
- **FR-005**: Selecting an already-known result (local or previously saved) MUST NOT re-fetch or
  re-save it — it opens directly.
- **FR-006**: The system MUST NOT create a duplicate catalog entry when a selected candidate
  turns out to already match an existing entry.
- **FR-007**: Users MUST be able to choose, via a visible selector next to the search input,
  whether a search targets albums or songs.
- **FR-008**: A song search MUST match against known song titles and MUST disambiguate results by
  the song's album and artist when titles repeat.
- **FR-009**: Selecting a song result MUST open that song's album context page with the selected
  song visibly highlighted.
- **FR-010**: A song search that matches nothing MUST show a clear "no results" state guiding the
  user toward an album search, rather than a broken or misleading result.
- **FR-011**: Every album's "o mundo na época" narrative section MUST include, when the available
  source material supports it, at least one statement about popular culture or contemporary
  social trends, in addition to any political/technological framing already required.
- **FR-012**: The popular-culture statements added under FR-011 remain subject to the existing
  no-fabrication rule — they MUST NOT be invented when source material doesn't support them.
- **FR-013**: Every album's context page MUST show, inline, the artist's other known albums in
  chronological order, each linking to its own context page — when the artist has no other known
  albums, this section is omitted.
- **FR-014**: The top navigation MUST NOT include a dedicated timeline/per-artist destination
  ("Linhas") for this MVP scope.

### Key Entities *(include if feature involves data)*

- **Track (existing)**: A song belonging to an Album; becomes independently searchable by title
  for the first time in this feature, disambiguated by its Album/Artist when titles repeat.
- **Album, Artist (existing)**: Unchanged in shape; Album gains no new field, but its context page
  now inlines the Artist's other known Albums instead of linking to a separate destination.
- **Search Candidate (conceptual, not persisted)**: A result surfaced by a search — either an
  already-known Album/Track, or one found live from an external source and not yet saved. Only
  becomes a real, persisted Album (and its Tracks) the moment a user selects it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After any search, 0% of the candidates the user did not select are present in the
  catalog afterward.
- **SC-002**: A user can search for a song and reach its album's context page, with the song
  highlighted, in a single selection after searching.
- **SC-003**: For a defined baseline of well-documented albums, at least 80% of their "o mundo na
  época" sections include a pop-culture/contemporary-trend statement, not solely political or
  technological framing.
- **SC-004**: From any album's context page, a user can reach any of that artist's other known
  albums in a single selection, with zero dedicated timeline destinations in the top navigation.
- **SC-005**: A user who searches and selects a not-yet-known result reaches a working context
  page (or a clear failure message) without ever seeing a dead link or indefinite blank state.

## Assumptions

- This feature replaces the previous automatic search-fallback persistence behavior (which saved
  every external-provider candidate a search returned) with the click-to-save model described
  here; no prior requirement asking for automatic bulk persistence remains in effect.
- Song search matches only against songs already known locally (tracks of already-ingested
  albums). It does not, in this MVP, trigger a live external-provider search for songs the
  catalog doesn't know yet — a user looking for a song not yet known can still find it by
  searching its album by name, which will surface it as a click-to-save album candidate per User
  Story 1, after which the song becomes searchable too.
- The richer "o mundo na época" pop-culture coverage (User Story 3) is produced by broadening
  the guidance given to the existing narrative-synthesis step over the same source material
  already gathered — it does not introduce a new external data source or provider for this MVP.
- The dedicated per-artist timeline pages and picker (previously reachable via a "Linhas" top-nav
  destination) are removed from the product's navigable surface for this MVP; the same
  underlying information (an artist's other known albums, in order) is preserved by showing it
  inline on the album context page instead, so no user-facing capability is actually lost.
- The product remains fully anonymous, with no accounts or saved preferences, consistent with all
  prior features.
