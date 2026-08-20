import type { SupabaseLike } from "./supabase-like";

export type SourceType =
  | "official_primary"
  | "music_database"
  | "journalistic"
  | "interview"
  | "specialized_publication"
  | "encyclopedic";

export interface SourceRow {
  id: string;
  type: SourceType;
  title: string;
  url: string;
  published_or_retrieved_date?: string;
  license_type?: string;
  attribution_text?: string;
}

export type CreateSourceInput = Omit<SourceRow, "id">;

export class MissingAttributionError extends Error {
  constructor(licenseType: string) {
    super(`Source with license_type "${licenseType}" requires attribution_text`);
  }
}

const LICENSE_TYPES_REQUIRING_ATTRIBUTION_PREFIX = "CC-";

export function licenseRequiresAttribution(licenseType: string | undefined): boolean {
  if (!licenseType) {
    return false;
  }
  return licenseType.startsWith(LICENSE_TYPES_REQUIRING_ATTRIBUTION_PREFIX);
}

export function assertAttributionPresent(input: CreateSourceInput): void {
  if (licenseRequiresAttribution(input.license_type) && !input.attribution_text) {
    throw new MissingAttributionError(input.license_type as string);
  }
}

export function createSourceRepository(supabase: SupabaseLike) {
  return {
    async create(input: CreateSourceInput): Promise<SourceRow> {
      assertAttributionPresent(input);
      const { data, error } = await supabase.from<SourceRow>("sources").insert(input).select().single();
      if (!data) {
        throw new Error(`Failed to create source: ${error ? JSON.stringify(error) : "no row returned"}`);
      }
      return data;
    },

    async findById(id: string): Promise<SourceRow | null> {
      const { data } = await supabase.from<SourceRow>("sources").select("*").eq("id", id).maybeSingle();
      return data;
    }
  };
}

export type SourceRepository = ReturnType<typeof createSourceRepository>;
