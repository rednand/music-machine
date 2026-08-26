"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { createAlbumRepository } from "../lib/db/album";
import { createNarrativeArticleRepository } from "../lib/db/narrative-article";
import { toSupabaseLike } from "../lib/db/supabase-like";
import { deriveAlbumHooksBatch } from "../lib/discovery/hook";
import { buildDiscoveryPage, type DiscoveryPageResult } from "../lib/discovery/collection";

export type { DiscoveryPageResult } from "../lib/discovery/collection";

export async function getDiscoveryPage(): Promise<DiscoveryPageResult> {
  const supabase = toSupabaseLike(await createSupabaseServerClient());
  const albumRepo = createAlbumRepository(supabase);
  const narrativeArticles = createNarrativeArticleRepository(supabase);

  return buildDiscoveryPage({
    findAlbumsOrderedByCreatedAt: () => albumRepo.findAlbumsOrderedByCreatedAt(),
    findArtistsByIds: (artistIds) => albumRepo.findArtistsByIds(artistIds),
    deriveHooksBatch: (albumIds) =>
      deriveAlbumHooksBatch(albumIds, {
        findPublishedByAlbumIdsAndFacets: (ids, facets) =>
          narrativeArticles.findPublishedByAlbumIdsAndFacets(ids, facets),
        findFirstStatementTextByArticleIds: (ids) => narrativeArticles.findFirstStatementTextByArticleIds(ids)
      })
  });
}
