# Research: Music Context — Historical & Cultural Discovery

**Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Each item below resolves one technical decision required by the Technical Context in
plan.md. The constitution fixes some choices (PostgreSQL; frontend must be React or React
Native; backend must be Java/Spring Boot or Node.js; GPT for AI). Where the constitution
allows a choice between two options, that choice is resolved here.

## 1. Frontend: React (web) vs. React Native

- **Decision**: React (web), responsive across desktop/tablet/mobile browsers.
- **Rationale**: The spec explicitly excludes a separate native mobile app from the MVP
  (FR-028) and requires desktop/tablet/mobile support via one responsive surface (FR-027).
  React Native would only make sense if a native app were in scope.
- **Alternatives considered**: React Native — rejected for MVP because it targets native
  apps, which are out of scope; can be revisited post-MVP without changing the backend or
  domain layer, since the constitution already scopes frontend choice per-component.

## 2. Backend: Node.js vs. Java/Spring Boot

- **Decision**: Node.js 22 LTS with TypeScript.
- **Rationale**: The backend's core job for the MVP is I/O-bound orchestration — calling
  five external providers concurrently, applying backoff/rate-limit handling, and streaming
  GPT synthesis calls — which fits an async, event-loop runtime well and favors fast
  MVP iteration. Java/Spring Boot remains a legitimate constitution-allowed alternative if
  the system later needs heavier compute-bound processing or stricter enterprise tooling;
  the adapter/domain separation in Project Structure keeps that migration path open.
  Node.js and Java Spring Boot were the only two options; Java Spring Boot's added
  operational overhead (JVM startup, more verbose HTTP client boilerplate for 5 concurrent
  providers) was not justified for an MVP whose bottleneck is external API latency, not raw
  compute.

## 3. HTTP framework: Fastify vs. Express

- **Decision**: Fastify.
- **Rationale**: Built-in JSON schema validation matches the need for well-defined API
  contracts (see contracts/api.md) and has materially better throughput for a service that
  is mostly proxying/aggregating I/O.
- **Alternatives considered**: Express — larger ecosystem but no built-in schema validation
  and slightly higher per-request overhead; not enough benefit over Fastify for this
  project's needs.

## 4. Persistence access: Prisma vs. raw SQL/TypeORM

- **Decision**: Prisma ORM against PostgreSQL.
- **Rationale**: Typed schema/migrations reduce mapping bugs across the fairly large entity
  set (Artist, Album, Track, Release, Chart, ChartEntry, Review, HistoricalEvent,
  TimelineEvent, Source, ContextArticle, Recommendation) and integrate cleanly with
  TypeScript across the repository layer.
- **Alternatives considered**: Raw SQL — more control but higher boilerplate/error surface
  for this many entities; TypeORM — less mature migration story than Prisma at present.

## 5. Cache layer: Redis

- **Decision**: Redis, used for (a) short-lived caching of raw external-provider responses,
  (b) per-provider rate-limit/backoff bookkeeping, and (c) fast-path lookup of whether a
  ContextArticle already exists before triggering regeneration.
- **Rationale**: Directly supports Principle IV (rate-limit handling) and FR-018 (reuse
  stored narratives instead of regenerating), and the "avoid unnecessary external calls"
  non-functional goal from the product brief.
- **Alternatives considered**: In-process memory cache only — rejected because it would not
  survive process restarts/multiple instances and would not share rate-limit state across
  instances.

## 6. AI provider and grounding pipeline

- **Decision**: GPT (OpenAI-compatible Chat/Responses API), invoked only after structured
  data + sources for a subject have been gathered, normalized, and reconciled. The prompt
  is assembled from that structured payload plus the resolved source excerpts; the model is
  instructed to tag each statement as confirmed fact / interpretation / critical opinion /
  unconfirmed, and to attach a source reference to every factual statement. The
  pt-BR translation/synthesis happens as part of this same generation step (not a separate
  generic translation pass), so attribution to the original-language source survives
  translation.
- **Rationale**: Directly implements Principle III (Grounded AI Generation) and FR-013/
  FR-014/FR-015/FR-030. Folding translation into the synthesis step (rather than
  translating raw source text first) avoids double-translation drift and keeps a single
  place where attribution is attached.
- **Alternatives considered**: Translating source material up front with a generic
  translation API, then synthesizing in pt-BR — rejected because it adds a second lossy
  transformation step and a second place attribution could be dropped.

## 7. Publishing gate for AI-generated content

- **Decision**: Fully automatic publishing (per product decision on FR-029) gated only by
  automated checks: every factual statement must resolve to a stored `Source`; banned-
  content checks reject output containing full lyrics or copied review text; schema
  validation enforces the fact/interpretation/opinion/unconfirmed tagging structure. Any
  ContextArticle failing these automated checks is held in a `pending`/`failed` state and
  not shown to users, rather than being shown incomplete.
- **Rationale**: Matches the explicit product decision (no human review gate) while still
  enforcing Principle III/FR-015 mechanically instead of relying on manual review.
- **Alternatives considered**: Human-in-the-loop review before first publish — this was the
  initially-flagged option but was explicitly rejected by the product owner in favor of full
  automation.

## 8. Source-priority reconciliation

- **Decision**: A deterministic priority-ordered reconciliation step in the ingestion
  pipeline (`backend/src/ingestion/`) applies the order from FR-017 (official/primary >
  recognized music databases > journalistic outlets > interviews > specialized publications
  > Wikipedia/Wikidata) per fact. When two sources at the same priority tier disagree, both
  are retained and surfaced as a noted discrepancy rather than silently discarding one.
- **Rationale**: Implements FR-017 and the "sources disagree" edge case from spec.md
  mechanically and auditably, and keeps the reconciliation logic in the domain/ingestion
  layer rather than inside AI prompts, so it can be unit-tested independently of GPT calls.
- **Alternatives considered**: Letting the AI arbitrate conflicting sources at generation
  time — rejected because it would make source-priority behavior untestable and
  non-deterministic.

## 9. Historical-event curation

- **Decision**: For a given release or period, historical events are scored for relevance
  (recency to the release date, category diversity, and a minimum "notability" signal from
  the source data) and capped per category (a small fixed maximum per category per
  request) rather than listing everything available.
- **Rationale**: Directly implements FR-011/FR-012 and the explicit "context, not
  encyclopedia" product goal.
- **Alternatives considered**: Showing all matched events within a date window — rejected;
  this is exactly the "random list of historical facts" outcome the spec explicitly warns
  against.

## 10. Chart, sales, and certification data — coverage risk

- **Decision**: Best-effort sourcing of chart positions, certifications, and sales figures
  primarily from structured Wikidata statements and Wikipedia infobox data associated with
  an album/single, since none of the five approved providers (Spotify, MusicBrainz, Last.fm,
  Discogs, Wikidata/Wikipedia) is a dedicated charts/certifications data source (e.g., no
  Billboard or RIAA API is in scope). When no such data is found, the "Nas paradas" /
  performance section is omitted per FR-007, not fabricated or approximated.
- **Rationale**: Keeps the provider set to what the constitution/spec explicitly named while
  being honest about a real coverage gap; FR-007 already requires graceful omission, so this
  is a documented limitation rather than a blocker.
- **Risk flagged for stakeholders**: Chart/certification/sales coverage will be inconsistent
  across releases, especially for less-documented ones; this should be re-evaluated post-MVP
  if a dedicated charts data source becomes available/licensable.

## 11. Frontend data layer and styling

- **Decision**: TanStack Query for server-state fetching/caching against the backend API;
  Tailwind CSS for styling.
- **Rationale**: TanStack Query gives request-level caching/retry aligned with the "avoid
  unnecessary calls" goal, on the frontend side of the boundary. Tailwind supports the
  "editorial, magazine-like" visual direction (large covers, custom typography, timeline/
  card layouts) called for in spec section 10 without fighting a heavier component-library
  design language.
- **Alternatives considered**: Redux/RTK Query — more ceremony than this app's data shape
  needs (mostly read-heavy, page-scoped fetches); a prebuilt component library (e.g. MUI) —
  rejected because its default look works against the "not overly corporate" editorial
  direction explicitly requested.

## 12. Testing strategy

- **Decision**: Backend — Vitest (unit/service), Supertest (contract, against
  `contracts/api.md`), and integration tests against a disposable PostgreSQL+Redis instance
  for adapters/ingestion/AI-pipeline plumbing (with the AI call itself mocked/stubbed).
  Frontend — Vitest + React Testing Library (component/unit), Playwright (end-to-end,
  covering the acceptance scenarios in spec.md's User Stories).
- **Rationale**: Satisfies Principle I (mandatory coverage for everything created) with a
  layer matched to each concern; contract tests keep frontend/backend integration honest
  against the documented API shape.
- **Alternatives considered**: Jest — Vitest chosen instead for native ESM/TS speed and
  consistency across both frontend and backend test runners.
