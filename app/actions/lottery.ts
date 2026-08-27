"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { createAlbumRepository } from "../lib/db/album";
import { createListPlacementRepository } from "../lib/db/list-placement";
import { toSupabaseLike } from "../lib/db/supabase-like";
import { buildLotteryPool, type LotteryEntry } from "../lib/discovery/lottery";

export type { LotteryEntry } from "../lib/discovery/lottery";

export async function getLotteryPool(): Promise<LotteryEntry[]> {
  const supabase = toSupabaseLike(await createSupabaseServerClient());
  const albumRepo = createAlbumRepository(supabase);
  const listPlacementRepo = createListPlacementRepository(supabase);

  return buildLotteryPool({
    findAllPlacements: () => listPlacementRepo.findAll(),
    findAllAlbums: () => albumRepo.findAllAlbums(),
    findArtistsByIds: (ids) => albumRepo.findArtistsByIds(ids)
  });
}
