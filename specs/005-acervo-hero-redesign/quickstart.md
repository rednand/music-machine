# Quickstart: Discover Page Hero & Spotlight Restyle

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/component-props.md](./contracts/component-props.md)

## Prerequisites

- Dependencies installed: `npm install`
- A local Supabase-backed catalog with at least a few albums (or seed/mock data per the project's
  existing test setup) to exercise the "many albums" path; no new environment variable or service
  is required by this feature.

## Run

```bash
npm run dev
```

Open the Discover page at `/`.

## Validation scenarios (map to spec Acceptance Scenarios)

1. **Hero restyle (User Story 1)**
   - Load `/` with a non-empty catalog.
   - Confirm the `<h1>` renders two lines — first line neutral color, second line accent
     (`#d1145a`) — followed immediately by an italic tagline, then the existing description
     paragraph and search bar.
   - Submit a search (artist/album/year already known) and confirm existing search navigation is
     unaffected.
   - Resize to a mobile width (e.g., 375px) and confirm the title/tagline stay readable, with no
     clipping or overlap.

2. **Featured card stack (User Story 2)**
   - With 4+ albums in the catalog, confirm the featured area shows an overlapping, tilted stack
     of up to 4 cards, each labeled with artist name and release year.
   - Click each card and confirm it navigates to `/albums/[albumId]` for that entry.
   - Confirm the previous album-count/artist-count pill badges are gone.
   - Reduce the catalog to exactly 1 album (or seed a fresh empty catalog and add one) and confirm
     the stack shows that single card without broken/placeholder siblings.

3. **Collection preview (User Story 3)**
   - With more than 2 albums in the catalog, confirm "O acervo" shows exactly 2 entries plus a
     "ver o acervo inteiro" action.
   - Activate that action and confirm every remaining album becomes visible in place.
   - Reduce the catalog to 2 or fewer albums and confirm every album is shown with no "ver o
     acervo inteiro" action present.

4. **Empty catalog**
   - With zero albums, confirm the existing empty state renders (no empty card stack, no dead-end
     preview action).

## Automated checks

```bash
npm run test        # Vitest — includes co-located tests for page.tsx, FeaturedAlbumCard, CollectionList
npm run test:coverage  # must not regress below 80% per constitution Principle V
npm run lint
```
