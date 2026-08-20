# Phase 0 Research: Complete Album Ingestion

All Technical Context fields were resolvable directly from the existing codebase (no external
unknowns) — this document instead resolves the design decisions needed before Phase 1, informed by
reading the actual current implementation of `ingest-album.ts`, `album-context.ts`,
`discography-provider.ts`, `narrative.ts`, `publishing-gate.ts`, and the `curiosity`/`influence`/
`performance-record` db repositories.

## 1. Where do individual tracks come from?

- **Decision**: Extend `DiscographyProvider` to also map `tracklist` out of the release response it
  already fetches for credits (`GET https://api.discogs.com/releases/{id}`), which the real Discogs
  API returns alongside `extraartists` in the same payload. Add a `fetchTracks` method (or return
  both credits and tracks from one internal call) so `ingestAlbum` gets track data with **zero new
  HTTP round-trips**.
- **Rationale**: The release lookup (search → release fetch) already happens for credits every time
  an album is first ingested; Discogs' release response already contains per-track title, position,
  and duration. Reusing it is strictly cheaper and simpler than adding a second external source.
- **Alternatives considered**: Calling Spotify's separate `GET /albums/{id}/tracks` endpoint via
  `CatalogProvider` — rejected because `CatalogProvider.searchAlbum`'s `RawAlbumData` doesn't
  currently carry the Spotify `externalId` through to `IngestedAlbum`, so this would require both a
  new HTTP round-trip per album AND plumbing an ID that isn't wired anywhere today, for data the
  already-called Discogs endpoint provides for free.

## 2. How are curiosities and influence relationships synthesized without fabricating?

- **Decision**: Add one new module, `app/lib/ai/curiosity-influence.ts`, exposing
  `synthesizeCuriosities` and `synthesizeInfluence`. Both follow the exact prompt → Groq call →
  `extractJsonObject` → validate shape already used by `synthesizeNarrative` in `narrative.ts`, over
  the same `sourceExcerpts` (context facts + review summaries) already gathered for that album's
  narrative sections. Each generated item is modeled internally as `{ text, kind: "fact", sourceIds:
  [id] }` — i.e., the same shape `validateStatements` (the existing no-fabrication gate in
  `publishing-gate.ts`) already accepts — so **no new gate logic is needed**; the existing gate is
  reused unchanged. Only after an item passes validation is it mapped to its real persisted shape
  (`CreateCuriosityInput` / `InfluenceRow`), taking `source_id = sourceIds[0]`.
- **Rationale**: Reuses a battle-tested, already-tested no-fabrication gate instead of writing a
  second one; keeps the new module thin (prompt-building + response-shaping), consistent with
  constitution Principle IV's "single wrapped client" discipline.
- **Alternatives considered**: Writing a bespoke validator for the single-`source_id` shape —
  rejected as needless duplication of `validateStatements`'s near-verbatim-copy and missing-citation
  checks, which apply identically regardless of whether the caller stores one source id or several.

## 3. How is an influence relationship's direction and target represented?

- **Decision**: The synthesized influence item's `explanation` text is expected to name the other
  artist/album in prose (e.g., "citado como referência direta por bandas como Nirvana e
  Soundgarden"), satisfying FR-010 (viewable even when unresolved) without needing a dedicated
  free-text "target name" column, since `InfluenceRow` doesn't have one. Direction is represented by
  which side is set to the current album: `from_album_id = current album` when the sources describe
  this album *influencing* something else; `to_album_id = current album` when the sources describe
  this album *being influenced by* something else. The generation step attempts to resolve the named
  target against the existing artist/album repositories (`findArtistByName`, `searchAlbums`) and
  fills the corresponding `to_artist_id`/`to_album_id` (or `from_*`) only on a confident match,
  leaving it unset otherwise — the relationship still displays via its explanation text either way.
- **Rationale**: Matches the existing schema exactly (no migration needed) and matches the spec's
  Assumption that an unresolved target is shown as plain text, not hidden.
- **Alternatives considered**: Adding a new nullable `target_name` column to `influences` — rejected
  as an avoidable schema change when the explanation text already reads naturally with the name
  included, and the spec's Assumptions section already anticipated this exact resolution.

## 4. How do tracks/performance/curiosities/influence avoid being regenerated on every view?

- **Decision**: Apply the identical "generate once" gate already used for credits in
  `generateAllFacets` (`existingCredits.length === 0 && ingested.credits.length > 0 ? persist : use
  existing`) to all four: check `findTracks`/`findPerformanceRecords`/`findCuriosities`/
  `findInfluences` first; only fetch/synthesize/persist when the existing result is empty.
- **Rationale**: Directly satisfies FR-002, FR-011, and SC-004, and keeps the same mental model
  across every kind of per-album data this product generates — no new caching/status concept
  introduced.
- **Alternatives considered**: Introducing a per-album "ingestion status" row to track completeness
  explicitly — rejected as unnecessary; the existing "is the table empty for this album" check is
  simpler, already proven by credits, and sufficient for every acceptance scenario in the spec.

## 5. How does a failure in one of the four generators avoid blanking the whole page?

- **Decision**: Run the tracks/performance persistence and the curiosity/influence synthesis+persist
  steps concurrently with the existing narrative-facet generation via `Promise.allSettled` (or
  equivalent independent try/catch per step) inside `generateAllFacets`/`assembleAlbumContext`, each
  defaulting to `[]` (or leaving existing stored data untouched) on rejection, mirroring how
  `EncyclopediaProvider` already degrades to `[]` on any fetch failure.
- **Rationale**: Directly satisfies FR-012 and SC-005; consistent with the defensive, degrade-
  gracefully posture already used everywhere else in this ingestion pipeline (provider fetch
  failures, Groq call failures for individual narrative facets).
- **Alternatives considered**: Letting one failure `throw` and fail the whole `assembleAlbumContext`
  call — rejected, since that would regress the *existing* narrative-generation behavior (which
  already tolerates partial failure per-facet) for the sake of the four new pieces of data.

**Output**: All open design questions resolved; no remaining `NEEDS CLARIFICATION` markers.
