"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  availableDecades,
  availableGenres,
  filterLotteryPool,
  pickRandom,
  type LotteryEntry
} from "@/app/lib/discovery/lottery";
import { searchCatalog, resolveSearchCandidate } from "@/app/actions/search";
import { LoadingIndicator } from "@/components/LoadingIndicator";

const ANY_GENRE = "todos";
const ANY_DECADE = "todas";

function matchKey(artistName: string, title: string): string {
  return `${artistName.trim().toLowerCase()}|${title.trim().toLowerCase()}`;
}

export function LotteryScreen({ pool }: { pool: LotteryEntry[] }) {
  const router = useRouter();
  const [genre, setGenre] = useState(ANY_GENRE);
  const [decade, setDecade] = useState(ANY_DECADE);
  const [result, setResult] = useState<LotteryEntry | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const genres = useMemo(() => availableGenres(pool), [pool]);
  const decades = useMemo(() => availableDecades(pool), [pool]);

  const filtered = useMemo(
    () => filterLotteryPool(pool, genre === ANY_GENRE ? null : genre, decade === ANY_DECADE ? null : decade),
    [pool, genre, decade]
  );

  function handleDraw() {
    setAddError(null);
    setHasDrawn(true);
    setResult(pickRandom(filtered));
  }

  async function handleAddAlbum(entry: LotteryEntry) {
    setAddError(null);
    setIsAdding(true);
    try {
      const results = await searchCatalog(`${entry.artistName} ${entry.albumTitle}`);
      if (results.length === 0) {
        setAddError("Não encontramos esse álbum no Deezer. Tente buscar manualmente na Home.");
        return;
      }

      const targetKey = matchKey(entry.artistName, entry.albumTitle);
      const best =
        results.find((candidate) => matchKey(candidate.artistName ?? "", candidate.title) === targetKey) ?? results[0];

      if (best.kind === "known") {
        router.push(`/albums/${best.id}`);
        return;
      }

      const outcome = await resolveSearchCandidate(best.query, best.externalId);
      if (outcome.state === "error") {
        setAddError(outcome.message);
        return;
      }
      router.push(`/albums/${outcome.albumId}`);
    } catch {
      setAddError("Não foi possível adicionar este álbum. Tente novamente.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-5">
        {genres.length > 0 && (
          <div>
            <label htmlFor="lottery-genre" className="font-mono text-[10px] tracking-[0.2em] text-[#6b6577]">
              GÊNERO (só no seu acervo)
            </label>
            <select
              id="lottery-genre"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-white/90 bg-white/70 px-3 py-2 font-sans text-sm text-[#171420] outline-none"
            >
              <option value={ANY_GENRE}>Todos</option>
              {genres.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        )}

        {decades.length > 0 && (
          <div>
            <label htmlFor="lottery-decade" className="font-mono text-[10px] tracking-[0.2em] text-[#6b6577]">
              DÉCADA (só no seu acervo)
            </label>
            <select
              id="lottery-decade"
              value={decade}
              onChange={(event) => setDecade(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-white/90 bg-white/70 px-3 py-2 font-sans text-sm text-[#171420] outline-none"
            >
              <option value={ANY_DECADE}>Todas</option>
              {decades.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={handleDraw}
          className="rounded-full px-6 py-2.5 font-mono text-[11px] tracking-[0.22em] text-white shadow-[0_8px_20px_-8px_rgba(209,20,90,0.6)]"
          style={{ background: "linear-gradient(150deg, #ff7fae, #d1145a)" }}
        >
          {hasDrawn ? "SORTEAR DE NOVO" : "SORTEAR"}
        </button>
      </div>

      <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-[#a8a2b0]">
        {`${filtered.length} ${filtered.length === 1 ? "ÁLBUM ELEGÍVEL" : "ÁLBUNS ELEGÍVEIS"}`}
      </p>

      {hasDrawn && filtered.length === 0 && (
        <p className="mt-8 font-light text-[#443f4f]">Nenhum álbum encontrado com esses filtros.</p>
      )}

      {result && (
        <div className="mt-8 rounded-2xl border border-white/90 bg-white/50 p-6 backdrop-blur-xl">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#6b6577]">HOJE VOCÊ VAI OUVIR</p>
          <h3 className="mt-2 font-serif text-2xl text-[#120f18]">{result.albumTitle}</h3>
          <p className="mt-1 font-mono text-[11px] tracking-[0.18em] text-[#6b6577]">
            {result.artistName.toUpperCase()}
            {result.releaseYear ? ` · ${result.releaseYear}` : ""}
          </p>

          <ul className="mt-5 flex flex-col gap-2">
            {result.placements.map((placement) => (
              <li
                key={placement.listName}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/90 bg-white/50 px-4 py-2.5 backdrop-blur-xl"
              >
                <span className="font-sans text-sm text-[#443f4f]">{placement.listName}</span>
                <span className="font-mono text-xs tracking-[0.18em] text-[#d1145a]">#{placement.position}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {result.albumId ? (
              <Link
                href={`/albums/${result.albumId}`}
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-[#d1145a] transition-colors hover:text-[#120f18]"
              >
                VER PÁGINA DO ÁLBUM →
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleAddAlbum(result)}
                disabled={isAdding}
                className="font-mono text-[11px] tracking-[0.2em] text-[#d1145a] transition-colors hover:text-[#120f18] disabled:opacity-60"
              >
                BUSCAR E ADICIONAR ESTE ÁLBUM
              </button>
            )}
            {isAdding && <LoadingIndicator label="Buscando..." className="mt-3" />}
            {addError && <p className="mt-3 font-sans text-sm text-[#d1145a]">{addError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
