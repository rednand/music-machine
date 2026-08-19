# Contract: Component Props

**Date**: 2026-08-18 | **Data model**: [../data-model.md](../data-model.md)

This feature has no external interface (no new/changed Server Action, Route Handler, or API) — see
Technical Context. The only "contracts" are the internal component prop shapes below, listed
because their signatures constrain the implementation tasks and tests.

## `<FeaturedAlbumCard>` (modified) — `components/FeaturedAlbumCard.tsx`

```ts
type FeaturedAlbumCardProps = {
  entry: DiscoveryPageEntry;
  index: number; // NEW — position within the stack (0-based), looks up a fixed left/top/width/rotate layout
};
```

- **Change from current**: adds `index`, used to look up one of 4 fixed absolute-position layouts
  (left/top/width/rotate) copied from the reference mockup, so the stack reads as a scattered stack
  of trading cards. `entry`'s shape, the below-cover artist/year label row, and the `Link` to
  `/albums/[albumId]` are unchanged from the pre-existing component.
- Satisfies: FR-003, FR-004, FR-005

## `<CollectionList>` (modified) — `components/CollectionList.tsx`

```ts
type CollectionListProps = {
  entries: DiscoveryPageEntry[];
  previewCount?: number; // NEW — default 2 (research.md §3)
};
```

- **Change from current**: becomes a Client Component; when `entries.length > previewCount`,
  renders only the first `previewCount` entries plus a "ver o acervo inteiro" action that reveals
  the rest in place (no new network request — `entries` is already fully provided by the caller).
  Existing per-entry markup (thumbnail, year · artist, title, hook) is unchanged.
- Satisfies: FR-007, FR-008, FR-009

## `app/(public)/page.tsx` (modified, Server Component — no prop contract, entry point)

- Removes the album-count/artist-count badge block (FR-006).
- Restyles the `<h1>` headline into the two-line/tagline structure (FR-001, FR-002 — description
  paragraph and `<SearchForm />` remain unchanged, unmoved).
- Passes `index` to each `<FeaturedAlbumCard>` in the existing `covers` map; passes the
  full `result.collection` to `<CollectionList>` (no slicing at this layer — slicing now happens
  inside `CollectionList` per its new `previewCount` contract).

## Cross-cutting contract rules

- No prop introduced here is ever sourced from user input beyond navigation (`index` and
  `previewCount` are derived from server-fetched data or fixed defaults) — no new
  validation/sanitization surface.
- No new Server Action, Route Handler, or Supabase query is introduced by this feature.
