import Link from "next/link";
import type { DiscoveryPageEntry } from "@/app/lib/discovery/collection";

const CARD_LAYOUTS = [
  { left: "34%", top: 0, width: "64%", rotate: 2.5 },
  { left: "2%", top: 150, width: "48%", rotate: -3 },
  { left: "56%", top: 246, width: "42%", rotate: 4 },
  { left: "16%", top: 352, width: "38%", rotate: -1.5 }
];

export function FeaturedAlbumCard({ entry, index }: { entry: DiscoveryPageEntry; index: number }) {
  const layout = CARD_LAYOUTS[index % CARD_LAYOUTS.length];

  return (
    <Link
      href={`/albums/${entry.albumId}`}
      aria-label={`${entry.title} — ${entry.artistName}`}
      className="absolute rounded-lg border border-white/90 bg-white/60 p-[9px] backdrop-blur-[18px]"
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        transform: `rotate(${layout.rotate}deg)`,
        boxShadow: "0 30px 55px -34px rgba(23,20,32,0.5)"
      }}
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
      <div className="flex items-baseline justify-between px-[3px] pb-[3px] pt-[9px]">
        <span className="font-mono text-[8.5px] tracking-[0.16em] text-[#6b6577]">
          {entry.artistName.toUpperCase()}
        </span>
        <span className="font-serif text-sm text-[#d1145a]">{entry.releaseYear}</span>
      </div>
    </Link>
  );
}
