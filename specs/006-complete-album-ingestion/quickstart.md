# Quickstart: Complete Album Ingestion

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/internal-modules.md](./contracts/internal-modules.md)

## Prerequisites

- `.env.local` already has `DISCOGRAPHY_PROVIDER_TOKEN`, `GROQ_API_KEY`, and
  `ENCYCLOPEDIA_PROVIDER_USER_AGENT` configured (existing — this feature needs no new credential).
- A local Supabase-backed catalog reachable via the existing dev setup.

## Run

```bash
npm run dev
```

## Validation scenarios (map to spec Acceptance Scenarios)

1. **Tracks appear on first view (US1)**
   - Search for and open an album not previously viewed in this environment, whose Discogs release
     has a tracklist (most commercially released albums do).
   - Confirm the "O álbum" section now shows a tracklist with numbers, titles, and durations.
   - Reload the page and confirm the same tracklist appears without a new external fetch (check
     server logs / network timing — should be materially faster than the first load).

2. **Performance data appears when available (US2)**
   - Open an album whose Wikipedia article uses `{{Album chart}}` or `{{Certification}}` templates
     (reuse one already used in `encyclopedia-provider.test.ts` fixtures for a known-good example).
   - Confirm the "Desempenho" section now shows those records instead of "não disponível".
   - Open an album with no such templates and confirm "não disponível" still appears.

3. **Curiosities appear when the sources support them (US3)**
   - Open a well-documented album and confirm "Curiosidades" shows at least one entry.
   - Confirm each curiosity is only ever shown when it came from real source material (spot-check
     against `contextFacts`/review summaries for that album — no invented specifics).
   - Reload and confirm the same curiosities are shown without regenerating.

4. **Influence relationships appear when described in sources (US4)**
   - Open an album with well-known influence (e.g., a widely cited "influenced genre X" narrative)
     and confirm "Influência" shows the relationship with its explanation.
   - Confirm a relationship whose other side isn't in the local catalog still renders (name in the
     explanation text, no broken link).

5. **Independent failure (edge case / FR-012)**
   - Temporarily point `GROQ_API_KEY` to an invalid value and open a not-yet-viewed album.
   - Confirm tracks and performance data (which don't depend on Groq) still populate, while
     curiosities/influence/narrative sections degrade to their existing empty states — no broken
     page.

## Automated checks

```bash
npm run test        # Vitest — includes co-located tests for discography-provider, ingest-album,
                     # album-context, and the new curiosity-influence module
npm run test:coverage  # must not regress below 80% per constitution Principle V
npm run lint
```
