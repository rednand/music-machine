import Link from "next/link";
import { getDiscoveryPage } from "@/app/actions/discovery";
import { SearchForm } from "@/components/SearchForm";
import { FeaturedAlbumCard, MAX_FEATURED_CARDS } from "@/components/FeaturedAlbumCard";
import { CollectionList } from "@/components/CollectionList";

export default async function DiscoverPage() {
  const result = await getDiscoveryPage();

  const covers = result.state === "ready" ? result.collection.slice(0, MAX_FEATURED_CARDS) : [];
  const ticker = covers.slice(0, 3);

  return (
    <div className="relative mx-auto max-w-[1560px] px-6 py-[74px] pb-[140px] md:pl-0 md:pr-[clamp(24px,4vw,72px)]">
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.55fr)_minmax(190px,340px)] md:gap-[clamp(24px,3vw,56px)]">
        <div>
          <div className="inline-flex items-center gap-[10px] font-mono text-[10.5px] tracking-[0.26em] text-[#0d7a5c]">
            <span className="h-[5px] w-[5px] rounded-full bg-[#0d7a5c]" />
            MÁQUINA DO TEMPO · CONTEXTO DE ÁLBUNS
          </div>
          <h1 className="mt-[30px] max-w-full font-heading text-[clamp(40px,6.2vw,120px)] font-extrabold leading-[0.84] tracking-[-0.05em] text-[#120f18]">
            <span className="block w-fit max-w-full">
              <span className="block">VIAJE</span>
              <span className="ml-[0.36em] block whitespace-nowrap text-[#d1145a]">NO TEMPO</span>
              <span className="mt-[0.5em] block text-right text-[0.24em] font-normal italic leading-[1.2] tracking-[-0.01em] text-[#443f4f]">
                através da música
              </span>
            </span>
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
          <div className="relative min-h-[470px] w-full">
            {covers.map((entry, index) => (
              <FeaturedAlbumCard key={entry.albumId} entry={entry} index={index} />
            ))}
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
            <h2 className="font-heading text-[46px] font-extrabold tracking-[-0.025em] text-[#120f18]">O acervo</h2>
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
