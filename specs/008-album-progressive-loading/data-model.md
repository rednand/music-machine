# Data Model: Album Progressive Loading

No new persisted tables or columns are introduced. This feature re-sequences and re-exposes
existing data; the entities below describe the shapes the split entry points return, built from
data that already exists in Supabase/Postgres.

## Album Technical Sheet

Represents the factual, catalog-sourced data for an album — available first, independent of AI
generation.

- **Source tables**: `albums`, `artists`, `tracks`, `credits`, `performance_records` (all
  existing; see `app/lib/db/album.ts`, `app/lib/db/performance-record.ts`).
- **Fields**: title, artist name, release date, genre, label, duration, cover art URL, track
  count, tracklist (ordered tracks), credits, performance records, discography (same-era albums,
  other albums by the artist), and recommendations (rule-derived via `deriveRecommendations`, not
  AI-generated, so grouped here rather than with the narrative sections below).
- **Lifecycle**: `not_found` (album doesn't exist) → ingested-if-missing (via `ingestAlbum` +
  `persistCredits`/`persistTracks`/`persistPerformanceRecords`) → `ready`. Does not have a
  `pending` state of its own in the sense the narrative does — ingestion either completes or
  fails outright (see Edge Cases in spec.md).

## AI-Generated Narrative Sections

The written content produced for an album: artist context (`artist_moment`), world context
(`world_context`), musical scene (`musical_scene`), reception & legacy
(`reception_vs_legacy`), summary (`album_summary`), plus curiosities and influence.

- **Source tables**: `narrative_articles` (+ its statements table), `curiosities`, `influences`
  (all existing; see `app/lib/db/narrative-article.ts`, `app/lib/db/curiosity.ts`,
  `app/lib/db/influence.ts`).
- **Fields**: per-facet `NarrativeStatement[]`, curiosities list, influence list.
- **Lifecycle** (per facet, already modeled by `narrative_articles.status`): `stale`/absent
  (`not_started`) → `pending` (`in_progress`) → `published` (`ready`) or `failed_validation`
  (`failed`). This feature treats the 4 facets + summary + curiosities + influence as one group
  (per research.md Decision 1): the group's *effective* status is `in_progress` if any member is
  `pending`, `ready` once every member has reached a terminal state (`published` or
  `failed_validation`), and never reported to the page as a half-finished mix of the two.

## Generation Status (derived, not persisted)

A read-only view computed on each call from the `narrative_articles` rows above — not a new
table. Used by the narrative entry point to tell the page/poller what to render.

| Status | Meaning | Derived from |
|--------|---------|--------------|
| `not_started` | No generation has been triggered yet for this album | All 5 facet rows absent |
| `in_progress` | Generation triggered, at least one facet still `pending` | Any of the 5 rows `status = "pending"` |
| `ready` | Every facet reached a terminal state | All 5 rows `status` in (`published`, `failed_validation`) |

The existing per-facet distinction between `published` and `failed_validation` is preserved and
surfaced to the page so individual sections that failed validation can still show their own
empty/error state (per spec FR-007), even though the group's overall status is `ready`.
