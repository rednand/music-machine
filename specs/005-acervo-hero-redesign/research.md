# Phase 0 Research: Discover Page Hero & Spotlight Restyle

All items in the Technical Context were resolvable directly from the project constitution and the
existing codebase (no external unknowns) — this document instead resolves the open *design*
decisions the spec left to planning (per its Assumptions section) plus the small implementation
questions needed before Phase 1.

## 1. Two-line hero title & tagline markup

- **Decision**: Render the headline as a single `<h1>` containing two `<span>`/block lines (one
  neutral-colored, one accent-colored `text-[#d1145a]`), followed by a separate italic tagline
  element — same pattern already used by the current `<h1>` in `app/(public)/page.tsx` (which
  already nests a `<span className="block ... text-[#d1145a]">`), just with updated copy/weights.
- **Rationale**: Keeps semantics correct (one visible page heading), reuses an existing, already-
  accessible pattern in this file rather than introducing a new heading structure.
- **Alternatives considered**: Two separate `<h1>`/`<p>` elements for each line — rejected, would
  either duplicate the top-level heading or misuse heading levels for a tagline.

## 2. Featured card stack implementation

- **Decision**: Extend `FeaturedAlbumCard` (or add a thin wrapper) to accept a per-card
  rotation/offset and render the artist name + year as an overlay inside the card (bottom area)
  instead of below it; the parent (`page.tsx`) lays out up to 4 cards with fixed relative
  offsets/rotations via Tailwind `rotate-*`/`translate-*` utility classes and `z-index`, capped at
  `covers.length` (already sliced to 4 in `page.tsx`).
- **Rationale**: Reuses the existing `FeaturedAlbumCard` + `covers` slice
  (`result.collection.slice(0, 4)`) already in `page.tsx` — only the visual treatment and label
  placement change, not the data selection, keeping FR-005's graceful-degradation behavior
  (fewer than 4 albums) automatic since it already maps over whatever `covers` contains.
- **Alternatives considered**: A brand-new `FeaturedAlbumStack` component owning its own data
  slicing — rejected as unnecessary duplication of logic `page.tsx` already has; only worth
  introducing if the JSX for positioning genuinely clutters `page.tsx` (left as an optional
  extraction in Project Structure, decided during implementation, not a functional change).

## 3. Collection preview + "ver o acervo inteiro"

- **Decision**: `CollectionList` takes an optional `previewCount` (default 2) and manages an
  internal "expanded" boolean via `useState`; when `entries.length > previewCount` and not
  expanded, it renders only the first `previewCount` entries plus a button/link that sets expanded
  to `true`, revealing the rest in place. This requires `CollectionList` to become a Client
  Component (`"use client"`), while `page.tsx` remains a Server Component passing it the already-
  fetched `result.collection`.
- **Rationale**: Satisfies FR-007/008/009 with the smallest change — no new route, no re-fetch,
  no server round-trip — consistent with the Assumption in the spec that "see full collection" can
  reveal data already fetched, in place.
- **Alternatives considered**: A dedicated `/acervo` route showing the full list — rejected as
  heavier than the spec requires (spec explicitly allows in-place reveal) and would need new
  routing/tests disproportionate to a visual-preview change; a URL query/hash toggle for
  shareable "expanded" state — rejected as unnecessary complexity not requested by the spec.

## 4. Removing the count badges

- **Decision**: Delete the `<div className="flex gap-[10px]">...</div>` badge block currently
  rendered beneath the featured grid in `page.tsx` (FR-006); no replacement element.
- **Rationale**: Directly matches the reference and FR-006; the counts are not referenced
  anywhere else on the page.
- **Alternatives considered**: Relocating the counts elsewhere on the page — rejected, not
  requested by the spec or shown in the reference; would be scope creep.

## 5. Responsive behavior for the tilted stack

- **Decision**: Keep the same `md:` breakpoint split already used for the hero's two-column grid
  in `page.tsx`; on narrow viewports the stack renders with reduced/no rotation and slightly
  smaller overlap (still via Tailwind responsive variants) so every card's artist/year label stays
  legible and the card remains individually tappable, per the spec's mobile edge case.
- **Rationale**: Reuses the existing responsive strategy already validated on this page rather
  than introducing a new breakpoint scheme.
- **Alternatives considered**: A horizontally-scrollable card row on mobile — plausible future
  refinement, but not necessary to satisfy the spec's requirement (cards remain legible/tappable);
  left out to avoid unrequested complexity.

**Output**: All open design questions resolved; no remaining `NEEDS CLARIFICATION` markers.
