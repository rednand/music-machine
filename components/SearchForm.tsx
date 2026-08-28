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
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { cn } from "@/lib/utils";

type SearchMode = "album" | "year";

function resultHref(result: KnownSearchResult): string {
  return `/albums/${result.id}`;
}

function releaseYear(releaseDate?: string): string | null {
  return releaseDate ? releaseDate.slice(0, 4) : null;
}

function resultSubtitle(artistName: string | undefined, releaseDate?: string): string {
  return [artistName?.toUpperCase(), releaseYear(releaseDate)].filter(Boolean).join(" · ");
}

function debugEndpoints(results: SearchResultItem[]): string[] {
  const endpoints = new Set<string>();
  for (const result of results) {
    if (result.kind === "known") {
      endpoints.add("Banco local (Supabase) — nenhuma chamada externa");
    } else {
      endpoints.add(result.sourceUrl);
      endpoints.add(result.musicBrainzUrl);
    }
  }
  return Array.from(endpoints);
}

export function SearchForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("album");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "year") {
      setIsNavigating(true);
      router.push(`/years/${query.trim()}`);
      return;
    }

    setIsSearching(true);
    try {
      setResults(await searchCatalog(query));
    } catch {
      setError("Não foi possível buscar. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCandidateSelect(candidate: CandidateSearchResult) {
    setError(null);
    setResolvingId(candidate.externalId);
    try {
      const outcome = await resolveSearchCandidate(candidate.query, candidate.externalId);

      if (outcome.state === "error") {
        setError(outcome.message);
        return;
      }

      setIsNavigating(true);
      router.push(`/albums/${outcome.albumId}`);
    } catch {
      setError("Não foi possível adicionar este álbum. Tente novamente.");
    } finally {
      setResolvingId(null);
    }
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
            onClick={() => setMode("year")}
            className={cn("transition-colors", mode === "year" ? "text-[#d1145a]" : "text-[#6b6577] hover:text-[#d1145a]")}
          >
            ANO
          </button>
        </div>
        <div className="flex items-center gap-4 border-b border-[#171420]/[0.22] px-0.5 pb-3.5">
          <span className="h-3.5 w-3.5 flex-none rounded-full border-[1.6px] border-[#d1145a]" />
          <input
            role="searchbox"
            type="search"
            inputMode={mode === "year" ? "numeric" : "text"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === "year" ? "digite um ano, ex: 1986..." : "digite um artista, álbum ou ano..."}
            disabled={isSearching || isNavigating}
            className="w-full border-0 bg-transparent text-base text-[#171420] outline-none placeholder:text-[#a8a2b0] disabled:opacity-60"
          />
          <button type="submit" disabled={isSearching || isNavigating} className="sr-only">
            Buscar
          </button>
        </div>
      </form>

      {isSearching && <LoadingIndicator label="Buscando..." className="mt-4" />}
      {isNavigating && <LoadingIndicator label={mode === "year" ? "Abrindo ano..." : "Abrindo álbum..."} className="mt-4" />}

      {error && <p className="mt-4 text-[#d1145a]">{error}</p>}

      {results !== null && results.length === 0 && (
        <p className="mt-4 font-light text-[#443f4f]">Nenhum resultado encontrado.</p>
      )}

      {results !== null && results.length > 0 && (
        <ul className="mt-4 flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {results.map((result) =>
            result.kind === "known" ? (
              <li key={`known-${result.id}`}>
                <Link
                  href={resultHref(result)}
                  className="block rounded-lg border border-white/90 bg-white/50 p-3 backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 hover:bg-white/70"
                >
                  <span className="font-serif text-lg text-[#120f18]">{result.title}</span>
                  {resultSubtitle(result.artistName, result.releaseDate) && (
                    <span className="block font-mono text-[10px] tracking-[0.18em] text-[#6b6577]">
                      {resultSubtitle(result.artistName, result.releaseDate)}
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
                    {resultSubtitle(result.artistName, result.releaseDate)}
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

      {isAdmin && results !== null && (
        <details className="mt-6 rounded-lg border border-white/90 bg-white/50 p-3 backdrop-blur-xl">
          <summary className="cursor-pointer font-mono text-[10px] tracking-[0.18em] text-[#6b6577]">
            DEBUG: RETORNO BRUTO DO ENDPOINT
          </summary>
          <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-[#6b6577]">ENDPOINTS CHAMADOS:</p>
          <ul className="mt-1 list-disc pl-4 font-mono text-[11px] text-[#443f4f]">
            {debugEndpoints(results).map((endpoint) => (
              <li key={endpoint} className="break-all">
                {endpoint}
              </li>
            ))}
          </ul>
          <pre className="mt-3 max-h-[400px] overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-[#443f4f]">
            {JSON.stringify(results, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
