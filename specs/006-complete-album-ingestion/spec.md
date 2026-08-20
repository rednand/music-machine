# Feature Specification: Complete Album Ingestion (Tracks, Performance, Curiosities, Influence)

**Feature Branch**: `006-complete-album-ingestion`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Corrigir a ingestão de álbuns para que faixas, curiosidades, influências
e dados de desempenho sejam de fato gerados e persistidos para todo álbum. Hoje, ao abrir a página de
um álbum pela primeira vez: (1) as faixas nunca são salvas, mesmo existindo um método de criação no
banco (createTrack) — nada no pipeline de ingestão o chama; (2) curiosidades e influências não têm
nenhum código gerador implementado — as tabelas de banco não têm sequer um método de criação; (3) os
dados de desempenho são buscados do provedor externo mas descartados em vez de persistidos. O resultado
visível para o usuário é um álbum 'vazio': sem lista de faixas, sem seção de curiosidades, sem seção de
influência, sem dados de desempenho, mesmo quando esses dados existem nas fontes externas consultadas.
Isso afeta todo álbum do sistema, não é um caso isolado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the actual tracklist for any album (Priority: P1)

A visitor opens an album's page for the first time and sees its real tracklist — track numbers,
titles, and durations — instead of an empty "O álbum" section that only shows the release date.

**Why this priority**: The tracklist is the single most basic, expected piece of information about
an album; a page for a music album that never shows any song names undermines the product's core
premise on every single album, not just edge cases.

**Independent Test**: Open the page for an album that has never been viewed before (first-time
ingestion) and verify its tracklist renders with track numbers, titles, and durations sourced from
the same external catalog already used for the album's own metadata; reload the page and verify the
same tracklist is now served from what was stored, without being re-fetched from scratch.

**Acceptance Scenarios**:

1. **Given** an album whose external catalog source has track listing data, **When** a visitor opens
   that album's page for the first time, **Then** the tracklist section shows every track with its
   number, title, and duration.
2. **Given** an album whose tracklist was already stored from a previous visit, **When** a visitor
   opens that album's page again, **Then** the same tracklist is shown without being regenerated.
3. **Given** an album whose external catalog source has no track-level data available, **When** a
   visitor opens that album's page, **Then** the tracklist section is omitted or clearly marked as
   unavailable, rather than showing a broken or endlessly-loading list.

---

### User Story 2 - See performance data that was actually found (Priority: P2)

A visitor opens an album's page and, when the external sources actually contain chart positions,
certifications, sales figures, or awards for that album, sees them — instead of always seeing "dados
de desempenho não disponíveis" even when that data was successfully retrieved during the visit.

**Why this priority**: The data is already being fetched successfully by the existing pipeline; the
gap is purely that it's thrown away before being shown, so fixing it delivers value with the least
new data-sourcing risk of the three gaps in scope.

**Independent Test**: Open the page for an album whose external source returns at least one
performance record, and verify it appears; reload the page and verify the same record is still
shown, now served from what was stored rather than fetched again.

**Acceptance Scenarios**:

1. **Given** an album whose external sources return one or more performance records on first view,
   **When** a visitor opens that album's page, **Then** those records are shown, and remain shown on
   every subsequent visit.
2. **Given** an album whose external sources return no performance records, **When** a visitor opens
   that album's page, **Then** the existing "dados de desempenho não disponíveis" message is shown
   (unchanged behavior for the genuinely-empty case).

---

### User Story 3 - Read grounded curiosities about an album (Priority: P3)

A visitor opens an album's page and, when the sources already gathered about that album contain a
noteworthy trivia-like fact, sees it in the "Curiosidades" section, each one traceable to the source
it came from — instead of always seeing "nenhuma curiosidade registrada", even for well-documented
albums.

**Why this priority**: Adds a content-quality improvement consistent with the product's storytelling
differentiator, but the page still delivers its core value (tracklist, narrative sections) without
it.

**Independent Test**: Open the page for a well-documented album and verify at least one curiosity
appears with a traceable source; open the page for an album with no usable source material and
verify the section still shows its existing empty state rather than an invented curiosity.

**Acceptance Scenarios**:

1. **Given** an album whose gathered source material contains a distinctive, noteworthy fact beyond
   the main narrative sections, **When** its curiosities are generated, **Then** at least one
   curiosity is stored and shown, attributable to the specific source it came from.
2. **Given** an album whose gathered source material contains nothing distinctive enough to qualify
   as a curiosity, **When** its curiosities are generated, **Then** the section remains empty rather
   than inventing one to fill the gap.
3. **Given** curiosities already generated for an album on a previous visit, **When** a visitor opens
   that album's page again, **Then** the same curiosities are shown without being regenerated.

---

### User Story 4 - See what an album influenced or was influenced by (Priority: P4)

A visitor opens an album's page and, when the gathered sources describe a real influence relationship
(this album influencing, or being influenced by, another artist or album), sees it in the
"Influência" section with its explanation — instead of always seeing an empty section.

**Why this priority**: The narrowest of the four gaps — influence claims are the hardest of the four
to source reliably and the least central to a first read of any single album, so it can land last
without blocking the others.

**Independent Test**: Open the page for an album whose sources describe a concrete influence
relationship and verify it appears with its explanation; open the page for an album with no such
material and verify the section still shows its existing empty state.

**Acceptance Scenarios**:

1. **Given** an album whose gathered sources describe it influencing, or being influenced by, a
   specific artist or album, **When** its influence data is generated, **Then** that relationship is
   stored and shown with a short explanation, attributable to the source it came from.
2. **Given** the artist or album on the other side of an influence relationship is not yet in this
   product's own catalog, **When** the relationship is shown, **Then** it still displays with its
   name and explanation (without a broken link), rather than being suppressed entirely.
3. **Given** an album whose gathered sources describe no influence relationship, **When** its
   influence data is generated, **Then** the section remains empty rather than inventing one.

---

### Edge Cases

- What happens when the external catalog source used for an album's own metadata has since removed
  or changed its track listing? The stored tracklist from the original ingestion continues to be
  shown; this feature does not add ongoing re-synchronization.
- What happens when generating curiosities or influence data fails partway (e.g., the underlying
  AI call errors) after tracks or performance data for the same page view already succeeded? Each of
  the four kinds of data (tracks, performance, curiosities, influence) succeeds or fails
  independently — a failure in one must not prevent the others from being shown.
- What happens when the same noteworthy fact could plausibly be shown as both a curiosity and part
  of the existing narrative sections? No requirement to deduplicate across those two surfaces is in
  scope; each is generated from the same underlying no-fabrication rule independently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When an album's page is opened for the first time, the system MUST retrieve that
  album's individual tracks (at minimum: track number, title; duration when available) from the
  same external catalog source already used for the album's own metadata, and store them.
- **FR-002**: On every subsequent view of an album whose tracks are already stored, the system MUST
  show the stored tracklist without re-retrieving it from the external source.
- **FR-003**: When an album's external catalog source has no track-level data available, the system
  MUST show the existing "no tracklist" treatment rather than a broken or perpetually-loading state.
- **FR-004**: When an album's external sources return one or more performance records (chart
  position, certification, sales figure, or award) during ingestion, the system MUST store them and
  show them on that and every subsequent view.
- **FR-005**: When an album's external sources return no performance records, the system MUST
  continue to show the existing "dados de desempenho não disponíveis" empty state.
- **FR-006**: The system MUST generate curiosities for an album only from source material already
  gathered for that album, and MUST NOT invent a curiosity when no qualifying fact exists in that
  material — consistent with the product's existing no-fabrication rule.
- **FR-007**: Every stored curiosity MUST be traceable to the specific source excerpt it was derived
  from.
- **FR-008**: The system MUST generate influence relationships for an album only from source material
  already gathered for that album, and MUST NOT invent one when no qualifying relationship is
  described in that material.
- **FR-009**: Every stored influence relationship MUST include a short explanation and be traceable
  to the specific source excerpt it was derived from.
- **FR-010**: An influence relationship MUST remain viewable even when the artist or album on the
  other side of the relationship does not yet exist in this product's own catalog.
- **FR-011**: Curiosities and influence relationships already stored for an album MUST be shown on
  subsequent visits without being regenerated, consistent with how tracks, performance data, and the
  existing narrative sections already behave.
- **FR-012**: A failure while generating any one of tracks, performance data, curiosities, or
  influence for a given album MUST NOT prevent the other three, or the album's existing narrative
  sections, from being generated and shown.

### Key Entities

- **Track (existing, currently never populated)**: An individual song on an Album — track number,
  title, duration. This feature makes it actually get created during ingestion instead of remaining
  permanently empty.
- **PerformanceRecord (existing, currently fetched but discarded)**: A chart position, certification,
  sales figure, or award tied to an Album. This feature makes the already-fetched data get stored
  instead of discarded.
- **Curiosity (existing schema, no generator today)**: A noteworthy trivia-like fact about an Album,
  with a status (confirmed/unconfirmed/disputed) and a required link to the source it came from. This
  feature adds the generation step that populates it.
- **Influence (existing schema, no generator today)**: A directional relationship between this Album
  and another Artist or Album (in either direction), with an explanation and a required link to the
  source it came from; the other side of the relationship may or may not correspond to an existing
  catalog entry. This feature adds the generation step that populates it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a defined baseline set of albums whose external catalog source has track-level
  data, 100% show a complete tracklist (not an empty "O álbum" section) after their first view.
- **SC-002**: For a defined baseline set of albums whose external sources return performance data,
  100% show that data after their first view, instead of the "não disponível" message.
- **SC-003**: For a defined baseline of well-documented albums, at least 50% show at least one
  curiosity, and 0% of shown curiosities lack a traceable source.
- **SC-004**: 0% of stored curiosities or influence relationships are regenerated (re-run through
  generation) on a repeat view of the same album.
- **SC-005**: A failure while generating curiosities or influence for a given album never results in
  a visibly broken page — the tracklist, performance data, and narrative sections for that same album
  remain visible when they themselves succeeded.

## Assumptions

- "Source material already gathered for that album" means the same context facts and review
  summaries already collected for that album's existing narrative sections — this feature does not
  introduce a new external data source beyond what ingestion already fetches.
- Curiosities and influence relationships are subject to the same no-fabrication discipline already
  enforced for the album's narrative sections (a statement without a traceable source is dropped, not
  invented) — reusing that existing rule rather than defining a new one.
- An influence relationship's other side (the artist or album this one influenced, or was influenced
  by) is stored as a named reference; when that name does not resolve to an existing catalog entry,
  it is still shown as plain text with its explanation, not hidden or treated as an error.
- This feature is scoped to making the four already-designed pieces of data (tracks, performance,
  curiosities, influence) actually get generated and persisted for every album going forward; it does
  not include a bulk backfill job for albums already saved before this feature ships — those will
  pick up the missing data the next time their page happens to be viewed, the same as any other album
  whose narrative sections were not yet generated.
- The product's existing "generate once, then always serve what's stored" pattern (already used for
  the narrative sections and credits) is the expected behavior for tracks, performance data,
  curiosities, and influence too, for consistency.
