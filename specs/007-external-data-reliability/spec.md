# Feature Specification: Reliable External Data for Album Context

**Feature Branch**: `007-external-data-reliability`

**Created**: 2026-08-21

**Status**: Implemented

**Input**: Retroactive specification for work completed directly in conversation (no prior
`/speckit-specify` run). User-reported and self-discovered problems addressed in this feature:
(1) Spotify tightened Developer Mode access in 2026 (5-user cap, mandatory Premium subscription,
Extended Quota Mode now requires a registered business with 250k+ monthly active users), making the
existing Spotify-backed catalog provider unworkable for new albums; (2) the "O mundo" (world context)
section of every album page always showed an AI refusal ("Não há fontes disponíveis...") instead of
real content, because no historical-event data source was ever wired in; (3) after migrating the
catalog provider, a real album ("Fallen" by Evanescence) showed its 2014 reissue date instead of its
true 2003 original release date, because the new catalog source's entry for that title is the reissue,
not the original pressing; (4) the "Influência" section showed a bare, content-less block when an
album had no known influence relationships, instead of an explicit empty-state message; (5) the AI
client silently falls back to a materially weaker model on any primary-model failure, with no logging,
making content-quality regressions undiagnosable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Album search and ingestion keep working as Spotify access tightens (Priority: P1)

A visitor searches for an artist or album that has never been added to the catalog before, and the
search returns real candidates, tracklists load, and an artist's discography populates the album's
timeline — none of which depend on a Spotify Developer Mode app that Spotify's 2026 policy changes
made unworkable for this project (a personal, non-business project that cannot meet Extended Quota
Mode's 250k MAU / registered-business requirement).

**Why this priority**: Without a working catalog provider, no new album can be added to the product
at all — every other feature on the album page is unreachable for a not-yet-ingested album.

**Independent Test**: Search for an artist never previously ingested (e.g., a band with no existing
catalog row), confirm real candidates appear, resolve one, and confirm the resulting album page shows
a correct tracklist and the artist's full discography in "Linha do tempo" — all without any Spotify
credential configured.

**Acceptance Scenarios**:

1. **Given** a free-text search for an artist and album title never seen before, **When** the search
   runs, **Then** real matching candidates are returned without any Spotify Developer Mode
   credential.
2. **Given** a candidate is selected for ingestion, **When** the album is created, **Then** its
   tracklist is populated with correct track numbers, titles, and durations.
3. **Given** an artist search returns multiple same-named entries from the underlying catalog source,
   **When** the system resolves which one is the real artist, **Then** it prefers the entry with
   the most listeners/fans rather than blindly taking the first result.
4. **Given** an artist's discography is fetched for the "Linha do tempo" section, **When** the
   fetch succeeds, **Then** only albums and compilations are shown (singles are excluded).

---

### User Story 2 - "O mundo" shows real historical context instead of an AI refusal (Priority: P2)

A visitor opens any album's page and the "O mundo" section shows genuine, period-appropriate
political/cultural/technological context for the album's release window — instead of the AI
explicitly stating it has no sources for that period, repeated near-identically across all three
category cards.

**Why this priority**: This is a whole content section that was silently broken for every album in
the product (not an edge case) — but the page's other sections still deliver value without it, so it
ranks below the catalog provider being functional at all.

**Independent Test**: Trigger generation for an album whose "O mundo" facet has never been generated
and confirm the three cards (política, cultura, tecnologia) contain real, dated context instead of a
refusal message; confirm that when the model still cannot produce real content (e.g., an
extremely recent release with no indexed history yet), the section is omitted entirely rather than
showing a visible refusal.

**Acceptance Scenarios**:

1. **Given** an album whose release date has real historical events within roughly three months on
   either side, **When** its "O mundo" facet is generated, **Then** the three cards contain
   real, specific historical/cultural/technological context grounded in those events.
2. **Given** a model response that refuses to answer (a "não há fontes" style statement) despite
   being given real historical context, **When** that response is validated, **Then** it is
   rejected the same way a fabricated or uncited fact would be, and the section is not shown.
3. **Given** an album whose "O mundo" facet does not need regeneration (already published or
   already permanently failed), **When** its page is viewed, **Then** no historical-event lookup is
   performed for that view.

---

### User Story 3 - The album page shows the true original release date (Priority: P3)

A visitor opens an album's page and sees the date it was originally released — not the date of a
later reissue, remaster, or deluxe edition that happens to be the version indexed by the catalog
provider currently in use.

**Why this priority**: A wrong release date is a visible, checkable factual error, but it affects a
narrower slice of albums (only those whose original pressing isn't the version indexed by the current
catalog source) than a fully non-functional catalog provider or an entirely broken content section.

**Independent Test**: Ingest an album known to exist in the catalog provider only as a later reissue
(e.g., "Fallen" by Evanescence, indexed as its 2014 reissue) and confirm the stored release date is
the true original release date, not the reissue's.

**Acceptance Scenarios**:

1. **Given** a catalog provider match whose release date is a later reissue's date, **When** an
   independent release-date lookup finds an earlier, fully-specified original date for the same
   album, **Then** the earlier date is used.
2. **Given** an independent release-date lookup returns no date, or only a partial (year-only)
   date, **When** the album is ingested, **Then** the catalog provider's own date is kept unchanged.
3. **Given** the catalog provider's own date is already the earliest known date, **When** the
   independent lookup returns a later or equal date, **Then** the catalog provider's date is kept.

---

### User Story 4 - Empty and degraded states are visible instead of silent (Priority: P4)

A visitor sees an explicit "no data" message when an album genuinely has no known influence
relationships, instead of a section that shows only its header with nothing underneath; separately,
whoever operates the product can see in server logs when the AI client had to fall back to its
weaker secondary model, instead of that happening invisibly.

**Why this priority**: Both are polish/observability fixes with no functional blocker on their own —
they improve the honesty of what's shown and the diagnosability of content-quality regressions, but
nothing else in this feature depends on them.

**Independent Test**: Open an album with no influence relationships and confirm an explicit
empty-state message appears; force the AI client's primary model call to fail and confirm a log line
naming both the failed primary model and the fallback model appears in server output.

**Acceptance Scenarios**:

1. **Given** an album with no stored influence relationships, **When** its "Influência" section
   renders, **Then** an explicit message states none are registered for that album.
2. **Given** the AI client's primary model call fails for any reason, **When** it falls back to the
   secondary model, **Then** a server log line records the failure and the fallback, including
   which models were involved.

---

### Edge Cases

- What happens when the underlying catalog source has no distinct entry for an album's true original
  pressing at all (only reissues)? The independent release-date lookup (User Story 3) still corrects
  the *date*; the catalog-sourced label/cover art may still reflect the reissue — this feature does
  not add a second independent lookup for every other metadata field, only the release date.
- What happens when an artist name search matches several unrelated artists with the same or a
  similar name? The result with the most listeners/fans is preferred (User Story 1, AC3) as a proxy
  for which one is the real, well-known artist; this is a heuristic, not a guarantee, for very
  obscure or newly-formed artists sharing a name with someone more popular.
- What happens when a historical-event data source has good coverage for an older release but sparse
  coverage for a very recent one? The section is simply omitted for that album (User Story 2, AC2) —
  no fallback to a lower-quality guess.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST be able to search for, and ingest, new albums and artists without
  requiring any Spotify Developer Mode credential.
- **FR-002**: When resolving an artist name to a specific catalog entry, the system MUST prefer the
  candidate with the highest listener/fan count when multiple same- or similar-named candidates are
  returned, rather than always taking the first result.
- **FR-003**: When fetching an artist's discography for the album timeline, the system MUST exclude
  singles and include only albums and compilations.
- **FR-004**: The system MUST fetch real, dated historical/cultural/technological context for an
  album's release window and provide it to the "O mundo" content generation step whenever that
  section needs to be generated.
- **FR-005**: The system MUST NOT fetch historical-event context for an album whose "O mundo" section
  does not need to be generated (already published or permanently failed).
- **FR-006**: Generated content that refuses to answer (states no information/sources are available)
  MUST be rejected by the same validation gate that rejects fabricated or uncited content, resulting
  in the section not being shown rather than showing the refusal text.
- **FR-007**: When ingesting an album, the system MUST compare the catalog provider's release date
  against an independent, fully-specified (year-month-day) release date from a second source, and
  use whichever of the two is earlier.
- **FR-008**: The system MUST NOT use a partial (year-only or year-month-only) date from the
  independent source to override the catalog provider's date.
- **FR-009**: The "Influência" section MUST show an explicit message when an album has no known
  influence relationships, rather than an empty content area.
- **FR-010**: When the AI client's primary model fails and it falls back to its secondary model, the
  system MUST log that this happened, including which models were involved.
- **FR-011**: A request that creates the same narrative-article record concurrently from two
  overlapping page views MUST NOT crash; the loser of the race MUST reuse the winner's row instead of
  erroring.

### Key Entities

- **Catalog Provider (role, existing)**: The abstraction (`CatalogProviderAdapter`) that supplies
  album search, tracklists, and artist discographies to the rest of the system. This feature replaces
  its backing service (previously Spotify, now a no-auth public catalog source) without changing the
  role's interface, per the existing role/backing-service separation already used for every other
  provider in this product.
- **Historical Event (new, not persisted)**: A dated, real-world political/cultural/technological
  event near an album's release window, used only as grounding input for AI-generated content; not
  stored in the database, not shown directly to visitors.
- **Original Release Date (new, transient)**: An independently-sourced, fully-specified release date
  used only to correct the catalog provider's own date at ingestion time; not stored separately from
  the album's existing `release_date` field.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly-ingested albums (search, tracklist, discography) succeed without any
  Spotify credential present in the environment.
- **SC-002**: For a defined baseline of albums with real historical events within their release
  window, 100% show non-refusal, dated context in "O mundo" after generation; 0% of published "O
  mundo" content contains a refusal statement.
- **SC-003**: For a defined baseline of albums known to be indexed only as reissues by the catalog
  provider, 100% show their true original release date after ingestion.
- **SC-004**: 0% of album pages with no influence relationships show a content-less "Influência"
  section (all show the explicit empty-state message).
- **SC-005**: 100% of AI-client model fallbacks produce a server log line naming both models
  involved.

## Assumptions

- "Independent, fully-specified date source" (User Story 3) refers to a data source whose model
  explicitly separates a canonical work from its individual pressings/reissues, so that a genuinely
  earlier original-release date can be trusted over a specific pressing's own reported date — not any
  arbitrary second opinion.
- The catalog-provider backing-service swap keeps the existing generate-once-then-cache pattern for
  an artist's discography (already built for the previous backing service) unchanged; this feature
  does not introduce a new caching layer, since the existing one is backing-service-agnostic by
  construction.
- Refusal detection (User Story 2, AC2) is a heuristic phrase match, not a semantic classifier — it is
  expected to catch the specific refusal phrasing patterns observed in practice, not every
  conceivable way a model could decline to answer.
- This feature does not include a backfill job for albums already ingested before it shipped with a
  wrong release date or a refusal-text "O mundo" section already published; those are corrected the
  next time that specific album's affected facet is regenerated (e.g., manually marked stale) or
  re-ingested, consistent with this product's existing "generate once, then serve from storage"
  pattern.
