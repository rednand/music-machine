import Link from "next/link";
import type { RecommendationRow } from "@/app/lib/db/recommendation";
import type { RecommendationEntry } from "@/app/lib/ingestion/album-context";

const REASON_LABEL: Record<RecommendationRow["reason"], string> = {
  same_era: "MESMA ÉPOCA",
  same_genre_movement: "MESMO MOVIMENTO",
  direct_influence: "INFLUÊNCIA DIRETA",
  historical_importance: "IMPORTÂNCIA HISTÓRICA"
};

export function RecommendationsList({ recommendations }: { recommendations: RecommendationEntry[] }) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {recommendations.map((recommendation) => (
        <Link
          key={recommendation.id}
          href={`/albums/${recommendation.albumId}`}
          className="flex items-center gap-4 rounded-xl border border-white/90 bg-white/50 p-4 backdrop-blur-xl transition hover:bg-white/70"
          style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
        >
          <div
            className="h-16 w-16 flex-none overflow-hidden rounded-lg"
            style={{ background: "repeating-linear-gradient(135deg, #e4dff2 0 9px, #f2eff9 9px 18px)" }}
          >
            {recommendation.coverArtUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recommendation.coverArtUrl} alt={recommendation.title} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#0d7a5c]">
              {recommendation.releaseYear} · {REASON_LABEL[recommendation.reason]}
            </div>
            <div title={recommendation.title} className="truncate font-serif text-lg font-bold text-[#120f18]">
              {recommendation.title}
            </div>
            <div title={recommendation.artistName} className="truncate font-sans text-sm text-[#6b6577]">
              {recommendation.artistName}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
