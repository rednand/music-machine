"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { createAlbumRepository } from "../lib/db/album";
import { toSupabaseLike } from "../lib/db/supabase-like";

export interface SongSearchResult {
  trackId: string;
  title: string;
  albumId: string;
  albumTitle: string;
  artistName: string;
}

export async function searchSongs(query: string): Promise<SongSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const repository = createAlbumRepository(toSupabaseLike(supabase));

  const tracks = await repository.findTracksByTitle(query);

  const results = await Promise.all(
    tracks.map(async (track) => {
      const album = await repository.findAlbumById(track.album_id);
      if (!album) {
        return null;
      }
      const artist = await repository.findArtistById(album.artist_id);
      return {
        trackId: track.id,
        title: track.title,
        albumId: album.id,
        albumTitle: album.title,
        artistName: artist?.name ?? ""
      };
    })
  );

  return results.filter((result): result is SongSearchResult => result !== null);
}
