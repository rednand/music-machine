# Implementation Plan: Discover Page Hero & Spotlight Restyle

**Branch**: `005-acervo-hero-redesign` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-acervo-hero-redesign/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Restyle the existing Discover ("Acervo") page's hero section to match a new reference layout,
without changing any data, search behavior, or other page. Three presentation-only changes: (1)
the hero headline becomes a two-line display title with an accent-colored second line and an
italic tagline, replacing the current single-sentence headline; (2) the featured-albums visual
becomes an overlapping, tilted card stack (artist + year printed on each card, up to 4 cards)
replacing the flat 2×2 cover grid, and the album/artist count badges are removed; (3) the "O
acervo" collection list shows a 2-entry preview by default with a "ver o acervo inteiro" action
that reveals the rest of the already-fetched collection in place. All existing data (`DiscoveryPageEntry`,
`buildDiscoveryPage`), routes, and the left rail/ticker/list-item styling are unchanged.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16 (App Router) — fixed by the project constitution.

**Primary Dependencies**: Tailwind CSS 4, shadcn/ui-based primitives (`components.json`), `lucide-react` for icons — no new dependency required.

**Storage**: N/A — this feature is presentation-only; it consumes the existing `DiscoveryPageEntry[]` already returned by `buildDiscoveryPage` (`app/lib/discovery/collection.ts`) with no schema or query changes.

**Testing**: Vitest + Testing Library, per the constitution's co-located test convention (`Component.tsx` + `Component.test.tsx`).

**Target Platform**: Web (server-rendered Next.js App Router page, responsive down to mobile widths).

**Project Type**: Single Next.js web application (existing project — no new project/service).

**Performance Goals**: No new performance targets; the page must keep rendering as a fast server-rendered response (no added client-side data fetching, no layout-shift regressions from the restyle).

**Constraints**: Must not change search behavior, routing, album data, or the left rail/ticker/collection-card styling (spec FR-010); must degrade gracefully for 0/1/few/many albums (spec edge cases).

**Scale/Scope**: One page (`app/(public)/page.tsx`) and its two hero-adjacent components (`FeaturedAlbumCard.tsx`, `CollectionList.tsx`); no other route is touched.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Unified Next.js App Router Stack** — PASS. Change stays inside the existing Next.js app; no
  new service; the collection preview's "show the rest" interaction can be done as client-side
  state within the existing Server Component page (no new fetch, no new Server Action needed since
  the full collection is already fetched server-side).
- **II. Supabase as the Backend Platform** — PASS (N/A). No data access changes; feature consumes
  already-fetched data.
- **III. Server Actions for All Mutations** — PASS (N/A). No mutations introduced; this is a
  read-only, presentation-only feature.
- **IV. Disciplined AI Integration via Groq** — PASS (N/A). No AI/LLM usage added.
- **V. Test-First & Mandatory Coverage** — PASS, actionable. Modified/new components
  (`page.tsx`, `FeaturedAlbumCard.tsx`, `CollectionList.tsx`, and any new small subcomponent for
  the card stack / preview toggle) each keep or gain a co-located `*.test.tsx`; coverage must not
  regress below 80%.
- **VI. Serena-First Code Intelligence** — PASS, actionable. Implementation must use Serena MCP
  tools for symbol lookup/navigation while touching these files rather than plain grep.
- **VII. Observability & Security Rails** — PASS (N/A). No new secrets, endpoints, uploads, or
  error-monitoring surface; existing Sentry instrumentation is untouched.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/005-acervo-hero-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/(public)/
├── page.tsx                    # Discover page — hero + featured stack + collection preview (modified)
└── page.test.tsx               # co-located test (modified)

components/
├── FeaturedAlbumCard.tsx        # single card in the featured stack (modified: tilt/overlay treatment)
├── FeaturedAlbumCard.test.tsx   # co-located test (modified)
├── CollectionList.tsx           # collection entries list (modified: preview + "ver o acervo inteiro")
├── CollectionList.test.tsx      # co-located test (modified)
└── (optional) FeaturedAlbumStack.tsx + .test.tsx   # new small component if the stack's overlap/tilt
                                                     # layout logic warrants extraction from page.tsx

app/lib/discovery/collection.ts  # existing DiscoveryPageEntry / buildDiscoveryPage — unchanged
```

**Structure Decision**: Single existing Next.js App Router project (per constitution Principle
I) — no new project, package, or route. All changes are confined to the Discover page and its two
existing presentational components, plus one optional new presentational component if the
featured-stack markup is complex enough to warrant its own file; every touched/added component
keeps its test co-located per Principle V.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — the Constitution Check above passed with no exceptions, so this table is
intentionally empty.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 (data-model.md, contracts/component-props.md, quickstart.md): the
design keeps `CollectionList` as the only component that becomes a Client Component (for the
preview-expansion `useState`), which is a normal, already-established pattern in this codebase
(e.g., `AppShell.tsx` is already `"use client"`) and does not introduce a Server Action, API route,
data-access change, or new dependency. All seven gates above still PASS with no new exceptions.
