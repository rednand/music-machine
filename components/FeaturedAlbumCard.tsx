import Link from "next/link";
import type { DiscoveryPageEntry } from "@/app/lib/discovery/collection";

export function FeaturedAlbumCard({ entry }: { entry: DiscoveryPageEntry }) {
  return (
    <Link
      href={`/albums/${entry.albumId}`}
      aria-label={`${entry.title} — ${entry.artistName}`}
      className="rounded-lg border border-white/90 bg-white/60 p-[9px] backdrop-blur-xl transition-colors hover:border-[#d1145a]/40"
      style={{ boxShadow: "0 26px 50px -34px rgba(23,20,32,0.45)" }}
    >
      <div
        className="aspect-square overflow-hidden rounded-md"
        style={{ background: "repeating-linear-gradient(135deg, #dde5f7 0 8px, #eff2fb 8px 16px)" }}
      >
        {entry.coverArtUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.coverArtUrl} alt={entry.title} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex items-baseline justify-between px-[3px] pt-[9px]">
        <span className="font-mono text-[8.5px] tracking-[0.16em] text-[#6b6577]">
          {entry.artistName.toUpperCase()}
        </span>
        <span className="font-serif text-sm text-[#d1145a]">{entry.releaseYear}</span>
      </div>
    </Link>
  );
}
