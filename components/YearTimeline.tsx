import Link from "next/link";
import type { YearTimelineItem } from "@/app/lib/discovery/year";
import { formatLongDatePtBr } from "@/app/lib/format-date";

export function YearTimeline({ items }: { items: YearTimelineItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ol className="relative border-l border-[#171420]/10 pl-8">
      {items.map((item, index) => (
        <li key={item.kind === "event" ? `event-${item.date}-${index}` : `album-${item.album.albumId}`} className="relative pb-6 last:pb-0">
          <span
            aria-hidden="true"
            className={`absolute -left-[33px] top-1.5 h-2.5 w-2.5 rounded-full border-2 ${
              item.kind === "album" ? "border-[#d1145a] bg-[#d1145a]" : "border-[#0d7a5c] bg-[#f7f4f1]"
            }`}
          />
          <span className="font-mono text-[10px] tracking-[0.22em] text-[#a8a2b0]">
            {formatLongDatePtBr(item.date).toUpperCase()}
          </span>

          {item.kind === "event" ? (
            <p className="mt-1.5 max-w-[560px] font-sans text-[15px] font-light leading-relaxed text-[#443f4f]">
              {item.title}
            </p>
          ) : (
            <Link
              href={`/albums/${item.album.albumId}`}
              className="mt-2 flex items-center gap-5 rounded-xl border border-white/90 bg-white/50 p-4 pr-8 backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 hover:bg-white/70"
              style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
            >
              <div
                className="h-20 w-20 flex-none overflow-hidden rounded-lg"
                style={{ background: "repeating-linear-gradient(135deg, #e4dff2 0 9px, #f2eff9 9px 18px)" }}
              >
                {item.album.coverArtUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.album.coverArtUrl} alt={item.album.title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] tracking-[0.2em] text-[#d1145a]">
                  {item.album.artistName.toUpperCase()}
                </div>
                <h3 className="mt-1 break-words font-serif text-2xl font-bold tracking-[-0.01em] text-[#120f18]">
                  {item.album.title}
                </h3>
                {item.album.hook && (
                  <p className="mt-1 line-clamp-1 font-sans text-sm font-light text-[#6b6577]">{item.album.hook}</p>
                )}
              </div>
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}
