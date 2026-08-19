# Feature Specification: Discover Page Hero & Spotlight Restyle

**Feature Branch**: `005-acervo-hero-redesign`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "mudei o layout de novo, ajuste para mim de acordo com esse aqui" — a
new standalone HTML reference ("Acervo Claro v2") of the Discover ("Acervo") page. Comparing the
reference render against the current Discover page: the left rail navigation, background, page
copy ("máquina do tempo · contexto de álbuns"), search bar, ticker strip, and collection-list card
styling already match. The reference changes three things: (1) the hero headline is restyled as a
large two-line display title ("VIAJE NO TEMPO", second line in the accent color) with a short
italic tagline, replacing the current single sentence-style headline; (2) the featured-albums
visual on the right of the hero becomes a stacked, tilted, oversized card treatment (artist name
and year printed directly on each card) instead of a flat 2×2 grid of plain square covers, and the
album-count/artist-count pill badges beneath it are dropped; (3) the collection list on the page
is shown as a short preview (a couple of entries) followed by a "ver o acervo inteiro" link/action,
instead of listing every album inline.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A bolder, more editorial hero on first load (Priority: P1)

A visitor opens the Discover page and sees a large, poster-like two-line title with the product's
"time travel" premise, rendered in two visual weights/colors, with a short italic tagline
underneath — replacing today's single-sentence headline — while the surrounding context (eyebrow
label, description paragraph, search bar) stays in place and works exactly as before.

**Why this priority**: The hero headline is the first thing every visitor reads; this is the most
visible and highest-impact piece of the reference layout, and every other change on the page
depends on the hero rendering correctly first.

**Independent Test**: Load the Discover page and verify the two-line display title, its accent
color on the second line, and the italic tagline all render above the existing description and
search bar, with the search bar still functioning (submitting a query navigates the same way it
does today).

**Acceptance Scenarios**:

1. **Given** a visitor loads the Discover page, **When** the hero renders, **Then** they see a
   two-line display title (a neutral-colored first line and an accent-colored second line) with a
   short italic tagline beneath it, followed by the existing description paragraph and search bar.
2. **Given** the restyled hero, **When** a visitor submits a search, **Then** the existing search
   behavior (local match or external-provider fallback) is unchanged.
3. **Given** a narrow (mobile-width) viewport, **When** the hero renders, **Then** the two-line
   title and tagline remain fully readable and do not overlap or clip other hero content.

---

### User Story 2 - Featured albums shown as a stacked card visual (Priority: P2)

A visitor sees the most recently added albums presented as a small stack of tilted, overlapping
cards — each showing its artist name and release year directly on the card — instead of a flat
grid of bare cover thumbnails, giving the hero a more tactile, "physical collection" feel. The
album-count and artist-count summary badges that previously sat beneath the grid are removed.

**Why this priority**: A visual upgrade to the hero's secondary focal point; it makes the page feel
more editorial and matches the new reference, but the page's core value (search, browse, read) is
unaffected if this still rendered as the old grid.

**Independent Test**: Load the Discover page with a non-empty catalog and verify the featured
albums render as an overlapping, tilted card stack with artist name and year visible on each card,
each card still opening that album's page when selected; verify the count badges no longer appear.

**Acceptance Scenarios**:

1. **Given** the catalog has one or more albums, **When** the hero renders, **Then** the featured
   albums appear as an overlapping, tilted stack of cards (rather than a plain grid), each labeled
   with its artist name and release year.
2. **Given** any card in the featured stack, **When** a visitor selects it, **Then** they are taken
   to that album's existing narrative page, exactly as the old grid's cards did.
3. **Given** the featured stack is showing, **When** a visitor looks beneath it, **Then** the
   previous album-count/artist-count pill badges are no longer present.
4. **Given** the catalog has fewer albums than the stack is designed to show, **When** the hero
   renders, **Then** the stack degrades to however many albums exist (one or a few) without
   showing broken, empty, or placeholder cards for albums that don't exist.

---

### User Story 3 - A short collection preview with a link to see everything (Priority: P3)

A visitor scanning the "O acervo" section sees only the first few entries by default, followed by
a clearly labeled action to see the full collection, instead of every known album being listed
inline on the Discover page.

**Why this priority**: A content-density change that keeps the Discover page shorter and more
scannable; it changes how much of the collection is visible by default but does not remove any
album from the product or change how an individual album is opened, so it's independent of the
hero changes above.

**Independent Test**: Load the Discover page with a catalog larger than the preview size and
verify only the first entries appear under "O acervo", followed by a "see full collection" action;
selecting that action reveals (or navigates to) the rest of the collection; verify a catalog at or
below the preview size shows no such action.

**Acceptance Scenarios**:

1. **Given** the catalog has more albums than the preview size, **When** the Discover page loads,
   **Then** only the first entries (ordered the same way the full list is ordered today) appear
   under "O acervo", followed by a visible "ver o acervo inteiro" action.
2. **Given** a visitor selects "ver o acervo inteiro", **When** the action completes, **Then** they
   can see every album in the collection (either expanded in place or on a dedicated view).
3. **Given** the catalog has fewer albums than the preview size, **When** the Discover page loads,
   **Then** every album is already shown and no "ver o acervo inteiro" action appears.
4. **Given** the catalog is empty, **When** the Discover page loads, **Then** the existing empty
   state is shown and no preview/"ver o acervo inteiro" action appears.

---

### Edge Cases

- What happens when the catalog has exactly one album? The hero's card stack shows that single
  card (not an empty stack or duplicated placeholders), and the collection preview shows that one
  entry without a "ver o acervo inteiro" action.
- What happens when an album in the featured stack is missing its cover art? The card still shows
  its artist name and year (consistent with the existing pattern of degrading gracefully rather
  than hiding the entry).
- What happens on very narrow screens where a tilted, overlapping card stack risks becoming hard to
  read or tap? The stack must remain legible and each card individually selectable; if needed it
  may adopt a simpler (e.g., less overlapping) arrangement at small widths, but must never obscure
  a card's artist/year label or make a card unselectable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Discover page hero MUST present a two-line display title, with the second line
  visually distinguished (e.g., accent color) from the first, plus a short italic tagline beneath
  the title — replacing the current single-sentence headline.
- **FR-002**: The Discover page hero MUST continue to present the existing eyebrow label,
  description paragraph, and search bar, unchanged in behavior, alongside the restyled title.
- **FR-003**: The Discover page MUST present its most-recently-added albums as an overlapping,
  tilted card stack, with each card showing at minimum the album's artist name and release year.
- **FR-004**: Each card in the featured stack MUST open that album's existing narrative page when
  selected.
- **FR-005**: The featured card stack MUST render correctly (no broken or placeholder cards) when
  the catalog has fewer albums than the stack's designed capacity, including exactly one album.
- **FR-006**: The Discover page MUST NOT show the album-count/artist-count summary badges that
  previously accompanied the featured albums.
- **FR-007**: The "O acervo" section MUST show only a limited preview of the collection by default
  when the catalog exceeds the preview size, followed by a visible action to see the full
  collection.
- **FR-008**: Selecting the "see full collection" action MUST make every remaining album in the
  collection visible to the visitor (in place or via navigation).
- **FR-009**: When the catalog size is at or below the preview size, the "O acervo" section MUST
  show every album and MUST NOT display the "see full collection" action.
- **FR-010**: The existing ticker strip, collection-list entry card styling, left rail navigation,
  and page background/typography MUST remain unchanged by this feature.
- **FR-011**: When the catalog is empty, the Discover page MUST continue to show its existing empty
  state instead of an empty hero card stack or an empty collection preview with a dead-end action.

### Key Entities *(include if feature involves data)*

- **Album (existing)**: Unchanged in shape; only its presentation changes — appearing as a labeled
  card in the featured stack and, for the full collection, in either the on-page preview or the
  "see everything" view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On first load, a visitor can identify the product's "time travel through music"
  premise from the hero title and tagline alone, without reading the description paragraph.
- **SC-002**: A visitor can open any album shown in the featured card stack in a single selection,
  matching the one-selection behavior of the layout it replaces.
- **SC-003**: The default "O acervo" view shown to a visitor is no longer than the defined preview
  size, and 100% of albums beyond that size remain reachable via the "see full collection" action.
- **SC-004**: The restyled hero and collection preview render without broken, empty, or overlapping
  content across catalog sizes of zero, one, a few, and many albums.

## Assumptions

- This feature is a visual/layout restyle of the existing Discover page only — it does not change
  search behavior, album data, narrative content, or any other page (album context pages, Eras)
  beyond what is described here.
- "Preview size" for the collection list defaults to 2 entries (matching the reference), and
  "see full collection" is satisfied by revealing the rest of the already-fetched collection in
  place on the same page (no new dedicated route is required by this feature, though one may be
  used if simpler).
- The featured card stack's target capacity defaults to 4 albums (matching the reference), showing
  fewer when the catalog has fewer than 4.
- The left rail navigation, page background treatment, ticker strip, and collection-list card
  styling already match the new reference and are explicitly out of scope for this feature.
- The product remains fully anonymous with no accounts or saved preferences, consistent with all
  prior features.
