# Implementation Plan: Music Context — Historical & Cultural Discovery

**Branch**: `001-music-context-discovery` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-music-context-discovery/spec.md`

## Summary

Music Context lets a user search for an artist, album, or standalone track and open a
context page that narrates the artist's career moment, the surrounding music scene, a
release timeline, chart/sales performance (when available), critical reception, legacy,
and contemporaneous albums — plus decade/period browsing, temporal exploration, two-album
comparison, and non-similarity recommendations. The MVP is delivered as a single responsive
web application (no native mobile app) backed by a Node.js/TypeScript service that
aggregates structured data from Spotify, MusicBrainz, Last.fm, Discogs, and Wikidata/
Wikipedia through per-provider adapters, persists normalized data and AI-synthesized,
source-attributed narratives ("ContextArticle") in PostgreSQL, and uses a cache layer to
respect provider rate limits and avoid redundant AI regeneration. GPT is used strictly as a
synthesis/narrative layer over already-gathered, cited structured data — never as a primary
source — and publishes fully automatically, backed by automated (not human) validation
gates. All UI and generated narrative content ships in pt-BR by default.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (backend); TypeScript 5.x with React
18 (frontend)

**Primary Dependencies**: Backend — Fastify (HTTP), Prisma (PostgreSQL ORM), ioredis
(cache), an OpenAI-compatible GPT SDK, per-provider HTTP client adapters (Spotify,
MusicBrainz, Last.fm, Discogs, Wikidata/Wikipedia). Frontend — Vite, React Router, TanStack
Query, Tailwind CSS.

**Storage**: PostgreSQL (system of record for normalized catalog data, sources, and
generated ContextArticles, per constitution Principle V) + Redis (short/medium-lived cache
for external API responses and rate-limit bookkeeping; not a system of record)

**Testing**: Backend — Vitest for unit/service tests, Supertest for API contract tests
against a test PostgreSQL/Redis instance. Frontend — Vitest + React Testing Library for
component/unit tests, Playwright for end-to-end acceptance scenarios. All per constitution
Principle I (mandatory coverage for everything created).

**Target Platform**: Responsive web application (desktop, tablet, mobile browsers) per
FR-027; containerized Node.js service deployed on Linux; no separate native mobile app, per
the explicit MVP exclusion in FR-028.

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Search results returned in ≤ 500ms p95 for cached/common queries;
a fully-cached context page renders all sections in ≤ 2s p95; an ungenerated context page
(first-ever view, requiring live aggregation + AI synthesis) completes in ≤ 12s p95 before
falling back to a "still preparing" state rather than blocking indefinitely.

**Constraints**: Must respect each external provider's documented rate limits with
backoff/caching (Principle IV); must never fabricate facts, must trace every factual claim
to a stored Source (Principle III, FR-015); must not store full lyrics or copied review
text (FR-023, FR-024); must retain license/attribution metadata for Wikidata/Wikipedia-
sourced content end-to-end (FR-026); all interface and generated narrative content in pt-BR,
translated/synthesized from source-language material while preserving attribution to the
original-language source (FR-030); publishing is fully automatic — no human-review gate —
so automated validation (citation completeness, banned-content checks) is the only quality
gate before a ContextArticle goes live (per the resolved FR-029 clarification).

**Scale/Scope**: MVP scope; broad historical catalog (~1960s–present) with best-effort depth
per release (per spec Assumptions); fully anonymous usage, no accounts (per spec
Assumptions); single-region deployment sized for low-to-moderate concurrent traffic (order
of thousands of daily sessions), not designed yet for high-concurrency scale-out.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Test-First & Mandatory Coverage | Every planned component (backend services, adapters, frontend pages/components) has a corresponding test layer in Project Structure below | PASS |
| II. Serena-First Code Intelligence | Process constraint on implementation, not a design artifact; carried forward as an implementation-phase workflow rule, not something `/speckit-plan` outputs a design for | PASS (N/A to design artifacts) |
| III. Grounded AI Generation | Data model includes `Source` and `ContextArticle` with fact/interpretation/opinion separation and per-claim source linkage (see data-model.md); AI pipeline design (research.md) requires structured-data grounding before any generation call | PASS |
| IV. External API & License Compliance | Per-provider adapter layer + Redis-backed rate-limit/caching strategy (research.md); `Source` entity carries license/attribution metadata (data-model.md) | PASS |
| V. Fixed Persistence, Flexible Delivery Stack | PostgreSQL selected as sole persistence layer; React (web) selected for frontend; Node.js selected for backend — one consistent option per component, per the constitution's allowed choices | PASS |

No violations requiring justification; Complexity Tracking is not needed.

**Post-Design Re-Check** (after Phase 1 data-model.md/contracts/quickstart.md): `Source` and
`ContextArticle` entities and the `api.md` contract both enforce per-statement source
linkage and license/attribution fields exactly as required by Principles III/IV; no new
gate violations were introduced by the detailed design. Status remains PASS across all five
principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-music-context-discovery/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/            # Entities, value objects, domain rules (framework-free)
│   ├── providers/         # One adapter per external source: spotify/, musicbrainz/,
│   │                       lastfm/, discogs/, wikidata/ — each implements a shared
│   │                       provider interface so new sources plug in without touching
│   │                       domain code
│   ├── ingestion/          # Normalization + source-priority reconciliation pipeline
│   ├── ai/                 # Grounded narrative synthesis pipeline (prompt assembly,
│   │                       fact/interpretation/opinion tagging, citation binding,
│   │                       pt-BR translation/synthesis step)
│   ├── services/           # Application services: search, context-page assembly,
│   │                       temporal exploration, comparison, recommendations
│   ├── cache/               # Redis-backed cache + rate-limit bookkeeping
│   ├── repositories/        # Prisma-backed persistence for domain entities
│   └── api/                 # Fastify routes/controllers (see contracts/)
└── tests/
    ├── contract/            # Per-endpoint contract tests (see contracts/)
    ├── integration/         # Provider adapters, ingestion pipeline, AI pipeline
    └── unit/                # Domain rules, reconciliation logic, services

frontend/
├── src/
│   ├── pages/               # Search, Album/Track context, Period explorer, Compare,
│   │                       Home
│   ├── components/          # Header, Timeline, ReceptionList, ChartPerformance,
│   │                       SameEraList, RecommendationCard, DecadeNav, etc.
│   └── services/            # API client (TanStack Query hooks) — never calls external
│                            provider APIs directly, only the backend (Principle IV /
│                            "no direct frontend-to-external-API coupling")
└── tests/
    ├── unit/                 # Component tests
    └── e2e/                  # Playwright acceptance scenarios per spec User Stories
```

**Structure Decision**: Web application split into `backend/` (Node.js/TypeScript, Fastify,
Prisma, PostgreSQL, Redis, per-provider adapters, AI pipeline) and `frontend/` (React,
TypeScript, Vite). The frontend only ever calls the backend's own API (see
`contracts/api.md`); it never calls Spotify/MusicBrainz/Last.fm/Discogs/Wikidata directly,
satisfying the constitution's adapter-isolation requirement and the spec's "don't couple
frontend to external APIs" architecture note.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
