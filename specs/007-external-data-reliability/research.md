# Phase 0 Research: Reliable External Data for Album Context

All decisions below were validated against the real, live external APIs before being implemented —
not assumed from documentation alone — following this project's established practice of testing
undocumented behavior empirically (e.g., the previous discography-cache feature discovered Spotify's
undocumented `limit` cap on `/v1/artists/{id}/albums` the same way).

## 1. Which catalog provider replaces Spotify?

- **Decision**: Deezer's public REST API (`api.deezer.com`) — no authentication, no app
  registration, no tiered access mode.
- **Rationale**: Live-tested `search/album`, `search/artist`, `artist/{id}/albums`, and
  `album/{id}/tracks` against real data (Korn's "Follow The Leader", Radiohead's "OK Computer").
  Confirmed accurate tracklists, full discographies (`record_type` cleanly distinguishes albums from
  singles), and even richer metadata than Spotify provided (label, genre) on the full album-details
  endpoint. Documented/community-confirmed rate limit (~50 requests/5s per IP) is generous, non-
  tiered, and requires no business registration — directly solving the blocking problem (Spotify's
  2026 policy changes).
- **Alternatives considered**:
  - Requesting Spotify Extended Quota Mode — rejected outright: as of the 2026 policy, it requires a
    legally registered business and 250k+ monthly active users, which a personal project cannot meet.
  - MusicBrainz as the *primary* catalog source — rejected for this role specifically; MusicBrainz
    models canonical release-groups well but its per-release track/media data is heavier to work with
    for a simple tracklist than Deezer's direct endpoint, and it lacks cover art. (MusicBrainz is
    still used, but for original-release-date correction only — see §3.)
- **Data-quality finding acted on**: Deezer's artist-name search can rank an unrelated, low-fan-count
  artist ahead of the real one for the same name (e.g., searching "Korn" surfaced a 6,717-fan artist
  before the real "KoЯn" at 2.6M fans). Mitigated by preferring the highest-fan-count candidate
  instead of the first result (spec.md FR-002).

## 2. Where do "O mundo" real historical events come from?

- **Decision**: Wikidata's public SPARQL endpoint (`query.wikidata.org/sparql`), querying for items
  with a `P585` (point in time) statement within a ±90 day window of the album's release date,
  filtered to day/month-precision dates only (excluding year-precision items like "1986" or an
  entire year's Formula 1 season, which would otherwise falsely cluster at January 1st), ranked by
  Wikidata sitelink count as a notability proxy, with a denylist for navigational "Month Year" and
  "deaths in Month Year" list-articles.
- **Rationale**: Live-tested against real album release dates spanning four decades (1986, 1998,
  2003, and a release in late 2025 only months old) and got genuinely relevant, accurate results
  every time — including for the near-current-date case, contradicting the initial assumption that
  Wikidata coverage would lag for very recent events.
- **Alternatives considered**:
  - Building a bespoke category classifier (política/cultura/tecnologia) server-side before handing
    events to the model — rejected once testing showed the existing "O mundo" prompt already asks the
    model to sort three fixed categories itself; handing it a flat, ranked list of real events and
    letting it organize them is simpler and needed no new categorization logic.
  - Broad `?event wdt:P31/wdt:P279* wd:Q1656682` (any subclass of "event") queries — rejected: timed
    out (504) on Wikidata's shared public endpoint. A narrower, date-first query pattern (§ above)
    returns in ~1-2 seconds.

## 3. How is a corrected original release date sourced?

- **Decision**: MusicBrainz's `release-group` search endpoint
  (`musicbrainz.org/ws/2/release-group`), reading `first-release-date` — a field MusicBrainz's data
  model specifically maintains as the canonical earliest release date across every pressing/reissue
  of a work, separate from any individual release's own date.
- **Rationale**: Live-tested against the exact failure case that surfaced it: Deezer's only catalog
  entry for Evanescence's "Fallen" is its 2014 reissue (distributed by a different company than the
  2003 original), so its `release_date` is 2014-06-24. MusicBrainz's release-group for the same album
  returned `first-release-date: 2003-03-04` — the correct original date — confirming this is exactly
  the problem MusicBrainz's release-group model exists to solve.
- **Alternatives considered**:
  - Feeding MusicBrainz's date into the existing tiered source-reconciliation system
    (`reconcileField`/`FactCandidate`) — rejected: that system resolves disagreement between
    equally-trusted sources by tier rank, then by "first value wins," which does not encode "always
    prefer the earlier of two fully-specified dates." A dedicated `earlierFullDate` comparison is a
    more precise fit for this specific, narrower correctness rule and does not risk changing
    behavior for every other reconciled field.
  - Trusting any MusicBrainz `first-release-date`, including year-only or year-month values —
    rejected: a partial date would either need to be padded with a fabricated day (e.g., January 1st)
    or stored as-is against a full-date database column; neither is acceptable, so partial dates are
    ignored and the catalog provider's own (already fully-specified) date is kept instead.

## 4. Why does rejecting AI refusals belong in the existing validation gate, not a new one?

- **Decision**: Extend `validateStatements` (`publishing-gate.ts`) with a phrase-based check for
  refusal statements ("não há fontes", "não foi possível encontrar", etc.), alongside its existing
  missing-citation and near-verbatim-copy checks.
- **Rationale**: Live-observed the actual failure in production data: once real historical-event
  grounding was added, the model stopped refusing for most albums, but a still-thin-context case
  (a 2025 release with sparse indexed history) produced a fluent-sounding refusal statement that
  otherwise passed every existing check (not a fact needing citation, not a verbatim copy). It is the
  same class of problem — content that should not be published — so it belongs in the same gate
  rather than a second, parallel check that callers would have to remember to also run.
- **Alternatives considered**: Detecting refusals with a second Groq call ("does this text refuse to
  answer?") — rejected as unnecessary cost and latency for a problem a plain substring/regex check
  already catches reliably in every observed case.

## 5. Why gate the historical-events fetch on "world_context specifically needs generation"?

- **Decision**: `generateAllFacets` only calls `findHistoricalEvents` when `world_context` is in the
  set of facets actually being (re)generated for that view — not whenever *any* facet needs
  regeneration.
- **Rationale**: Before this feature, the historical-events input was fetched unconditionally
  whenever generation ran at all (a leftover of when it was a hardcoded empty array with no real
  cost). Once it became a real network call, that would mean paying for it on every view that
  regenerates, say, only `musical_scene`, even though `world_context` was already published and
  would ignore the input entirely. Gating it to only the case that actually uses the data is a direct,
  low-risk efficiency fix.
- **Alternatives considered**: Caching historical events in a new database table keyed by date
  window — rejected as unneeded complexity; once `world_context` is published, its status is
  permanent (never regenerated) under this product's existing generate-once pattern, so the *fetch*
  itself only ever happens once per album in practice even without a dedicated cache.

## 6. Why fix the `createPending` race condition here?

- **Decision**: `createNarrativeArticleRepository.createPending` now recovers from a Postgres unique-
  violation (`23505`) on `(album_id, facet)` by fetching and returning the row the concurrent request
  already created, instead of blindly casting `undefined` to a row and crashing later.
- **Rationale**: Discovered live while testing the historical-events change: overlapping page
  requests (the album-context generation step can take 30-100+ seconds per view, making overlap
  likely) both attempted `createPending` for the same missing facet, and the loser's `undefined` row
  crashed at `article.id` deep inside `publishFacet`. This mirrors a bug already found and fixed
  earlier in this codebase for `tracks`/`credits` (`isUniqueViolation` + fetch-existing-and-return);
  applying the same pattern here is the direct fix, not new-here.
- **Alternatives considered**: None seriously considered — this is the same fix already proven for
  the analogous `tracks`/`credits` race, applied to the one remaining table that lacked it.

**Output**: All open design questions resolved; no remaining `NEEDS CLARIFICATION` markers.
