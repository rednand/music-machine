"use client";

import { useMemo, useState } from "react";
import type { DiscoveryPageEntry } from "@/app/lib/discovery/collection";
import { AlbumCard } from "@/components/AlbumCard";

type SortMode = "recent" | "title-asc" | "artist-asc" | "year-desc" | "year-asc";

const SORT_LABELS: Record<SortMode, string> = {
  recent: "Adicionados recentemente",
  "title-asc": "Título (A-Z)",
  "artist-asc": "Artista (A-Z)",
  "year-desc": "Ano (mais recente)",
  "year-asc": "Ano (mais antigo)"
};

function sortEntries(entries: DiscoveryPageEntry[], sort: SortMode): DiscoveryPageEntry[] {
  if (sort === "recent") {
    return entries;
  }

  const sorted = [...entries];
  switch (sort) {
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "artist-asc":
      return sorted.sort((a, b) => a.artistName.localeCompare(b.artistName));
    case "year-desc":
      return sorted.sort((a, b) => b.releaseYear.localeCompare(a.releaseYear));
    case "year-asc":
      return sorted.sort((a, b) => a.releaseYear.localeCompare(b.releaseYear));
  }
}

export function AcervoBrowser({ entries }: { entries: DiscoveryPageEntry[] }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("todos");
  const [sort, setSort] = useState<SortMode>("recent");

  const genres = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.genre).filter((value): value is string => Boolean(value)))).sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const byQueryAndGenre = entries.filter((entry) => {
      const matchesGenre = genre === "todos" || entry.genre === genre;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        entry.title.toLowerCase().includes(normalizedQuery) ||
        entry.artistName.toLowerCase().includes(normalizedQuery);
      return matchesGenre && matchesQuery;
    });
    return sortEntries(byQueryAndGenre, sort);
  }, [entries, query, genre, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="acervo-search" className="font-mono text-[10px] tracking-[0.2em] text-[#6b6577]">
            BUSCAR
          </label>
          <input
            id="acervo-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="título ou artista..."
            className="mt-2 w-full border-0 border-b border-[#171420]/[0.22] bg-transparent pb-2.5 text-base text-[#171420] outline-none placeholder:text-[#a8a2b0]"
          />
        </div>

        {genres.length > 0 && (
          <div>
            <label htmlFor="acervo-genre" className="font-mono text-[10px] tracking-[0.2em] text-[#6b6577]">
              GÊNERO
            </label>
            <select
              id="acervo-genre"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-white/90 bg-white/70 px-3 py-2 font-sans text-sm text-[#171420] outline-none"
            >
              <option value="todos">Todos</option>
              {genres.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="acervo-sort" className="font-mono text-[10px] tracking-[0.2em] text-[#6b6577]">
            ORDENAR
          </label>
          <select
            id="acervo-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="mt-2 block w-full rounded-lg border border-white/90 bg-white/70 px-3 py-2 font-sans text-sm text-[#171420] outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((value) => (
              <option key={value} value={value}>
                {SORT_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-[#a8a2b0]">
        {`${filtered.length} ${filtered.length === 1 ? "ÁLBUM" : "ÁLBUNS"}`}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-8 font-light text-[#443f4f]">Nenhum álbum encontrado com esses filtros.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-[18px]">
          {filtered.map((entry) => (
            <li key={entry.albumId}>
              <AlbumCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
