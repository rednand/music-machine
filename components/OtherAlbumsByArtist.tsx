import Link from "next/link";
import type { OtherAlbumEntry } from "@/app/lib/ingestion/album-context";

export function OtherAlbumsByArtist({ albums }: { albums: OtherAlbumEntry[] }) {
  if (albums.length === 0) {
    return null;
  }

  return (
    <div className="relative border-l border-[#171420]/10 pl-7">
      {albums.map((album) => (
        <Link
          key={album.albumId}
          href={`/albums/${album.albumId}`}
          className="group relative mb-6 block last:mb-0"
        >
          <span
            aria-hidden="true"
            className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#d1145a] bg-[#f7f4f1] group-hover:bg-[#d1145a]"
          />
          <span className="font-mono text-[10px] tracking-[0.22em] text-[#0d7a5c]">{album.releaseYear}</span>
          <div className="font-serif text-lg text-[#120f18] group-hover:text-[#d1145a]">{album.title}</div>
        </Link>
      ))}
    </div>
  );
}
