import type { SupabaseLike } from "./supabase-like";

export type CuriosityStatus = "confirmed" | "unconfirmed" | "disputed";

export interface CuriosityRow {
  id: string;
  album_id: string;
  summary: string;
  status: CuriosityStatus;
  source_id: string;
}

export interface CreateCuriosityInput {
  album_id: string;
  summary: string;
  source_id: string;
  status?: CuriosityStatus;
}

export function createCuriosityRepository(supabase: SupabaseLike) {
  return {
    async create(input: CreateCuriosityInput): Promise<CuriosityRow> {
      const { data } = await supabase
        .from<CuriosityRow>("curiosities")
        .insert({ status: "unconfirmed", ...input })
        .select()
        .single();
      return data as CuriosityRow;
    },

    async findByAlbumId(albumId: string): Promise<CuriosityRow[]> {
      const { data } = await supabase.from<CuriosityRow>("curiosities").select("*").eq("album_id", albumId);
      return data ?? [];
    }
  };
}

export type CuriosityRepository = ReturnType<typeof createCuriosityRepository>;
