# Phase 1 Data Model: Discover Page Hero & Spotlight Restyle

This feature introduces **no new persisted entity, field, or query**. It only changes how already-
fetched data is presented. The two shapes below are the existing domain type this feature reads,
and the new (transient, unpersisted) UI state it introduces.

## Existing Entity (unchanged)

### `DiscoveryPageEntry` (`app/lib/discovery/collection.ts`)

| Field | Type | Notes |
|---|---|---|
| `albumId` | `string` | Used for navigation (`/albums/[albumId]`) and React `key`s. |
| `title` | `string` | Album title — shown on collection-list cards (unchanged). |
| `artistName` | `string` | Shown on both the featured-stack card overlay (new placement) and the collection list. |
| `releaseYear` | `string` | Shown on both the featured-stack card overlay (new placement) and the collection list. |
| `coverArtUrl` | `string \| undefined` | Background image for both the featured card and the list thumbnail; falls back to the existing striped placeholder when absent. |
| `hook` | `string \| null` | Collection-list one-line hook (unchanged; omitted when `null`, per existing FR-008 of spec 003). |

`buildDiscoveryPage()` continues to return `{ featured, collection: DiscoveryPageEntry[] }` (or
`{ state: "empty" }`) exactly as today. `page.tsx` continues to derive `covers =
collection.slice(0, 4)` for the featured stack and passes the full `collection` array to
`CollectionList` — no new server-side slicing, filtering, or query is introduced.

## New Transient UI State (not persisted)

### Collection preview expansion (`CollectionList`)

| State | Type | Owner | Notes |
|---|---|---|---|
| `isExpanded` | `boolean` (default `false`) | `CollectionList` (client-side `useState`) | Controls whether entries beyond `previewCount` are rendered. Reset on every full page load/navigation — no persistence across sessions or route changes, consistent with the product remaining fully anonymous with no saved preferences (spec.md Assumptions). |

No other component gains state. The featured card stack's tilt/offset per card is a static,
deterministic layout (index-based), not user- or data-driven state.

## Relationships

Unchanged: an `Album` (via its `DiscoveryPageEntry` projection) belongs to one `Artist`
(`artistName`) and is the sole subject of the featured-stack card and the collection-list entry
that represents it — no new relationship is introduced.
