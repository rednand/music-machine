# Contract: Internal Module Interfaces

**Date**: 2026-08-21 | **Data model**: [../data-model.md](../data-model.md)

This feature has no external HTTP interface of its own (no new Server Action, Route Handler, or API)
and no new UI props beyond `InfluenceList`'s existing (empty-array) input. The "contracts" below are
the internal provider/ingestion/AI function signatures that constrain the implementation and tests.

## `provider.interface.ts` (modified) — new historical-events shape

```ts
export interface RawHistoricalEventData {
  title: string;
  date: string; // YYYY-MM-DD
}

export interface HistoricalEventsProviderAdapter {
  readonly providerName: string;
  fetchEvents(releaseDate: string): Promise<RawHistoricalEventData[]>;
}

export interface CatalogProviderAdapter {
  // unchanged signatures — only the backing implementation changes
  readonly providerName: string;
  searchAlbum(query: AlbumLookupQuery): Promise<RawAlbumData[]>;
  searchByText(query: string): Promise<RawAlbumData[]>;
  fetchTracks(albumId: string): Promise<RawTrackData[]>;
  searchArtist(artistName: string): Promise<string | null>;
  fetchArtistAlbums(artistId: string): Promise<RawAlbumData[] | null>;
}
```

- Satisfies: FR-001, FR-002, FR-003, FR-004

## `catalog-provider.ts` (rewritten, same `CatalogProviderAdapter` shape)

- `CatalogProvider` now calls Deezer's public REST API instead of Spotify's OAuth-gated API. No
  constructor config is needed (previously `{ clientId, clientSecret }`); the constructor now only
  accepts an optional injected `fetchImpl` for testing.
- `searchArtist` picks the candidate with the highest `nb_fan` among results, not the first result.
- `fetchArtistAlbums` filters to `record_type === "album"` (excludes `"single"`).
- `searchAlbum`/`searchByText` enrich each of the top 5 search results with a second call to
  `album/{id}` to obtain `release_date`, `label`, and `genre` (not present on the search-result
  payload itself), dropping any candidate whose enrichment call fails rather than returning a
  partial/broken entry.
- Satisfies: FR-001, FR-002, FR-003

## `historical-events-provider.ts` (new)

```ts
export interface HistoricalEventsProviderConfig {
  userAgent: string;
}

export class HistoricalEventsProvider implements HistoricalEventsProviderAdapter {
  readonly providerName: "historical_events";
  constructor(config: HistoricalEventsProviderConfig, fetchImpl?: typeof fetch);
  fetchEvents(releaseDate: string): Promise<RawHistoricalEventData[]>;
}
```

- Queries Wikidata for dated items within ±90 days of `releaseDate`, day/month-precision only,
  ranked by sitelink count, denylist-filtered, deduped by label, capped at 10 results.
- Returns `[]` on any request failure or thrown error (never throws).
- Satisfies: FR-004

## `musicbrainz-provider.ts` (new)

```ts
export interface MusicBrainzProviderConfig {
  userAgent: string;
}

export class MusicBrainzProvider {
  readonly providerName: "musicbrainz";
  constructor(config: MusicBrainzProviderConfig, fetchImpl?: typeof fetch);
  fetchOriginalReleaseDate(query: AlbumLookupQuery): Promise<string | null>;
}
```

- Returns the first release-group result whose `first-release-date` is a full `YYYY-MM-DD` value;
  `null` if none qualify or the request fails.
- Satisfies: FR-007, FR-008

## `ingest-album.ts` (modified)

```ts
export interface IngestionProviders {
  // ...existing fields unchanged...
  musicbrainz: Pick<MusicBrainzProvider, "providerName" | "fetchOriginalReleaseDate">; // NEW
}
```

- `ingestAlbum` calls `providers.musicbrainz.fetchOriginalReleaseDate(query)` alongside the existing
  parallel provider calls, then applies `earlierFullDate(catalogReconciledDate, musicbrainzDate)` to
  the final `releaseDate.value` before returning `IngestedAlbum`.
- Satisfies: FR-007, FR-008

## `album-context.ts` (modified, no exported-type change to `AlbumContextDeps`)

- `generateAllFacets` now calls `deps.findHistoricalEvents(album.release_date)` only when
  `"world_context"` is present in that view's `facetsToGenerate`; otherwise passes `[]` without
  calling it.
- Satisfies: FR-004, FR-005

## `narrative.ts` (modified, no exported-type change)

- `FACET_FOCUS.world_context`'s instruction text now also requires `kind: "interpretation"` and an
  empty `sourceIds`, matching the same reasoning already applied to `album_summary`: the historical
  events supplied are background grounding, not a citable source excerpt with an id the model could
  reference.
- Satisfies: FR-004 (makes the grounding usable without failing citation validation)

## `publishing-gate.ts` (modified)

```ts
export function validateStatements(
  statements: NarrativeStatement[],
  sourceTexts: string[]
): ValidationResult;
// unchanged signature — internal behavior only: now also flags a statement matching a known
// refusal phrase ("não há fontes", "não foi possível encontrar", etc.) as invalid.
```

- Satisfies: FR-006

## `narrative-article.ts` (modified)

```ts
createPending(albumId: string, facet: NarrativeFacet): Promise<NarrativeArticleRow>;
// unchanged signature — now recovers from a unique-violation (23505) on (album_id, facet) by
// fetching and returning the row a concurrent request already created, instead of throwing on
// `undefined`.
```

- Satisfies: FR-011

## `client.ts` (modified)

```ts
complete(prompt: string): Promise<string>;
// unchanged signature — now calls console.error naming both the failed primary model and the
// fallback model before retrying with the fallback.
```

- Satisfies: FR-010

## `InfluenceList.tsx` (modified, same props)

- Renders an explicit "Nenhuma influência registrada para este álbum." message when `influences` is
  empty, instead of returning `null`.
- Satisfies: FR-009

## Cross-cutting contract rules

- No prop or field introduced here is ever sourced from user input — all of it comes from external
  provider responses, consistent with the constitution's Server-Action/mutation discipline.
- No new Server Action, Route Handler, or Supabase table/RLS policy is introduced by this feature.
- Every new external call (Deezer, Wikidata, MusicBrainz) degrades to an empty/null result on
  failure rather than throwing, matching every existing provider's posture in this codebase.
