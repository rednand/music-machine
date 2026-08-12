import type { SupabaseLike } from "./supabase-like";

export interface InfluenceRow {
  id: string;
  from_album_id?: string;
  from_artist_id?: string;
  to_album_id?: string;
  to_artist_id?: string;
  explanation: string;
  source_id: string;
}

export function createInfluenceRepository(supabase: SupabaseLike) {
  return {
    async create(input: Omit<InfluenceRow, "id">): Promise<InfluenceRow> {
      const { data } = await supabase.from<InfluenceRow>("influences").insert(input).select().single();
      return data as InfluenceRow;
    },

    async findByFromAlbumId(albumId: string): Promise<InfluenceRow[]> {
      const { data } = await supabase.from<InfluenceRow>("influences").select("*").eq("from_album_id", albumId);
      return data ?? [];
    }
  };
}

export type InfluenceRepository = ReturnType<typeof createInfluenceRepository>;
