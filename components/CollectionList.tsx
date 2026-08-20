"use client";

import { useState } from "react";
import Link from "next/link";
import type { DiscoveryPageEntry } from "@/app/lib/discovery/collection";

export function CollectionList({
  entries,
  previewCount = 2
}: {
  entries: DiscoveryPageEntry[];
  previewCount?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (entries.length === 0) {
    return null;
  }

  const visibleEntries = isExpanded ? entries : entries.slice(0, previewCount);
  const hasMore = !isExpanded && entries.length > previewCount;

  return (
    <>
      <ul className="flex flex-col gap-[18px]">
        {visibleEntries.map((entry) => (
          <li key={entry.albumId}>
            <Link
              href={`/albums/${entry.albumId}`}
              className="flex items-center gap-[30px] rounded-xl border border-white/90 bg-white/50 p-[20px] pr-9 backdrop-blur-[20px] transition-colors hover:border-[#d1145a]/40 hover:bg-white/70"
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
                <h3 className="mb-[10px] mt-2 font-serif text-[34px] font-bold tracking-[-0.02em] text-[#120f18]">{entry.title}</h3>
                {entry.hook && <p className="line-clamp-2 text-base font-light text-[#443f4f]">{entry.hook}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="mt-8 inline-flex items-center gap-2 border-b border-[#0d7a5c] font-mono text-[11px] tracking-[0.2em] text-[#0d7a5c] transition-colors hover:text-[#d1145a]"
        >
          VER O ACERVO INTEIRO ↓
        </button>
      )}
    </>
  );
}
