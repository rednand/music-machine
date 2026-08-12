import Link from "next/link";
import type { DiscoveryPageEntry } from "@/app/lib/discovery/collection";

export function CollectionList({ entries }: { entries: DiscoveryPageEntry[] }) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-[18px]">
      {entries.map((entry, index) => (
        <li key={entry.albumId}>
          <Link
            href={`/albums/${entry.albumId}`}
            className="relative flex items-center gap-[30px] overflow-hidden rounded-xl border border-white/90 bg-white/50 p-[20px] pr-9 backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 hover:bg-white/70"
            style={{ boxShadow: "0 34px 60px -44px rgba(23,20,32,0.55)" }}
          >
            <div
              className="h-32 w-32 flex-none overflow-hidden rounded-lg"
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
              </div>
              <h3 className="my-2 font-serif text-[34px] font-bold tracking-tight text-[#120f18]">{entry.title}</h3>
              {entry.hook && <p className="text-base font-light text-[#443f4f]">{entry.hook}</p>}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-[30px] top-[-14px] font-serif text-[104px] font-bold leading-none text-[#171420]/[0.06]"
            >
              {String(index + 1).padStart(2, "0")}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
