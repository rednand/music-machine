"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OtherAlbumEntry } from "@/app/lib/ingestion/album-context";
import { resolveSearchCandidate } from "@/app/actions/search";

function EntryBody({ album, resolving }: { album: OtherAlbumEntry; resolving: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#d1145a] group-hover:bg-[#d1145a] ${
          album.isCurrent ? "bg-[#d1145a]" : "bg-[#f7f4f1]"
        }`}
      />
      <span className="font-mono text-[10px] tracking-[0.22em] text-[#0d7a5c]">{album.releaseYear}</span>
      <div
        className={`font-serif text-lg group-hover:text-[#d1145a] ${
          album.isCurrent ? "font-bold text-[#d1145a]" : album.albumId ? "text-[#120f18]" : "text-[#6b6577]"
        }`}
      >
        {album.title}
      </div>
      {album.description && (
        <p className="mt-0.5 max-w-md font-sans text-sm font-light text-[#6b6577]">{album.description}</p>
      )}
      {resolving && (
        <span className="mt-1 block font-mono text-[10px] tracking-[0.22em] text-[#d1145a]">ABRINDO...</span>
      )}
    </>
  );
}

export function OtherAlbumsByArtist({ albums }: { albums: OtherAlbumEntry[] }) {
  const router = useRouter();
  const [resolvingExternalId, setResolvingExternalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (albums.length === 0) {
    return null;
  }

  async function handleSpotifyOnlyClick(album: OtherAlbumEntry) {
    if (!album.externalId || !album.query) {
      return;
    }
    setError(null);
    setResolvingExternalId(album.externalId);
    const outcome = await resolveSearchCandidate(album.query, album.externalId);
    setResolvingExternalId(null);

    if (outcome.state === "error") {
      setError(outcome.message);
      return;
    }

    router.push(`/albums/${outcome.albumId}`);
  }

  return (
    <div className="relative border-l border-[#171420]/10 pl-7">
      {albums.map((album) => {
        if (album.isCurrent) {
          return (
            <div
              key={album.albumId ?? album.title}
              aria-current="true"
              className="group relative mb-6 cursor-default last:mb-0"
            >
              <EntryBody album={album} resolving={false} />
            </div>
          );
        }

        return album.albumId ? (
          <Link
            key={album.albumId}
            href={`/albums/${album.albumId}`}
            className="group relative mb-6 block last:mb-0"
          >
            <EntryBody album={album} resolving={false} />
          </Link>
        ) : (
          <button
            key={album.externalId ?? album.title}
            type="button"
            onClick={() => handleSpotifyOnlyClick(album)}
            disabled={resolvingExternalId === album.externalId}
            className="group relative mb-6 block w-full text-left last:mb-0"
          >
            <EntryBody album={album} resolving={resolvingExternalId === album.externalId} />
          </button>
        );
      })}
      {error && <p className="mt-2 font-sans text-sm text-[#d1145a]">{error}</p>}
    </div>
  );
}
