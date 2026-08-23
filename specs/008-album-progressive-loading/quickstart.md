# Quickstart: Validating Album Progressive Loading

Prerequisites: dev server running (`yarn dev`, see [contracts/server-actions.md](contracts/server-actions.md)
for the two entry points involved), a working Supabase connection, and valid AI provider
credentials (`GROQ_API_KEY`, `GEMINI_API_KEY`) for the happy-path checks.

## 1. Happy path — technical sheet appears before AI content

1. Open the app and search for an album that is not yet in the collection.
2. Select it from the results.
3. Expect: the album page opens showing title, artist, release info, tracklist, and credits —
   before any of the AI-written sections (artist context, world context, musical scene,
   reception & legacy, curiosities, influence, summary) have content.
4. Expect: each of those AI-written sections shows a loading indicator in place, on the
   already-open page (matches spec User Story 1, FR-002/FR-003).
5. Wait. Expect: the AI-written sections populate automatically, without reloading or
   navigating (matches spec User Story 2, FR-004).

## 2. Resume after closing the tab mid-generation

1. Repeat step 1-3 above, then close the tab while the AI sections are still loading.
2. Reopen the album page (same URL) a few seconds later.
3. Expect: if generation already finished server-side, the page shows the finished content
   directly (FR-008); if not, it shows the loading indicators again — the generation must not
   restart from scratch (FR-005, edge cases in spec.md).

## 3. Duplicate selection / concurrent requests

1. Select the same new album in two browser tabs at nearly the same time (or double-click fast).
2. Expect: no duplicate technical-data ingestion and no duplicate AI-generation run for that
   album (SC-004); both tabs converge on the same result.

## 4. Failure states

1. Temporarily point `GROQ_API_KEY`/`GEMINI_API_KEY` at invalid values (or otherwise force the AI
   call to fail) and repeat the happy path.
2. Expect: the technical sheet still renders normally; the AI-written sections show an
   error/retry state instead of spinning indefinitely (FR-007, User Story 3).
3. Separately, simulate a catalog/technical-data provider failure for a new album.
4. Expect: a clear error message instead of an indefinite loading state (FR-006).

## 5. Automated checks

Run the test suite for the modified modules:

```sh
yarn test
```

Confirm coverage does not regress below the project's 80% floor (constitution Principle V).
