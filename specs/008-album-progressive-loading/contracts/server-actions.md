# Contracts: Server Actions

This app has no public API surface (per constitution Principle I, frontend code only reaches
data through Server Actions). The "contracts" for this feature are the two Server Action entry
points that replace the current single `getAlbumContext(albumId)`.

## `getAlbumTechnicalSheet(albumId: string)`

Replaces the technical-data half of today's `getAlbumContext`. Called once, awaited by the album
page's Server Component before it renders.

**Behavior**: finds the album; if missing, ingests it (existing `ingestAlbum` +
persist-credits/tracks/performance-records path); returns the technical sheet. Never triggers or
awaits AI narrative generation.

**Returns**:
```ts
type TechnicalSheetResult =
  | { state: "ready"; header: AlbumContextHeader; tracks: TrackRow[]; credits: CreditRow[];
      performance: PerformanceRecordRow[] | null; sameEraAlbums: SameEraAlbumRef[];
      otherAlbumsByArtist: OtherAlbumEntry[]; recommendations: RecommendationEntry[] }
  | { state: "not_found" }
  | { state: "error"; message: string };
```

`recommendations` is included here (not in `NarrativeResult` below) because
`resolveRecommendations`/`deriveRecommendations` (`album-context.ts:397-422`) are rule-based —
derived deterministically from existing catalog data, not from an AI call — so they belong with
the technical sheet and don't need to wait on narrative generation.

**Errors**: catalog/provider failures during ingestion surface as `{state:"error"}` rather than
throwing, so the page can render spec.md FR-006's error state instead of crashing.

## `getAlbumNarrative(albumId: string)`

Replaces the AI-generation half of today's `getAlbumContext`. Called by a Client Component on an
interval after the page has rendered with the technical sheet. Triggers generation on first call
if not already started; on subsequent calls, reports current status without re-triggering.

**Behavior**: mirrors the existing facet resolve-or-generate-or-pending logic
(`assembleAlbumContext` lines 465-490 today), but is invoked independently of, and later than,
`getAlbumTechnicalSheet`. Enforces a per-authenticated-user rate limit (constitution Principle
III) since it can trigger Groq/Gemini calls.

**Returns**:
```ts
type NarrativeResult =
  | { state: "not_started" }
  | { state: "in_progress" }
  | { state: "ready"; artistMoment: NarrativeStatement[]; worldContext: NarrativeStatement[];
      receptionVsLegacy: NarrativeStatement[]; summary: NarrativeStatement[];
      curiosities: CuriosityRow[]; influence: InfluenceEntry[] }
  | { state: "error" };
```

**Polling contract**: the client polls this action on a fixed interval while `state` is
`"not_started"` or `"in_progress"`, and stops polling once `state` is `"ready"` or `"error"`.
Each individual section within a `"ready"` result may still be empty if its specific facet ended
in `failed_validation` (per spec FR-007) — the client renders that as a per-section error/retry
state, not as a reason to keep polling the whole group.
