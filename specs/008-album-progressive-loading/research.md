# Research: Album Progressive Loading

## Current-state findings (grounding for decisions below)

- `getAlbumContext(albumId)` (`app/actions/album-context.ts:39`) delegates to
  `assembleAlbumContext` (`app/lib/ingestion/album-context.ts:424`), which the album page
  (`app/(public)/albums/[albumId]/page.tsx:30`) awaits in full before rendering anything.
- `assembleAlbumContext` checks `narrative_articles` status first (line 437): if any facet is
  `"pending"`, it returns `{state:"pending"}` **immediately, without fetching tracks/credits/
  header data at all** — this is why the current "pending" page (`page.tsx:36-38`) renders plain
  text with no album content, even when the technical sheet already exists in the database.
- When generation is needed, `generateAllFacets` (line 229) already sequences correctly
  internally: it awaits `ingestAlbum` + persists credits/tracks/performance records (lines
  247-264) *before* running `synthesizeNarrative`/`synthesizeCuriosities`/`synthesizeInfluence`
  (lines 299-324). The problem is not the internal ordering — it's that the *caller*
  (`assembleAlbumContext` → `getAlbumContext` → `page.tsx`) awaits the whole thing as one unit,
  so the technical data it already has by line 264 is never surfaced to the page early.
- Narrative generation state is already durably tracked per facet in `narrative_articles.status`
  (`pending` / `published` / `failed_validation` / `stale`), which is exactly the state a polling
  mechanism needs — it already survives a closed tab/new request, since `assembleAlbumContext`
  re-derives it from the database on every call.

## Decision 1: Progressive reveal granularity for AI-generated sections

**Decision**: Treat all AI-generated sections (artist context, world context, musical scene,
reception & legacy, curiosities, influence, summary) as one group that reveals together once
every piece has finished, rather than revealing each section independently as it completes.

**Rationale**: `generateAllFacets` already produces `synthesizeNarrative`, `synthesizeCuriosities`,
and `synthesizeInfluence` together via a single `Promise.all` (album-context.ts:299-324); they
already tend to finish within the same window. Treating them as one group requires no change to
how generation itself works — only to when the *page* opens relative to that group finishing.
Per-section independent reveal was proposed during `/speckit-clarify` (recommended as the
default) but the session ended before the user confirmed; per the spec's documented Assumption,
this default stands and can be revisited without changing this feature's data model, since
`narrative_articles` already stores status per individual facet.

**Alternatives considered**: Per-section reveal (Option B from the clarification) — rejected for
this iteration; it would require the page to render each of the ~7 sections against its own
independent status rather than one combined status, which is a larger UI change for a benefit
the AI generation step doesn't currently deliver anyway (statements are validated and published
together in a loop but produced together upstream).

## Decision 2: Mechanism for revealing AI content on an already-open page

**Decision**: A small Client Component polls a Server Action (`getAlbumNarrative(albumId)`) on
an interval and swaps each section's loading placeholder for finished content once the poll
reports "ready" (or "failed").

**Rationale**: AI narrative generation must keep running server-side even if the user closes the
tab (per spec edge case), and must resume correctly — not restart — when the page is reopened.
That already requires a database-backed status check on every request (which `assembleAlbumContext`
already does via `narrative_articles.status`). Polling reuses that same check for both the
first load and any later reopen, with no new infrastructure. It also avoids holding a single
HTTP response open for however long AI generation takes (which can run into serverless/proxy
timeout limits), which a streamed/Suspense-based approach would require.

**Alternatives considered**:
- React/Next.js Suspense streaming (an unresolved promise passed into a nested `<Suspense>`
  boundary): rejected — ties the reveal to one HTTP response's lifetime, which doesn't match the
  "keep generating after the tab closes, resume on reopen" requirement without falling back to
  the same DB check anyway, so it adds transport complexity without removing any.
- Server-Sent Events / WebSocket push: rejected — new infrastructure with no existing precedent
  in this codebase, disproportionate to a one-time, self-terminating background job per album.

## Decision 3: Where the ingestion/generation split happens

**Decision**: Split the existing `getAlbumContext`/`assembleAlbumContext` pairing into two entry
points — one that resolves the technical sheet/tracklist only (ingest-if-missing, no AI), and
one that resolves-or-triggers-or-reports-status for the AI narrative — instead of introducing a
new orchestration layer.

**Rationale**: Minimizes change to the already-tested AI orchestration in `generateAllFacets`;
only the entry-point sequencing and what's awaited by the page changes. The technical-sheet path
reuses `ingestAlbum` + `persistCredits`/`persistTracks`/`persistPerformanceRecords` exactly as
they run today (album-context.ts:247-264); the narrative path reuses the facet
resolve-or-generate-or-pending logic exactly as it runs today (lines 299-353), just no longer
gated behind the technical-sheet fetch nor blocking the page render.

**Alternatives considered**: A new unified "generation orchestrator" service — rejected as
unnecessary scope; the existing functions already do the right work, they're just invoked and
awaited as a single unit today.

## Decision 4: Rate limiting on the narrative-triggering action

**Decision**: The Server Action that triggers or continues AI narrative generation must enforce
a per-authenticated-user rate limit, per constitution Principle III ("Every Server Action that is
costly or abusable... MUST enforce a rate limit scoped to the authenticated user").

**Rationale**: Polling calls a Server Action that can trigger Groq/Gemini calls; without a rate
limit, rapid or repeated polling/navigation could multiply AI spend. The polling interval itself
reduces call frequency, but the action must not rely on client-side pacing alone.

**Alternatives considered**: No additional rate limit beyond the existing per-facet "pending"
guard — rejected, since that guard prevents duplicate *generation* but doesn't bound how often a
user's polling can hit the action itself.
