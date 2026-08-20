# Contract: Internal Module Interfaces

**Date**: 2026-08-19 | **Data model**: [../data-model.md](../data-model.md)

This feature has no external HTTP interface (no new Server Action, Route Handler, or API) and no new
UI props — see plan.md Technical Context. The "contracts" below are the internal
provider/ingestion/AI function signatures that constrain the implementation tasks and their tests.

## `provider.interface.ts` (modified) — new track shape

```ts
export interface RawTrackData {
  title: string;
  position: string;        // raw Discogs position ("1", "A1", "2-3", etc.)
  durationSeconds?: number; // parsed from Discogs' "mm:ss", when present
  source: ProviderSourceRef;
}

export interface CreditsProviderAdapter {
  readonly providerName: string;
  fetchCredits(query: AlbumLookupQuery): Promise<RawCreditData[]>;
  fetchTracks(query: AlbumLookupQuery): Promise<RawTrackData[]>; // NEW
}
```

- Satisfies: FR-001, FR-003

## `discography-provider.ts` (modified)

- `DiscographyProvider.fetchTracks(query)`: performs the same search → release lookup already used
  by `fetchCredits`, and maps the release response's `tracklist` into `RawTrackData[]`. When the
  release has no `tracklist` (or no release is found at all — same "no results" path already handled
  for credits), returns `[]`.
- Satisfies: FR-001, FR-003

## `ingest-album.ts` (modified)

```ts
export interface IngestedAlbum {
  // ...existing fields unchanged...
  tracks: RawTrackData[]; // NEW
}

export interface IngestionProviders {
  // ...existing fields unchanged...
  discography: Pick<DiscographyProvider, "providerName" | "fetchCredits" | "fetchTracks">; // fetchTracks added
}
```

- `ingestAlbum` calls `providers.discography.fetchTracks(query)` alongside the existing parallel
  provider calls and includes the result under `tracks`.
- Satisfies: FR-001

## `app/lib/ai/curiosity-influence.ts` (new)

```ts
export interface SynthesizeFactsInput {
  albumTitle: string;
  artistName: string;
  sourceExcerpts: SourceExcerpt[]; // same shape already used by synthesizeNarrative
}

export interface GeneratedFactItem {
  text: string;
  kind: "fact";
  sourceIds: string[]; // length 0 or 1 — see data-model.md
}

export interface SynthesizeFactsResult {
  items: GeneratedFactItem[];
  generationFailed?: boolean;
}

export function synthesizeCuriosities(
  input: SynthesizeFactsInput,
  gptClient: ChatCompletionClient
): Promise<SynthesizeFactsResult>;

export function synthesizeInfluence(
  input: SynthesizeFactsInput,
  gptClient: ChatCompletionClient
): Promise<SynthesizeFactsResult>;
```

- Both functions build a dedicated prompt (distinct wording per research.md §2/§3, mirroring
  `narrative.ts`'s `buildPrompt` pattern) and parse the response with the same `extractJsonObject`
  defensive-parsing utility already used by `synthesizeNarrative`.
- Callers MUST run each item in `items` through the existing `validateStatements` gate
  (`publishing-gate.ts`) before persisting — this module does not duplicate that validation.
- Satisfies: FR-006, FR-007, FR-008, FR-009

## `album-context.ts` (modified, no exported-type change)

`AlbumContextDeps` gains the ability to persist what it already reads:

```ts
export interface AlbumContextDeps {
  // ...existing read methods unchanged (findTracks, findPerformanceRecords, findCuriosities, findInfluences)...
  persistTracks(albumId: string, tracks: RawTrackData[]): Promise<TrackRow[]>;         // NEW
  persistPerformanceRecords(albumId: string, records: RawPerformanceRecordData[]): Promise<PerformanceRecordRow[]>; // NEW
  persistCuriosities(albumId: string, items: GeneratedFactItem[], sourceExcerpts: SourceExcerpt[]): Promise<CuriosityRow[]>; // NEW
  persistInfluence(albumId: string, items: GeneratedFactItem[], sourceExcerpts: SourceExcerpt[]): Promise<InfluenceRow[]>;   // NEW
}
```

- `AlbumContextBody`'s existing `tracks`/`performance`/`curiosities`/`influence` fields are
  unchanged in shape — only their values change from always-empty/`null` to actually populated when
  source data supports it.
- Each new `persist*` call is gated by the existing-empty check (research.md §4) and isolated from
  the others' failures (research.md §5; FR-012).
- Satisfies: FR-001, FR-002, FR-004, FR-005, FR-010, FR-011, FR-012

## Cross-cutting contract rules

- No prop or field introduced here is ever sourced from user input — all of it comes from external
  provider responses or Groq completions over already-server-fetched source material, consistent
  with the constitution's Server-Action/mutation discipline.
- No new Server Action, Route Handler, or Supabase table/RLS policy is introduced by this feature.
