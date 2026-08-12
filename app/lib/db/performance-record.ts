import type { SupabaseLike } from "./supabase-like";

export interface PerformanceRecordRow {
  id: string;
  album_id: string;
  kind: "chart_position" | "certification" | "sales_figure" | "award";
  label: string;
  value: string;
  record_date?: string;
  source_id: string;
}

export function createPerformanceRecordRepository(supabase: SupabaseLike) {
  return {
    async create(input: Omit<PerformanceRecordRow, "id">): Promise<PerformanceRecordRow> {
      const { data } = await supabase.from<PerformanceRecordRow>("performance_records").insert(input).select().single();
      return data as PerformanceRecordRow;
    },

    async findByAlbumId(albumId: string): Promise<PerformanceRecordRow[]> {
      const { data } = await supabase
        .from<PerformanceRecordRow>("performance_records")
        .select("*")
        .eq("album_id", albumId);
      return data ?? [];
    }
  };
}

export type PerformanceRecordRepository = ReturnType<typeof createPerformanceRecordRepository>;
