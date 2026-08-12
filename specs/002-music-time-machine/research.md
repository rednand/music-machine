# Research: Music Time Machine

**Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

The v2.0.0 constitution fixes the platform (Next.js/Supabase/Groq) but deliberately dropped any
specific external-data-provider mandate. Each item below resolves one decision left open by the
constitution or the spec's Technical Context.

## 1. External data providers for album/artist/chart/award/historical content

- **Decision**: Reuse the same five source categories validated in this repository's earlier
  Music Context work — a music-catalog/metadata provider (artists, albums, tracks, credits,
  cover art), a discography/credits database (formats, labels, detailed personnel credits), a
  tags/popularity source, and a general-knowledge encyclopedia (biographical/contextual facts,
  historical events, with clear license/attribution metadata). Exact provider selection is an
  implementation detail resolved at integration time behind the `app/lib/providers/` interface,
  not pinned in the constitution.
- **Rationale**: These categories cover every data need in the spec (header credits, musical
  scene, world-at-the-time, curiosities, influence) without requiring a licensing agreement
  beyond each provider's public API terms.
- **Alternatives considered**: A single "all-in-one" music metadata API — rejected; no such
  provider covers catalog metadata, detailed physical-release credits, community tags, and
  general historical/biographical context all at once, so a provider-per-concern approach with a
  shared interface remains necessary.

## 2. Chart, certification, and award data — coverage risk (carried forward)

- **Decision**: Best-effort sourcing of chart positions, certifications, and awards/nominations
  primarily from the general-knowledge encyclopedia's structured statements and infobox-style
  data, since no dedicated Billboard/RIAA/Grammy API is assumed. When not found, the performance
  section is omitted per FR-007, never fabricated or approximated.
- **Risk flagged for stakeholders**: coverage will be inconsistent, especially for less-documented
  albums and smaller regional awards; re-evaluate if a licensable dedicated source becomes
  available.
- **Alternatives considered**: Manual curation of a small seed set of award/chart facts — viable
  as a stop-gap for the baseline catalog in SC-003, but not a substitute for a real pipeline; not
  adopted as the primary approach.

## 3. Narrative generation pipeline (Groq)

- **Decision**: A single wrapped Groq client (`app/lib/ai/client.ts`) is called only after
  structured data + source excerpts for an album have been gathered, normalized, and reconciled.
  The prompt is assembled from that structured payload; the model is instructed to return only a
  JSON object of per-section statements, each tagged fact / interpretation / critical_opinion /
  unconfirmed and carrying the source id(s) it draws from. The pt-BR phrasing happens as part of
  this same generation step, so translation and synthesis don't happen in two lossy passes.
  Response parsing extracts the JSON via a regex before `JSON.parse`, per constitution Principle
  IV (the model may wrap output in prose).
- **Rationale**: Matches constitution Principle IV exactly and the spec's FR-012–FR-014
  requirements (narrative prose, fact/interpretation/opinion/unconfirmed separation, mandatory
  source traceability) in one auditable place.
- **Alternatives considered**: Two-step "translate then synthesize" — rejected for the same
  reason as before: a second lossy transformation step and a second place attribution can be
  dropped.

## 4. Automated publishing gate

- **Decision**: A NarrativeArticle is validated automatically before it is marked published: every
  `fact`-kind statement must resolve to at least one stored Source; a banned-content check
  rejects output that reproduces full lyrics or near-verbatim review text; a schema check
  enforces the fact/interpretation/opinion/unconfirmed structure. Anything failing is held in a
  `failed_validation` state and not shown to users. No human-review step exists (per spec
  Assumptions).
- **Rationale**: Implements FR-014/FR-021 mechanically rather than relying on manual review,
  matching the product decision already made for this feature.

## 5. Source-priority reconciliation

- **Decision**: A deterministic priority order (official/primary sources and recognized music
  databases outrank general encyclopedic sources) is applied per fact in `app/lib/ingestion/`.
  When two similarly-authoritative sources disagree, both are retained and surfaced as a noted
  discrepancy (FR-016), never silently resolved.
- **Rationale**: Keeps conflict resolution testable and auditable outside of the AI call, exactly
  as required by FR-016 and the spec's "sources disagree" edge case.

## 6. Supabase schema and RLS for anonymous, read-only content

- **Decision**: Every table this feature introduces (Artist, Album, Track, Credit,
  PerformanceRecord, Review, HistoricalEvent, Curiosity, Influence, Source, NarrativeArticle) has
  RLS **enabled** with a public `SELECT` policy (anonymous read is the point of the product) and
  **no** `INSERT`/`UPDATE`/`DELETE` policy for the anon/authenticated roles — all writes happen
  exclusively through Server Actions using the service-role client.
- **Rationale**: Constitution Principle II's RLS mandate is written for user-owned rows, which
  this feature has none of (see plan.md's Constitution Check note), but enabling RLS with a
  read-only public policy is a strict superset of safety: it costs nothing and forecloses any
  future accidental anon-key write path, so it's adopted even though not strictly required yet.
- **Alternatives considered**: Leaving RLS off since there's no `user_id` to scope by — rejected;
  "off" would allow the anon key to write directly if ever exposed by mistake, whereas "on with
  read-only policy" costs nothing and closes that gap.

## 7. Caching and regeneration avoidance

- **Decision**: No separate cache infrastructure (e.g., Redis) is introduced. Two layers cover
  FR-017 and the "avoid unnecessary provider calls" goal: (a) Next.js's built-in fetch/data cache
  with a revalidation window for external-provider responses, and (b) the persisted
  NarrativeArticle/Source rows in Supabase themselves are the regeneration-avoidance cache — once
  `published`, an album's narrative is read from the database on every subsequent view instead of
  re-calling Groq.
- **Rationale**: Matches constitution Principle I (single unified Next.js stack, no unnecessary
  extra infrastructure) while still satisfying FR-017.
- **Alternatives considered**: A dedicated Redis cache (used in this repo's earlier, now-retired
  Music Context plan) — rejected here because the current constitution's stack list has no cache
  layer and the two mechanisms above are sufficient for this feature's read-heavy, anonymous
  access pattern.

## 8. Rate limiting the AI-backed Server Action

- **Decision**: Because content is shared across all users (not per-user chat), the dominant cost
  control is FR-017 itself — an album is only ever synthesized once. On top of that, the Server
  Action that triggers first-time generation for a never-before-seen album is rate-limited per
  client IP (a fixed cap per hour) to prevent a burst of simultaneous "cold" lookups from
  triggering many concurrent Groq calls.
- **Rationale**: Satisfies constitution Principle III's "AI-backed Server Actions MUST enforce a
  rate limit" without needing a `user_id` to scope by, since this feature has none.

## 9. "Same era" grouping and comparison

- **Decision**: The musical-scene section and the comparison feature default to a release-date
  proximity window of roughly ±1–2 years when no stronger signal (shared genre movement, direct
  influence) applies, matching the spec's Assumptions.
- **Rationale**: Consistent, simple, and already validated as a reasonable default for this kind
  of feature.

## 10. Cover art and asset licensing

- **Decision**: Cover art and any other media assets are displayed exactly as supplied by the
  chosen catalog provider under that provider's own terms of use for that purpose — never
  re-hosted, cropped, or repurposed beyond it.
- **Rationale**: Matches the spec's Assumptions and avoids a licensing exposure the product does
  not need to take on.
