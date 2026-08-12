import Link from "next/link";
import type { InfluenceRow } from "@/app/lib/db/influence";

export function InfluenceList({ influences }: { influences: InfluenceRow[] }) {
  if (influences.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-[#171420]/[0.07] rounded-xl border border-white/85 bg-white/42 px-7 backdrop-blur-xl">
      {influences.map((influence) => (
        <div key={influence.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
          <p className="flex-1 font-sans text-[15px] font-light leading-relaxed text-[#443f4f]">
            {influence.explanation}
          </p>
          {influence.to_album_id && (
            <Link
              href={`/albums/${influence.to_album_id}`}
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
