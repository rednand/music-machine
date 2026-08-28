import type { SupabaseLike } from "./supabase-like";

export interface EraNewsCacheRow {
  id: string;
  album_id: string;
  title: string;
  date: string;
  url: string;
}

export interface EraNewsCacheEntry {
  title: string;
  date: string;
  url: string;
}

export function createEraNewsCacheRepository(supabase: SupabaseLike) {
  return {
    async findByAlbumId(albumId: string): Promise<EraNewsCacheEntry[] | null> {
      const { data } = await supabase
        .from<EraNewsCacheRow>("era_news_cache")
        .select("*")
        .eq("album_id", albumId)
        .order("date", { ascending: true });

      if (!data || data.length === 0) {
        return null;
      }

      return data.map((row) => ({ title: row.title, date: row.date, url: row.url }));
    },

    async save(albumId: string, entries: EraNewsCacheEntry[]): Promise<void> {
      if (entries.length === 0) {
        return;
      }

      await supabase.from<EraNewsCacheRow>("era_news_cache").insert(
        entries.map((entry) => ({
          album_id: albumId,
          title: entry.title,
          date: entry.date,
          url: entry.url
        }))
      );
    }
  };
}

export type EraNewsCacheRepository = ReturnType<typeof createEraNewsCacheRepository>;
