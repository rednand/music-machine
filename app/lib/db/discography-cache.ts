import type { SupabaseLike } from "./supabase-like";

export interface DiscographyCacheRow {
  id: string;
  artist_id: string;
  title: string;
  release_year: string;
  external_id: string;
}

export interface DiscographyCacheEntry {
  title: string;
  releaseYear: string;
  externalId: string;
}

export function createDiscographyCacheRepository(supabase: SupabaseLike) {
  return {
    async findByArtistId(artistId: string): Promise<DiscographyCacheEntry[] | null> {
      const { data } = await supabase
        .from<DiscographyCacheRow>("artist_discography_cache")
        .select("*")
        .eq("artist_id", artistId);

      if (!data || data.length === 0) {
        return null;
      }

      return data.map((row) => ({ title: row.title, releaseYear: row.release_year, externalId: row.external_id }));
    },

    async save(artistId: string, entries: DiscographyCacheEntry[]): Promise<void> {
      if (entries.length === 0) {
        return;
      }

      await supabase.from<DiscographyCacheRow>("artist_discography_cache").insert(
        entries.map((entry) => ({
          artist_id: artistId,
          title: entry.title,
          release_year: entry.releaseYear,
          external_id: entry.externalId
        }))
      );
    }
  };
}

export type DiscographyCacheRepository = ReturnType<typeof createDiscographyCacheRepository>;
