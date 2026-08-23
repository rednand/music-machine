import type { SupabaseLike } from "./supabase-like";
import { isSameEra } from "../same-era";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;
}

export type RecommendationReason =
  | "same_era"
  | "same_genre_movement"
  | "direct_influence"
  | "historical_importance";

export interface RecommendationRow {
  id: string;
  subject_album_id: string;
  recommended_album_id: string;
  reason: RecommendationReason;
  explanation: string;
}

export type CreateRecommendationInput = Omit<RecommendationRow, "id">;

export function createRecommendationRepository(supabase: SupabaseLike) {
  return {
    async create(input: CreateRecommendationInput): Promise<RecommendationRow> {
      const { data, error } = await supabase.from<RecommendationRow>("recommendations").insert(input).select().single();
      if (data) {
        return data;
      }
      if (isUniqueViolation(error)) {
        const existing = await supabase
          .from<RecommendationRow>("recommendations")
          .select("*")
          .eq("subject_album_id", input.subject_album_id)
          .eq("recommended_album_id", input.recommended_album_id)
          .maybeSingle();
        if (existing.data) {
          return existing.data;
        }
      }
      throw new Error(`Failed to create recommendation: ${error ? JSON.stringify(error) : "no row returned"}`);
    },

    async findBySubjectAlbumId(albumId: string): Promise<RecommendationRow[]> {
      const { data } = await supabase
        .from<RecommendationRow>("recommendations")
        .select("*")
        .eq("subject_album_id", albumId);
      return data ?? [];
    }
  };
}

export type RecommendationRepository = ReturnType<typeof createRecommendationRepository>;

export interface RecommendationCandidateAlbum {
  id: string;
  title: string;
  releaseDate: Date;
  genre?: string;
}

export interface DerivedRecommendation {
  recommended_album_id: string;
  reason: RecommendationReason;
  explanation: string;
}

export function deriveRecommendations(
  subject: RecommendationCandidateAlbum,
  candidates: RecommendationCandidateAlbum[],
  directlyInfluencedAlbumIds: Set<string>
): DerivedRecommendation[] {
  const derived: DerivedRecommendation[] = [];

  for (const candidate of candidates) {
    if (candidate.id === subject.id) {
      continue;
    }

    if (directlyInfluencedAlbumIds.has(candidate.id)) {
      derived.push({
        recommended_album_id: candidate.id,
        reason: "direct_influence",
        explanation: `${candidate.title} foi diretamente influenciado por ${subject.title}.`
      });
      continue;
    }

    if (isSameEra(subject.releaseDate, candidate.releaseDate)) {
      derived.push({
        recommended_album_id: candidate.id,
        reason: "same_era",
        explanation: `Lançado por volta da mesma época de ${subject.title}.`
      });
    }
  }

  return derived;
}
