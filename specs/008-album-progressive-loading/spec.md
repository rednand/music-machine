# Feature Specification: Album Progressive Loading

**Feature Branch**: `008-album-progressive-loading`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "quero que mude a forma como a tela de novo album sendo incluido abre. Eu qro que vc primeiro busque primeito a ficha tecnica do album, ou tracklist etc, e depois busque na IA as outras informações, adicionando um loading enqnto busca, mas pode mostrar o loading com a pagina aberta"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See album details as soon as they're available (Priority: P1)

A user searches for an album that isn't yet in the collection and selects it. Instead of staring at a single full-page loading screen until every piece of information (technical sheet, tracklist, and AI-written narrative) is ready, the user sees the album page open as soon as the factual data — title, artist, release info, tracklist, credits, cover art — has been retrieved, even though the AI-generated narrative sections aren't ready yet.

**Why this priority**: This is the core of the request — it removes the single biggest source of perceived wait time (today the whole page is blocked behind the slowest step, AI generation) and lets users start reading factual album data immediately.

**Independent Test**: Select a new album from search and observe that the album page renders with title, artist, tracklist, and credits well before any AI-written text appears. Can be verified without any AI-content changes being complete.

**Acceptance Scenarios**:

1. **Given** a user selects an album that does not yet exist in the collection, **When** the technical sheet and tracklist retrieval finishes, **Then** the album page opens showing that information, regardless of whether the AI-generated narrative is ready.
2. **Given** the album page has opened with technical data but AI-generated content is still being produced, **When** the user looks at the sections reserved for AI-written content (artist context, world context, musical scene, reception & legacy, curiosities, influence, summary), **Then** each of those sections shows a loading indicator instead of being blank or showing stale/incorrect content.

---

### User Story 2 - AI-generated content appears without a page reload (Priority: P2)

Once the AI-generated narrative finishes being produced, the sections that were showing a loading indicator update in place to display the finished content, without the user needing to refresh the page or navigate away and back.

**Why this priority**: Completes the experience started by User Story 1 — opening the page early is only a real improvement if the rest of the content shows up automatically afterward.

**Independent Test**: After the page has opened in the loading state described in User Story 1, wait for AI generation to finish and confirm the narrative sections populate on their own, with no user action required.

**Acceptance Scenarios**:

1. **Given** the album page is open and showing loading indicators for the AI-generated sections, **When** the AI-generated content finishes being produced, **Then** those sections update automatically to display the finished content.
2. **Given** the user navigates away from the album page while AI content is still loading and returns later, **When** the page reloads, **Then** it shows whichever content is ready at that time (finished narrative if done, loading indicator if still in progress) rather than restarting the technical-data fetch.

---

### User Story 3 - Clear feedback when something goes wrong (Priority: P3)

If the technical sheet/tracklist can't be retrieved, or the AI-generated content fails to produce for one of the sections, the user sees a clear message instead of an indefinite loading indicator or a broken page.

**Why this priority**: Error handling protects the experience introduced by the first two stories but isn't required to demonstrate the core value of opening the page earlier.

**Independent Test**: Simulate a failure in technical-data retrieval and confirm the user sees an error state instead of a page stuck loading; separately, simulate an AI-generation failure for one section and confirm the other sections are unaffected.

**Acceptance Scenarios**:

1. **Given** a user selects a new album, **When** the technical sheet/tracklist cannot be retrieved, **Then** the user sees an error message explaining the album couldn't be added, instead of an indefinite loading state.
2. **Given** the album page has opened with technical data, **When** AI generation fails for one narrative section, **Then** that section shows an error/retry state while the other sections continue to load or display normally.

### Edge Cases

- What happens if the user selects the same new album twice in quick succession (e.g., double-click, or opens it in two tabs)? The system must not fetch or generate the same data twice in parallel; the second request should reuse the in-progress result.
- What happens if a user opens the page for an album where AI content generation was already triggered previously (e.g., by another user) and is still in progress? The page must show the same in-place loading behavior for whichever sections aren't ready yet, rather than restarting the whole process or showing a generic "please wait" text page.
- What happens if the technical sheet/tracklist succeeds but the AI provider is completely unavailable for an extended period? Affected sections should show a persistent error/retry state rather than looping forever on a loading indicator.
- What happens if the user closes the browser tab while AI content is still being generated? Generation must continue and complete server-side so the content is ready the next time the album page is opened.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST retrieve the album's technical sheet and tracklist (title, artist, release date, genre, label, duration, credits, cover art, track listing) before attempting to retrieve or generate AI-written narrative content for that album.
- **FR-002**: The system MUST open and display the album page as soon as the technical sheet and tracklist are available, without waiting for AI-generated narrative content to finish.
- **FR-003**: While AI-generated narrative content is being produced, the system MUST display a loading indicator in place of each section that depends on that content, on the already-open album page.
- **FR-004**: The system MUST update each AI-generated section automatically, in place, once its content becomes available, without requiring the user to reload or navigate the page.
- **FR-005**: The system MUST NOT trigger a duplicate technical-data retrieval or a duplicate AI-generation run for the same album while one is already in progress.
- **FR-006**: If technical-sheet/tracklist retrieval fails, the system MUST show the user a clear error state instead of an indefinite loading indicator.
- **FR-007**: If AI-generation fails for a given narrative section, the system MUST show an error/retry state scoped to that section, without blocking the other sections from displaying their own content or loading state.
- **FR-008**: Reopening an album page after AI generation has completed MUST show the finished content directly, without re-showing the loading state.

### Key Entities *(include if feature involves data)*

- **Album Technical Sheet**: The factual, catalog-sourced data for an album — title, artist, release date, genre, label, duration, cover art, credits, and tracklist. Available first and does not depend on AI generation.
- **AI-Generated Narrative Sections**: The written content produced for an album (e.g., artist context, historical/world context, musical scene, reception & legacy, curiosities, influence, summary). Depends on the Technical Sheet already being available, and is produced afterward.
- **Generation State**: Tracks, per album, whether AI-generated narrative sections are not started, in progress, ready, or failed — used to decide whether the page shows finished content or a loading/error indicator for each section.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see the album's technical sheet and tracklist within the time it takes to retrieve that data alone, no longer waiting for AI-generated content on top of it.
- **SC-002**: 100% of AI-generated sections that are not yet ready show a visible, section-scoped loading indicator rather than a blank area or a single full-page blocking loader.
- **SC-003**: AI-generated content appears on the open album page without any manual user action (refresh or re-navigation) in at least 95% of cases where generation succeeds.
- **SC-004**: Selecting the same new album more than once in quick succession never results in duplicate technical-data fetches or duplicate AI-generation runs for that album.

## Assumptions

- The AI-generated narrative sections (artist context, world context, musical scene, reception & legacy, curiosities, influence, summary) are treated as one group that becomes ready together; the spec does not require each individual section to finish and reveal independently of the others, since they are produced from the same underlying generation step today.
- This behavior applies to the flow described by the user (adding a new album from search) and, consistently, to any album page opened while its AI-generated narrative is not yet ready for any reason (e.g., generation already in progress from a prior request) — so the same page never shows two different loading experiences depending on why content isn't ready.
- Error states for both technical-data failures and AI-generation failures are user-facing messages with the option to retry, consistent with how other errors are presented elsewhere in the product.
- No changes are required to what data is fetched or generated — only to the order in which it's fetched and how/when it's revealed on the page.
