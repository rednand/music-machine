import Link from "next/link";
import type { SameEraAlbumRef } from "@/app/lib/ai/narrative";
import { SectionCard } from "@/components/SectionCard";

export function MusicalSceneGrid({
  number,
  title,
  albums
}: {
  number?: string;
  title: string;
  albums: SameEraAlbumRef[];
}) {
  if (albums.length === 0) {
    return null;
  }

  const cards = albums.slice(0, 3);

  return (
    <SectionCard number={number} title={title}>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((album, index) => {
          const cardBody = (
            <>
              <div className="font-serif text-lg font-bold text-[#120f18]">{album.title}</div>
              <div className="mt-1 font-mono text-[9.5px] tracking-[0.2em] text-[#a8a2b0]">
                {album.artistName.toUpperCase()}
                {album.releaseYear ? ` — ${album.releaseYear}` : ""}
              </div>
            </>
          );

          const className =
            "block rounded-xl border border-white/90 bg-white/50 p-5 backdrop-blur-xl transition hover:bg-white/70";
          const style = { boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" };

          return album.albumId ? (
            <Link key={`${album.title}-${index}`} href={`/albums/${album.albumId}`} className={className} style={style}>
              {cardBody}
            </Link>
          ) : (
            <div key={`${album.title}-${index}`} className={className} style={style}>
              {cardBody}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
