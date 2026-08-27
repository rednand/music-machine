import type { SupabaseLike } from "./supabase-like";

const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g");

export interface ListPlacementRow {
  id: string;
  list_slug: string;
  list_name: string;
  position: number;
  artist_name: string;
  album_title: string;
  normalized_artist: string;
  normalized_title: string;
}

export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function createListPlacementRepository(supabase: SupabaseLike) {
  return {
    async findAll(): Promise<ListPlacementRow[]> {
      const { data } = await supabase.from<ListPlacementRow>("list_placements").select("*");
      return data ?? [];
    },

    async findByAlbum(artistName: string, albumTitle: string): Promise<ListPlacementRow[]> {
      const normalizedArtist = normalizeForMatch(artistName);
      const normalizedTitle = normalizeForMatch(albumTitle);
      if (!normalizedArtist || !normalizedTitle) {
        return [];
      }

      const { data } = await supabase
        .from<ListPlacementRow>("list_placements")
        .select("*")
        .eq("normalized_artist", normalizedArtist)
        .eq("normalized_title", normalizedTitle)
        .order("list_slug", { ascending: true });
      return data ?? [];
    }
  };
}

export type ListPlacementRepository = ReturnType<typeof createListPlacementRepository>;
