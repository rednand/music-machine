# Feature Specification: Music Time Machine

**Feature Branch**: `002-music-time-machine`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Um app (Music Time Machine / Album Context) onde, ao abrir um álbum,
o usuário vê: o álbum (capa, faixas, produtores/músicos), o momento do artista (carreira e vida
pessoal na época), o mundo na época (política, cultura, tecnologia), o cenário musical (outros
álbuns/singles dominando as paradas), desempenho (vendas, certificações, posições nas paradas,
prêmios/indicações), recepção inicial x legado, influência (artistas/álbuns inspirados por ele),
curiosidades (bastidores, gravação, conflitos, mudanças de formação), e uma linha do tempo da
carreira do artista. Recursos interativos: comparar dois álbuns do mesmo mês/ano, explorar um ano
específico, e recomendações contextuais ('se você gostou de Control, ouça estes álbuns
contemporâneos'). O diferencial é a narrativa — o app deve contar uma história, não apresentar uma
ficha técnica."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read an album's full story (Priority: P1)

A user searches for an artist or album and opens its page, where instead of a spec sheet they
read a narrative: the album itself (cover, tracks, credits), what was happening in the artist's
career and personal life at the time, what was happening in the world, what else dominated the
charts, how the album performed commercially and critically, how its reputation has evolved since
release, behind-the-scenes trivia, and the albums/artists it went on to influence.

**Why this priority**: This is the entire product — the narrative-driven album page is the
stated differentiator ("contar uma história, não apresentar uma ficha técnica") and the only
screen a first-time user needs to get the full value proposition.

**Independent Test**: Search for a well-documented album, open it, and verify every section
below renders as connected prose (not a bare data table) with real, sourced content; verify a
statement like the Janet Jackson/*Control* example ("Em fevereiro de 1986, Janet Jackson tinha 19
anos...") is the kind of copy the page actually produces.

**Acceptance Scenarios**:

1. **Given** a user is on the search screen, **When** they search by artist name or album title,
   **Then** they see matching results they can open, disambiguated when titles repeat across
   different artists.
2. **Given** a user opens an album, **When** the page loads, **Then** they see the album header
   (cover, title, artist, release date, track list, producer/musician credits) and every
   narrative section: the artist's moment, the world at the time, the musical scene, performance,
   reception-then-vs-legacy-now, influence, and curiosities.
3. **Given** the artist's-moment and world-at-the-time sections, **When** the user reads them,
   **Then** the copy reads as connected narrative prose (e.g., in the style of the *Control*
   example), not an unconnected bullet list of facts.
4. **Given** a narrative paragraph states a specific fact (a date, a chart position, a sales
   figure, a quote, an award), **When** the user inspects it, **Then** they can see which source
   it came from and reach that source.
5. **Given** performance data (sales, certifications, chart positions, awards/nominations) is not
   available for a given album, **When** the page renders, **Then** that specific sub-section is
   omitted or clearly marked as unavailable rather than showing fabricated data.
6. **Given** a user finishes reading an album's page, **When** they view its influence/recommended
   section, **Then** they can open another album and keep exploring.

---

### User Story 2 - Follow influence and get contextual recommendations (Priority: P2)

While reading an album's page, a user wants to know what it inspired and what else to explore
next — not a generic "similar sound" list, but suggestions explained in the same narrative voice
("se você gostou de Control, ouça estes álbuns contemporâneos").

**Why this priority**: Turns a single album lookup into continued exploration, which is the
product's stated engagement goal, but the page still delivers its core value (User Story 1)
without it.

**Independent Test**: Open any album's page, view its influence and recommendations, and verify
each suggested album/artist comes with a short narrative reason (era, scene, direct influence, or
historical importance) rather than a bare list of names.

**Acceptance Scenarios**:

1. **Given** an album is known to have influenced later artists or albums, **When** the user
   views the influence section, **Then** those are listed with a brief explanation of the
   influence.
2. **Given** the recommendations section, **When** the user views it, **Then** each recommended
   album is introduced with a short contextual reason (e.g., "outros álbuns contemporâneos"),
   and opening it leads to that album's own page.
3. **Given** no confirmed influence relationships are known for an album, **When** the page
   renders, **Then** the influence section is omitted rather than filled with speculative guesses.

---

### User Story 3 - Explore a specific year (Priority: P3)

A user picks a year (e.g., 1986) and sees a narrative snapshot of that year in music and culture:
the biggest releases, chart-topping hits, notable cultural/historical events, and trends.

**Why this priority**: Gives an entry point for users with no specific artist in mind, extending
the product beyond a lookup tool, but is not required for the core album-story experience to
deliver value.

**Independent Test**: Select a year with no prior search and verify a populated narrative
snapshot of major releases, hits, and cultural context for that year appears.

**Acceptance Scenarios**:

1. **Given** a user selects a year, **When** the page loads, **Then** they see major album/single
   releases, chart-topping hits, and notable cultural/historical events for that year, framed as
   a short narrative overview rather than a raw list.
2. **Given** a year has sparse underlying data, **When** the page loads, **Then** it shows only
   what is available rather than implying completeness or inventing filler content.

---

### User Story 4 - Compare two albums (Priority: P4)

A user picks two albums — often, but not only, released around the same month or year — and sees
a side-by-side comparison of their story, performance, reception, and legacy.

**Why this priority**: Adds an analytical, engagement-driving use case on top of the single-album
narrative, valuable to more invested users but not required for the core loop.

**Independent Test**: Select any two albums for comparison and verify a side-by-side view of
release date, performance, reception, and legacy for both, including when they are contemporaries
from the same month/year.

**Acceptance Scenarios**:

1. **Given** two selected albums, **When** the comparison view loads, **Then** each dimension
   (release date, performance, critical reception then/now, legacy) is shown side-by-side for
   both.
2. **Given** one of the two albums is missing data for a dimension, **When** the comparison view
   loads, **Then** that dimension shows as unavailable for that album rather than blocking the
   rest of the comparison.

---

### Edge Cases

- What happens when a search matches multiple distinct albums with the same or similar title by
  different artists? The user must be able to disambiguate before opening a page.
- What happens when an album has no meaningful sales/chart/award data at all? The performance
  section must degrade gracefully rather than appear broken or invent numbers.
- What happens when sources disagree on a fact (e.g., two conflicting release dates or two
  different certification levels)? The system must surface the discrepancy or prefer the more
  authoritative source rather than silently picking one.
- What happens when an album is too recent to have an established "legacy"? The
  reception-then-vs-legacy-now section must say so honestly instead of inventing long-term impact.
- What happens when a search returns no matches? The user gets a clear "no results" state with
  guidance, not an empty or broken page.
- What happens when personal-life details about the artist are rumored but not confirmed? The
  narrative must mark them as unconfirmed/alleged rather than stating them as fact.
- What happens when a user compares an album to itself, or to a different edition/reissue of the
  same album? The system must handle this without presenting a nonsensical comparison.
- What happens when a search matches nothing in the local catalog at all? The system must attempt
  to find the artist/album via external providers before giving up, so a genuinely discoverable
  subject is not a dead end just because no one has looked it up yet.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to search by artist name or album title and receive relevant,
  disambiguated results.
- **FR-002**: Users MUST be able to open a page for any album returned by search.
- **FR-003**: Every album page MUST present a header with cover art, title, artist, release date,
  track list, and producer/musician credits.
- **FR-004**: Every album page MUST present a narrative section on the artist's professional and
  personal-life moment at the time of the album (career context, personal circumstances relevant
  to the record).
- **FR-005**: Every album page MUST present a narrative section on what was happening in the
  world at the time (political, cultural, and technological context).
- **FR-006**: Every album page MUST present the surrounding musical scene: other albums and
  singles that were dominating the charts in the same period.
- **FR-007**: When sales figures, certifications, chart positions, or awards/nominations are
  available for an album, the page MUST present them; when unavailable, the system MUST omit or
  clearly label that sub-section as unavailable rather than fabricate it.
- **FR-008**: Every album page MUST present how the album was received at launch and how its
  reputation/legacy is viewed now, framed so the contrast between the two is clear.
- **FR-009**: Every album page MUST present verified behind-the-scenes context (recording
  circumstances, notable conflicts, lineup changes) when such information exists, clearly marking
  anything unconfirmed or disputed as such rather than presenting it as settled fact.
- **FR-010**: Every album page MUST present, when known, the artists/albums it influenced, each
  with a brief explanation of the influence; the section is omitted when no such relationship is
  known rather than being filled speculatively.
- **FR-011**: Every album page MUST present contextual recommendations for further listening,
  each with a short narrative reason (era, scene, direct influence, or historical importance) —
  not similarity alone.
- **FR-012**: All narrative sections (artist's moment, world at the time, reception-vs-legacy,
  curiosities, influence/recommendation explanations) MUST be written as connected prose derived
  from gathered structured data and source material, not as an unconstrained free-form response
  and not as a disconnected bullet list of facts.
- **FR-013**: Generated narrative content MUST distinguish confirmed facts from interpretations,
  critical opinions, and unconfirmed/rumored information.
- **FR-014**: The system MUST NOT present invented events, sales figures, chart positions, award
  wins, quotations, or biographical/personal-life claims; every factual statement in generated
  narrative content MUST be traceable to a specific stored source.
- **FR-015**: The system MUST record, for every piece of sourced information, which source it
  came from, and MUST let the user reach the original source.
- **FR-016**: The system MUST apply a source-priority order when reconciling conflicting
  information (official/primary sources and recognized music databases outrank general web
  sources), and MUST surface a discrepancy rather than silently discarding a conflicting value
  when two similarly authoritative sources disagree.
- **FR-017**: Once a narrative has been generated and stored for an album, the system MUST reuse
  the stored result rather than regenerating it on every subsequent view of the same album.
- **FR-018**: Users MUST be able to select a specific year and view a narrative snapshot of major
  releases, chart-topping hits, and notable cultural/historical events for that year.
- **FR-019**: Users MUST be able to select two albums and view a side-by-side comparison covering
  release date, performance, critical reception then/now, and legacy, with unavailable dimensions
  shown as such rather than blocking the rest of the comparison.
- **FR-020**: The system MUST reject or gracefully special-case a comparison between an album and
  itself or a different edition of the same underlying album, rather than presenting a nonsensical
  side-by-side.
- **FR-021**: The system MUST NOT store or display complete song lyrics, and MUST NOT reproduce
  copied text from third-party reviews or articles — reception summaries MUST be original
  synthesis (per FR-012) with links back to original sources rather than copied excerpts.
- **FR-022**: The system MUST retain attribution and license information for any source content
  whose license requires it.
- **FR-023**: The system MUST support use on desktop, tablet, and mobile screen sizes.
- **FR-024**: When a search query has zero matches in the local catalog, the system MUST
  automatically query external providers for a matching artist/album (no separate button or user
  action required); if a match is found, it MUST persist a minimal Artist/Album record so the
  result is immediately openable, and MUST NOT create a duplicate of an artist/album that already
  exists locally. If no external match is found either, the user MUST see the existing "no
  results" state (per Edge Cases).

### Key Entities *(include if feature involves data)*

- **Artist**: A musical act; has a career narrative and relates to the albums they released and
  to artists they influenced or were influenced by.
- **Album**: The central subject of a page; relates to its artist, tracks, credits, chart/sales/
  award records, reviews, curiosities, and influence/recommendation links to other albums.
- **Track**: An individual song belonging to an album.
- **Credit**: A production/performance credit (producer, musician, engineer) linking a person to
  an album or track and their role.
- **PerformanceRecord**: A chart position, certification, sales figure, or award/nomination tied
  to an album, with the date and source it was reported.
- **Review**: A critical assessment of an album from a named publication, with a verdict, date,
  summary, and link to the original source — never the full original text.
- **HistoricalEvent**: A dated political, cultural, or technological occurrence usable to build
  "the world at the time" context for a given period.
- **Curiosity**: A verified behind-the-scenes fact (recording circumstance, conflict, lineup
  change) tied to an album, marked confirmed or unconfirmed/disputed.
- **Influence**: A directed relationship from one album/artist to another, carrying a short
  explanation of the influence.
- **Source**: A reference to where a piece of information came from, including its authority
  tier, date, and license/attribution requirements; every factual statement links to one or more
  Sources.
- **NarrativeArticle**: The stored, reusable narrative text for a given album, section by section,
  composed of statements distinguishable as fact, interpretation, opinion, or unconfirmed, each
  traceable to Sources.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can go from searching an artist name to reading a well-known
  album's full narrative page in three actions or fewer.
- **SC-002**: At least 90% of factual statements sampled from generated narratives are traceable
  to a displayed, reachable source.
- **SC-003**: For a defined baseline catalog of widely-recognized albums, at least 80% have a
  complete page (all mandatory sections populated or explicitly marked unavailable), with no
  section silently skipped.
- **SC-004**: At least 60% of users who read one album's page open at least one influenced/
  recommended album within the same session.
- **SC-005**: Users reading about an unfamiliar older album report, via post-use feedback, that
  the page felt like a story rather than a spec sheet, at a satisfaction rate of at least 80%.
- **SC-006**: A user can locate and open a year's narrative snapshot in two actions or fewer.
- **SC-007**: Zero confirmed instances of fabricated facts (invented events, sales figures, chart
  positions, awards, quotes, or personal-life claims) in generated narrative content during
  quality review.

## Assumptions

- The product targets a broad historical catalog (roughly the 1960s to the present) with the best
  narrative depth for albums that already have strong public documentation; obscure albums may
  have thinner or partially unavailable sections, which is acceptable per FR-007/FR-009/FR-010.
- The product is fully anonymous for this scope: there is no user account system, saved history,
  or personalization beyond the current session.
- Album cover art and similar media assets are displayed strictly as supplied through each data
  provider's own terms of use, not re-hosted or repurposed beyond that license.
- "Same era" groupings for the musical-scene section and for comparisons default to release-date
  proximity (roughly ±1–2 years) when no stronger contextual signal applies.
- Generated narrative content is presented in Portuguese (pt-BR) by default, matching the
  product's own example copy; source material in other languages is translated/synthesized into
  pt-BR while preserving attribution to the original-language source.
- New album pages publish once their narrative passes automated source-citation and
  banned-content checks; there is no manual human-review gate before first publication.
- The external-provider search fallback (FR-024) only creates baseline catalog metadata
  (title/artist/release date and similar structured fields already covered by FR-003); it does not
  duplicate narrative generation, which still follows the existing generate-once pipeline (FR-017)
  the first time the resulting album page is opened.
