"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  searchCatalog,
  resolveSearchCandidate,
  type CandidateSearchResult,
  type KnownSearchResult,
  type SearchResultItem
} from "@/app/actions/search";
import { searchSongs, type SongSearchResult } from "@/app/actions/song-search";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { cn } from "@/lib/utils";

type SearchMode = "album" | "song";

function resultHref(result: KnownSearchResult): string {
  return `/albums/${result.id}`;
}

export function SearchForm() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("album");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [songResults, setSongResults] = useState<SongSearchResult[] | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSearching(true);

    try {
      if (mode === "song") {
        setResults(null);
        setSongResults(await searchSongs(query));
        return;
      }

      setSongResults(null);
      setResults(await searchCatalog(query));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCandidateSelect(candidate: CandidateSearchResult) {
    setError(null);
    setResolvingId(candidate.externalId);
    const outcome = await resolveSearchCandidate(candidate.query, candidate.externalId);
    setResolvingId(null);

    if (outcome.state === "error") {
      setError(outcome.message);
      return;
    }

    setIsNavigating(true);
    router.push(`/albums/${outcome.albumId}`);
  }

  return (
    <div className="max-w-[620px]">
      <form onSubmit={handleSubmit}>
        <div className="mb-3 flex items-center gap-5 font-mono text-[10px] tracking-[0.2em]">
          <button
            type="button"
            onClick={() => setMode("album")}
            className={cn("transition-colors", mode === "album" ? "text-[#d1145a]" : "text-[#6b6577] hover:text-[#d1145a]")}
          >
            ÁLBUM
          </button>
          <button
            type="button"
            onClick={() => setMode("song")}
            className={cn("transition-colors", mode === "song" ? "text-[#d1145a]" : "text-[#6b6577] hover:text-[#d1145a]")}
          >
            MÚSICA
          </button>
        </div>
        <div className="flex items-center gap-4 border-b border-[#171420]/[0.22] px-0.5 pb-3.5">
          <span className="h-3.5 w-3.5 flex-none rounded-full border-[1.6px] border-[#d1145a]" />
          <input
            role="searchbox"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === "song" ? "digite o nome de uma música..." : "digite um artista, álbum ou ano..."}
            disabled={isSearching || isNavigating}
            className="w-full border-0 bg-transparent text-base text-[#171420] outline-none placeholder:text-[#a8a2b0] disabled:opacity-60"
          />
          <button type="submit" disabled={isSearching || isNavigating} className="sr-only">
            Buscar
          </button>
        </div>
      </form>

      {isSearching && <LoadingIndicator label="Buscando..." className="mt-4" />}
      {isNavigating && <LoadingIndicator label="Abrindo álbum..." className="mt-4" />}

      {error && <p className="mt-4 text-[#d1145a]">{error}</p>}

      {songResults !== null && songResults.length === 0 && (
        <p className="mt-4 font-light text-[#443f4f]">Nenhuma música encontrada. Tente buscar por álbum.</p>
      )}

      {songResults !== null && songResults.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {songResults.map((song) => (
            <li key={song.trackId}>
              <Link
                href={`/albums/${song.albumId}?track=${song.trackId}`}
                className="block rounded-lg border border-white/90 bg-white/50 p-3 backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 hover:bg-white/70"
              >
                <span className="font-serif text-lg text-[#120f18]">{song.title}</span>
                <span className="block font-mono text-[10px] tracking-[0.18em] text-[#6b6577]">
                  {song.albumTitle.toUpperCase()} · {song.artistName.toUpperCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {results !== null && results.length === 0 && (
        <p className="mt-4 font-light text-[#443f4f]">Nenhum resultado encontrado.</p>
      )}

      {results !== null && results.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {results.map((result) =>
            result.kind === "known" ? (
              <li key={`known-${result.id}`}>
                <Link
                  href={resultHref(result)}
                  className="block rounded-lg border border-white/90 bg-white/50 p-3 backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 hover:bg-white/70"
                >
                  <span className="font-serif text-lg text-[#120f18]">{result.title}</span>
                  {result.artistName && (
                    <span className="block font-mono text-[10px] tracking-[0.18em] text-[#6b6577]">
                      {result.artistName.toUpperCase()}
                    </span>
                  )}
                </Link>
              </li>
            ) : (
              <li key={`candidate-${result.externalId}`}>
                <button
                  type="button"
                  onClick={() => handleCandidateSelect(result)}
                  disabled={resolvingId === result.externalId}
                  className="block w-full rounded-lg border border-white/90 bg-white/50 p-3 text-left backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 hover:bg-white/70"
                >
                  <span className="font-serif text-lg text-[#120f18]">{result.title}</span>
                  <span className="block font-mono text-[10px] tracking-[0.18em] text-[#6b6577]">
                    {result.artistName.toUpperCase()}
                  </span>
                  {resolvingId === result.externalId && (
                    <span className="mt-1 block font-mono text-[10px] tracking-[0.18em] text-[#d1145a]">
                      SALVANDO...
                    </span>
                  )}
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
