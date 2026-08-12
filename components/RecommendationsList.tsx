import Link from "next/link";
import type { RecommendationRow } from "@/app/lib/db/recommendation";

const REASON_LABEL: Record<RecommendationRow["reason"], string> = {
  same_era: "MESMA ÉPOCA",
  same_genre_movement: "MESMO MOVIMENTO",
  direct_influence: "INFLUÊNCIA DIRETA",
  historical_importance: "IMPORTÂNCIA HISTÓRICA"
};

export function RecommendationsList({ recommendations }: { recommendations: RecommendationRow[] }) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {recommendations.map((recommendation) => (
        <Link
          key={recommendation.id}
          href={`/albums/${recommendation.recommended_album_id}`}
          className="block rounded-xl border border-white/90 bg-white/50 p-5 backdrop-blur-xl transition hover:bg-white/70"
          style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
        >
          <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#0d7a5c]">
            {REASON_LABEL[recommendation.reason]}
          </div>
          <p className="mt-2 font-sans text-[15px] font-light leading-relaxed text-[#443f4f]">
            {recommendation.explanation}
          </p>
        </Link>
      ))}
    </div>
  );
}
