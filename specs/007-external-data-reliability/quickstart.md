# Quickstart: Reliable External Data for Album Context

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/internal-modules.md](./contracts/internal-modules.md)

## Prerequisites

- `.env.local` needs `GROQ_API_KEY`, `DISCOGRAPHY_PROVIDER_TOKEN`,
  `POPULARITY_PROVIDER_API_KEY`, and `ENCYCLOPEDIA_PROVIDER_USER_AGENT` (existing). No Spotify
  credential is needed anymore — `CATALOG_PROVIDER_CLIENT_ID`/`CATALOG_PROVIDER_CLIENT_SECRET` have
  been removed from `.env.local.example`; any leftover values in a local `.env.local` are simply
  unused now.
- A Supabase-backed catalog reachable via the existing dev setup.

## Run

```bash
npm run dev
```

## Validation scenarios (map to spec Acceptance Scenarios)

1. **Search and ingest a never-before-seen artist without Spotify (US1)**
   - Search for an artist/album never added to the catalog before.
   - Confirm real candidates appear, resolving one successfully ingests the album.
   - Confirm the resulting album page shows a correct tracklist and the artist's full discography
     under "Linha do tempo" — with no Spotify credential configured anywhere in the environment.
   - Search for an artist with a known ambiguous/duplicate name on the underlying catalog (e.g.,
     "Korn") and confirm the real, well-known artist is resolved (spot-check the resulting
     discography matches the real band, not an unrelated same-named act).

2. **"O mundo" shows real content instead of a refusal (US2)**
   - Mark an album's `world_context` narrative article `stale` (or view a not-yet-generated album
     whose release date has real historical events nearby) and reload its page.
   - Confirm the three cards (política, cultura, tecnologia) show specific, dated context — not a
     "não há fontes disponíveis" statement.
   - Confirm that viewing an album whose `world_context` is already published, or already
     permanently failed, does not trigger a new historical-events lookup (check server logs for the
     absence of a new Wikidata request on that view).

3. **The true original release date is shown (US3)**
   - Ingest (or re-ingest, after clearing its stored date) an album known to be indexed by the
     catalog provider only as a reissue (e.g., "Fallen" by Evanescence).
   - Confirm the album's shown release date is the true original date, not the reissue's.

4. **Empty and degraded states are visible (US4)**
   - Open an album with no influence relationships and confirm the "Influência" section shows an
     explicit "Nenhuma influência registrada para este álbum." message.
   - Temporarily break the primary Groq model name (e.g., misspell it) and trigger a generation;
     confirm a server log line reports the primary-model failure and the fallback model used.

5. **Concurrent page views don't crash (edge case / FR-011)**
   - Open the same not-yet-generated album's page in two browser tabs at nearly the same time.
   - Confirm neither request crashes with an unhandled error, even if both attempt to create the
     same narrative-article row.

## Automated checks

```bash
npm run test           # Vitest — includes co-located tests for catalog-provider,
                        # historical-events-provider, musicbrainz-provider, ingest-album,
                        # album-context, narrative, publishing-gate, narrative-article, client,
                        # and InfluenceList
npx tsc --noEmit        # TypeScript strict check
```
