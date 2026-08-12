# Feature Specification: Editorial Discovery Page & Artist Timelines

**Feature Branch**: `003-discovery-page-redesign`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "quero que tenha esse layout, parecido com esse aqui" — a reference
screenshot of an editorial-style landing page: a "Descobrir" header with contextual label, a bold
headline and subheading, a search bar, a large "Em destaque" (featured) album spotlight, and an
"Acervo" (collection) list of albums each with a one-line editorial hook — plus a top navigation
of "Descobrir · Eras · Linhas" replacing the current "Buscar · Explorar ano · Comparar".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land on an editorial Discover page instead of a bare search box (Priority: P1)

A visitor opens the app and, instead of a plain search box, sees an editorial landing page: a
short contextual label and headline framing the product's premise, a search bar, one large
spotlighted album with its cover, artist, year, and a one-line editorial hook, and a scrollable
list of the rest of the known collection — each entry showing its cover thumbnail, year, title,
artist, and its own one-line hook. Opening any entry (spotlighted or from the list) takes the
visitor to that album's existing narrative page.

**Why this priority**: This is the new front door of the product — every other flow (search,
narrative reading, timelines) is reached from here, and the editorial tone set on this page is
the first impression of the product's "tell a story" differentiator.

**Independent Test**: Load the Discover page with a non-empty catalog and verify a spotlighted
album, a collection list with one-line hooks, and a working search bar all render; verify opening
any entry navigates to that album's page; verify the page still communicates a clear starting
point when the catalog is empty or has only one album.

**Acceptance Scenarios**:

1. **Given** the catalog has at least one album, **When** a visitor loads the Discover page,
   **Then** they see a headline/subheading framing the product, a search bar, one spotlighted
   album (cover, artist, year, one-line hook), and a collection list of albums (including the
   spotlighted one) each with cover thumbnail, year, title, artist, and one-line hook.
2. **Given** the Discover page is showing a collection list, **When** the visitor selects any
   entry (spotlighted or from the list), **Then** they are taken to that album's narrative page.
3. **Given** the search bar on the Discover page, **When** the visitor searches by artist, album,
   or year, **Then** the existing search behavior (including the automatic external-provider
   fallback when there is no local match) still applies.
4. **Given** the catalog has zero albums, **When** a visitor loads the Discover page, **Then**
   the spotlight and collection list are replaced by an inviting empty state that guides the
   visitor to search for an artist or album, rather than an empty or broken layout.
5. **Given** the catalog has exactly one album, **When** a visitor loads the Discover page,
   **Then** that album is shown both as the spotlight and as the sole entry in the collection
   list, without a broken or duplicated-looking layout.
6. **Given** a visitor is on any page of the product, **When** they look at the top navigation,
   **Then** they see exactly three destinations — Discover, Eras, and Timelines — reflecting the
   product's current primary sections.

---

### User Story 2 - Follow an artist's career as a timeline (Priority: P2)

A visitor opens an artist's timeline ("Linhas") and sees their known albums laid out
chronologically, each anchored to its release year, so they can see how an artist's work
progressed over their career at a glance, then jump into any album's own narrative page from the
timeline.

**Why this priority**: Extends the product's storytelling premise from a single album to an
artist's whole arc, but the product delivers its core value (Story 1 and the existing album
narrative pages) without it.

**Independent Test**: Open the timeline for an artist with two or more known albums and verify
they render in chronological order with their year and title, each opening that album's page;
verify an artist with only one known album still renders a valid (if short) timeline rather than
an error.

**Acceptance Scenarios**:

1. **Given** an artist has two or more albums in the catalog, **When** a visitor opens that
   artist's timeline, **Then** the albums appear ordered by release date with each one's year and
   title, and selecting one opens that album's narrative page.
2. **Given** an artist has exactly one album in the catalog, **When** a visitor opens that
   artist's timeline, **Then** it renders that single entry rather than an empty or broken page.
3. **Given** a visitor is on an album's narrative page, **When** they look for a way to see that
   artist's full timeline, **Then** there is a link to that artist's timeline from the page.
4. **Given** the "Linhas" destination in the top navigation, **When** a visitor opens it without
   having chosen a specific artist yet, **Then** they see a way to pick an artist (e.g., from the
   collection built so far) rather than a dead end.

---

### Edge Cases

- What happens when an album's one-line editorial hook has not been generated yet (e.g., an album
  whose narrative is still pending or failed to generate on its most recent attempt)? That
  entry's hook is omitted (showing just cover, year, title, artist) rather than left blank in a
  way that looks broken, and it is never fabricated ahead of the underlying narrative existing.
- What happens when the artist behind the spotlighted or listed album is missing a name (a data
  gap from an external-provider fallback that only found partial data)? The entry still renders
  with the fields it has rather than being hidden entirely.
- What happens when two albums by different artists were added to the catalog at the exact same
  moment (e.g., both created by the same external-provider search fallback)? Ties in "most
  recently added" are broken by a stable secondary order (e.g., album title) so the spotlight
  choice is deterministic rather than flickering between reloads.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Discover page MUST present a contextual label, a headline, and a short
  subheading framing the product's premise, above the search bar.
- **FR-002**: The Discover page MUST retain the existing search behavior (local catalog search
  with automatic external-provider fallback) via a visible search bar.
- **FR-003**: The Discover page MUST present exactly one "featured" album spotlight, showing its
  cover, artist, release year, title, and one-line editorial hook (when available).
- **FR-004**: The featured album MUST be chosen automatically as the most recently added album in
  the catalog, with a deterministic tiebreaker when multiple albums were added at the same time.
- **FR-005**: The Discover page MUST present a collection list of albums (including the featured
  one) each showing a cover thumbnail, release year, title, artist, and one-line editorial hook
  (when available).
- **FR-006**: Selecting any album on the Discover page (featured or from the collection list)
  MUST open that album's existing narrative page.
- **FR-007**: Each album's one-line editorial hook MUST be derived from that album's own,
  already-generated and sourced narrative content — it MUST NOT introduce claims that are not
  already grounded in that album's narrative (consistent with the existing no-fabrication rule).
- **FR-008**: When an album's narrative has not yet been generated or has no usable content, the
  Discover page MUST render that album's entry without a one-line hook rather than inventing one
  or leaving a broken-looking gap.
- **FR-009**: When the catalog has zero albums, the Discover page MUST show an empty state that
  guides the visitor to search for an artist or album, instead of an empty spotlight/list layout.
- **FR-010**: The top navigation MUST present exactly three destinations: Discover (the page
  described in this feature), Eras (the existing year-exploration destination, relabeled), and
  Timelines (the new per-artist timeline destination).
- **FR-011**: Users MUST be able to open a given artist's timeline and see that artist's known
  albums ordered by release date, each showing at minimum its release year and title.
- **FR-012**: Selecting an album from an artist's timeline MUST open that album's existing
  narrative page.
- **FR-013**: Every album's narrative page MUST provide a way to reach that album's artist's
  timeline.
- **FR-014**: The Timelines destination in the top navigation MUST let a visitor choose an artist
  to view (e.g., from the collection built so far) when opened without a specific artist already
  selected.
- **FR-015**: An artist's timeline MUST render correctly (without error) for an artist with only
  one known album.

### Key Entities *(include if feature involves data)*

- **Album (existing)**: Gains a derived, read-only one-line editorial hook sourced from its own
  narrative content; no new stored fields are implied beyond what already exists (title, artist,
  release date, cover art).
- **Artist (existing)**: The subject of a Timeline view, grouping its known Albums ordered by
  release date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a moderated usability check, at least 90% of first-time visitors can correctly
  describe what to do next (search, or open the featured album) within 10 seconds of landing on
  the Discover page, without being told.
- **SC-002**: 100% of albums in the catalog with a fully generated narrative also show a one-line
  editorial hook on the Discover page; 0% of hooks reference a fact not present in that album's
  own narrative.
- **SC-003**: A visitor can go from the Discover page to reading any listed album's full
  narrative page in a single action (one selection).
- **SC-004**: A visitor can go from any album's narrative page to that artist's timeline in a
  single action, and from the timeline to any of that artist's other albums in one more action.
- **SC-005**: The Discover page and artist timelines remain usable (no broken or empty-looking
  layout) when the catalog has zero, one, or many albums.

## Assumptions

- This feature redesigns the existing search/home page into the Discover page described here and
  relabels the existing year-exploration destination as "Eras" — it does not change either
  feature's underlying search or year-exploration behavior.
- The previously planned two-album comparison feature ("Comparar") is not part of this feature's
  top navigation; it remains a valid future destination (e.g., reachable from an album page) once
  it is built, and its removal from the top navigation here is scoped only to this redesign.
- An artist's timeline is built from that artist's known Albums (and, where present, their
  existing dated Curiosities/PerformanceRecords) — it does not assume a dedicated biographical
  "career milestones" data source beyond what the product already gathers per album, consistent
  with the product's existing rule against inventing unsourced claims.
- The visual tone follows the reference: a warm, editorial, print-inspired look — serif display
  typography for headlines and titles, a warm neutral background, and a single warm accent color
  used sparingly (e.g., for the active navigation item or a selected entry) — implemented within
  the project's existing shadcn/ui-based design system rather than a second component library.
- The collection list's ordering (beyond "the featured album is included") follows the same
  "most recently added first" rule as the featured-album selection, for consistency.
- The product remains fully anonymous; the Discover page and timelines introduce no personalization,
  accounts, or saved preferences.
