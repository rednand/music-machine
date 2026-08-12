import type { SupabaseLike } from "./supabase-like";
import { isSameEra } from "../same-era";

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
      const { data } = await supabase.from<RecommendationRow>("recommendations").insert(input).select().single();
      return data as RecommendationRow;
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
      continue;
    }

    if (subject.genre && candidate.genre && subject.genre === candidate.genre) {
      derived.push({
        recommended_album_id: candidate.id,
        reason: "same_genre_movement",
        explanation: `Faz parte do mesmo movimento de ${subject.genre} que ${subject.title}.`
      });
    }
  }

  return derived;
}
