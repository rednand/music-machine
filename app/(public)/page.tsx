import Link from "next/link";
import { getDiscoveryPage } from "@/app/actions/discovery";
import { SearchForm } from "@/components/SearchForm";
import { FeaturedAlbumCard } from "@/components/FeaturedAlbumCard";
import { CollectionList } from "@/components/CollectionList";

export default async function DiscoverPage() {
  const result = await getDiscoveryPage();

  const covers = result.state === "ready" ? result.collection.slice(0, 4) : [];
  const ticker = result.state === "ready" ? result.collection.slice(0, 3) : [];
  const artistCount = result.state === "ready" ? new Set(result.collection.map((entry) => entry.artistName)).size : 0;

  return (
    <div className="relative mx-auto max-w-[1560px] px-6 py-[74px] pb-[140px] md:px-[clamp(24px,4vw,72px)] md:pl-[clamp(104px,9vw,140px)]">
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.55fr)_minmax(220px,360px)] md:gap-[clamp(28px,4vw,60px)]">
        <div>
          <div className="inline-flex items-center gap-[10px] font-mono text-[10.5px] tracking-[0.26em] text-[#0d7a5c]">
            <span className="h-[5px] w-[5px] rounded-full bg-[#0d7a5c]" />
            MÁQUINA DO TEMPO · CONTEXTO DE ÁLBUNS
          </div>
          <h1 className="mt-[34px] font-serif text-[clamp(50px,7.4vw,118px)] font-bold leading-[0.94] tracking-[-0.035em] text-[#120f18]">
            Escolha um ano
            <span className="block pl-[0.06em] font-medium italic tracking-[-0.02em] text-[#d1145a]">
              e viaje no tempo
            </span>
            <span className="block text-[#120f18]">pela música.</span>
          </h1>
          <p className="mt-10 max-w-[520px] text-[19px] font-light leading-[1.6] text-[#443f4f]">
            O que acontecia na vida do artista, no mundo e nas paradas quando o disco caiu — e como ele
            soa agora. Nada de resenha: só contexto.
          </p>

          <div className="mt-12">
            <SearchForm />
          </div>

          {result.state === "empty" && (
            <p className="mt-8 font-light text-[#443f4f]">
              Ainda não há álbuns no acervo. Busque um artista ou álbum para começar.
            </p>
          )}
        </div>

        {result.state === "ready" && (
          <div className="flex flex-col items-end gap-[30px]">
            <div className="grid w-full max-w-[340px] grid-cols-2 gap-3">
              {covers.map((entry) => (
                <FeaturedAlbumCard key={entry.albumId} entry={entry} />
              ))}
            </div>
            <div className="flex gap-[10px]">
              <span className="rounded-full border border-[#5a4ddb]/30 bg-white/60 px-[18px] py-[10px] font-mono text-[10px] tracking-[0.18em] text-[#5a4ddb] backdrop-blur-md">
                {result.collection.length} {result.collection.length === 1 ? "ÁLBUM" : "ÁLBUNS"}
              </span>
              <span className="rounded-full border border-[#0d7a5c]/30 bg-white/60 px-[18px] py-[10px] font-mono text-[10px] tracking-[0.18em] text-[#0d7a5c] backdrop-blur-md">
                {artistCount} {artistCount === 1 ? "ARTISTA" : "ARTISTAS"}
              </span>
            </div>
          </div>
        )}
      </div>

      {ticker.length > 0 && (
        <div className="mt-20 flex flex-wrap items-center gap-[30px] border-y border-[#171420]/[0.12] px-0.5 py-5">
          {ticker.map((entry) => (
            <Link
              key={entry.albumId}
              href={`/albums/${entry.albumId}`}
              className="inline-flex items-center gap-[14px] font-mono text-[10.5px] tracking-[0.2em] text-[#443f4f] transition-colors hover:text-[#d1145a]"
            >
              <span className="text-[#0d7a5c]">{entry.releaseYear}</span>
              <span>
                {entry.artistName.toUpperCase()} — {entry.title.toUpperCase()}
              </span>
              <span className="pl-4 text-[#d1145a]">✦</span>
            </Link>
          ))}
        </div>
      )}

      {result.state === "ready" && (
        <>
          <div className="mt-24 flex items-end justify-between">
            <h2 className="font-serif text-[54px] font-bold tracking-[-0.03em] text-[#120f18]">O acervo</h2>
            <span className="font-mono text-[10px] tracking-[0.26em] text-[#a8a2b0]">ROLE E ESCOLHA</span>
          </div>
          <div className="mt-9">
            <CollectionList entries={result.collection} />
          </div>
        </>
      )}
    </div>
  );
}
