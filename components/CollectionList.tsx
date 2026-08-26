import Link from "next/link";
import type { DiscoveryPageEntry } from "@/app/lib/discovery/collection";
import { AlbumCard } from "@/components/AlbumCard";

export function CollectionList({
  entries,
  previewCount = 2
}: {
  entries: DiscoveryPageEntry[];
  previewCount?: number;
}) {
  if (entries.length === 0) {
    return null;
  }

  const visibleEntries = entries.slice(0, previewCount);
  const hasMore = entries.length > previewCount;

  return (
    <>
      <ul className="flex flex-col gap-[18px]">
        {visibleEntries.map((entry) => (
          <li key={entry.albumId}>
            <AlbumCard entry={entry} />
          </li>
        ))}
      </ul>
      {hasMore && (
        <Link
          href="/acervo"
          className="mt-8 inline-flex items-center gap-2 border-b border-[#0d7a5c] font-mono text-[11px] tracking-[0.2em] text-[#0d7a5c] transition-colors hover:text-[#d1145a]"
        >
          VER O ACERVO INTEIRO ↓
        </Link>
      )}
    </>
  );
}
