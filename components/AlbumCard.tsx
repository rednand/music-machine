import Link from "next/link";
import type { DiscoveryPageEntry } from "@/app/lib/discovery/collection";

export function AlbumCard({ entry }: { entry: DiscoveryPageEntry }) {
  return (
    <Link
      href={`/albums/${entry.albumId}`}
      className="flex items-center gap-4 rounded-xl border border-white/90 bg-white/50 p-[20px] pr-9 backdrop-blur-[20px] transition-colors hover:border-[#d1145a]/40 hover:bg-white/70 sm:gap-[30px]"
      style={{ boxShadow: "0 34px 60px -44px rgba(23,20,32,0.55)" }}
    >
      <div
        className="h-20 w-20 flex-none overflow-hidden rounded-lg sm:h-32 sm:w-32"
        style={{ background: "repeating-linear-gradient(135deg, #e4dff2 0 9px, #f2eff9 9px 18px)" }}
      >
        {entry.coverArtUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.coverArtUrl} alt={entry.title} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] tracking-[0.22em] text-[#0d7a5c]">
          {entry.releaseYear} · {entry.artistName.toUpperCase()}
          {entry.genre ? ` · ${entry.genre.toUpperCase()}` : ""}
        </div>
        <h3 className="mb-[10px] mt-2 break-words font-serif text-[clamp(20px,5.5vw,34px)] font-bold tracking-[-0.02em] text-[#120f18]">
          {entry.title}
        </h3>
        {entry.hook && <p className="line-clamp-2 text-base font-light text-[#443f4f]">{entry.hook}</p>}
      </div>
    </Link>
  );
}
