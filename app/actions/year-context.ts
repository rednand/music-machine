"use server";

import { getCurrentIsAdmin } from "../lib/auth";
import { runWithAdminTrace, traceDeps } from "../lib/debug/admin-trace";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { createAlbumRepository } from "../lib/db/album";
import { createNarrativeArticleRepository } from "../lib/db/narrative-article";
import { toSupabaseLike } from "../lib/db/supabase-like";
import { deriveAlbumHook } from "../lib/discovery/hook";
import { buildYearPage, type YearPageDeps, type YearPageResult } from "../lib/discovery/year";
import { HistoricalEventsProvider } from "../lib/providers/historical-events-provider";

export type { YearPageResult } from "../lib/discovery/year";

const TRACED_DEP_KEYS: (keyof YearPageDeps)[] = [
  "findAlbumsByReleaseYear",
  "findArtistById",
  "deriveHook",
  "findHistoricalEvents"
];

export async function getYearContext(year: string): Promise<YearPageResult> {
  const isAdmin = await getCurrentIsAdmin();
  const supabase = toSupabaseLike(await createSupabaseServerClient());
  const albumRepo = createAlbumRepository(supabase);
  const narrativeArticles = createNarrativeArticleRepository(supabase);
  const historicalEvents = new HistoricalEventsProvider({
    userAgent: process.env.ENCYCLOPEDIA_PROVIDER_USER_AGENT ?? "music-time-machine/0.1.0"
  });

  const deps: YearPageDeps = {
    findAlbumsByReleaseYear: (y) => albumRepo.findAlbumsByReleaseYear(y),
    findArtistById: (artistId) => albumRepo.findArtistById(artistId),
    deriveHook: (albumId) =>
      deriveAlbumHook(albumId, {
        findByAlbumAndFacet: (id, facet) => narrativeArticles.findByAlbumAndFacet(id, facet),
        findStatementsByArticleId: (articleId) => narrativeArticles.findStatementsByArticleId(articleId)
      }),
    findHistoricalEvents: (date) => historicalEvents.fetchEvents(date)
  };

  const { result } = await runWithAdminTrace(isAdmin, () => buildYearPage(year, traceDeps(deps, TRACED_DEP_KEYS)));
  return result;
}
