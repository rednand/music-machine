import Link from "next/link";
import type { InfluenceEntry } from "@/app/lib/ingestion/album-context";

export function InfluenceList({ influences }: { influences: InfluenceEntry[] }) {
  if (influences.length === 0) {
    return (
      <p className="font-sans text-sm font-light text-[#6b6577]">Nenhuma influência registrada para este álbum.</p>
    );
  }

  return (
    <div className="divide-y divide-[#171420]/[0.07] rounded-xl border border-white/85 bg-white/55 px-7">
      {influences.map((influence) => (
        <div key={influence.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
          {influence.artistName && (
            <span className="font-serif text-lg font-bold text-[#0d7a5c]">{influence.artistName}</span>
          )}
          <p className="min-w-0 flex-1 font-sans text-[15px] font-light leading-relaxed text-[#443f4f]">
            {influence.explanation}
          </p>
          {influence.albumId && (
            <Link
              href={`/albums/${influence.albumId}`}
              className="font-mono text-[10px] tracking-[0.18em] text-[#0d7a5c] hover:underline"
            >
              VER ÁLBUM →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
