import type { SupabaseLike } from "./supabase-like";

export interface ReviewRow {
  id: string;
  album_id: string;
  publication: string;
  rating_or_verdict?: string;
  published_date?: string;
  stance: "contemporary" | "retrospective";
  summary: string;
  source_url: string;
  source_id: string;
}

export function createReviewRepository(supabase: SupabaseLike) {
  return {
    async create(input: Omit<ReviewRow, "id">): Promise<ReviewRow> {
      const { data } = await supabase.from<ReviewRow>("reviews").insert(input).select().single();
      return data as ReviewRow;
    },

    async findByAlbumId(albumId: string): Promise<ReviewRow[]> {
      const { data } = await supabase.from<ReviewRow>("reviews").select("*").eq("album_id", albumId);
      return data ?? [];
    }
  };
}

export type ReviewRepository = ReturnType<typeof createReviewRepository>;
