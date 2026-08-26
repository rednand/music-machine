import Link from "next/link";
import { getDiscoveryPage } from "@/app/actions/discovery";
import { shuffleEntries } from "@/app/lib/discovery/collection";
import { getCurrentIsAdmin } from "@/app/lib/auth";
import { SearchForm } from "@/components/SearchForm";
import { FeaturedAlbumCard, MAX_FEATURED_CARDS } from "@/components/FeaturedAlbumCard";
import { CollectionList } from "@/components/CollectionList";

export default async function DiscoverPage() {
  const result = await getDiscoveryPage();
  const isAdmin = await getCurrentIsAdmin();

  const covers = result.state === "ready" ? shuffleEntries(result.collection, MAX_FEATURED_CARDS) : [];
  const ticker = covers.slice(0, 3);
  const collection = result.state === "ready" ? shuffleEntries(result.collection) : [];

  return (
    <div className="relative mx-auto max-w-[1560px] px-6 py-[74px] pb-[140px] md:pl-0 md:pr-[clamp(24px,4vw,72px)]">
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.55fr)_minmax(190px,340px)] md:gap-[clamp(24px,3vw,56px)]">
        <div className="min-w-0">
          <div className="mb-[26px] flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-disco-relogio.svg"
              alt=""
              aria-hidden="true"
              className="h-12 w-12 flex-none sm:h-[72px] sm:w-[72px]"
            />
            <h1 className="min-w-0 font-heading text-[clamp(22px,6.5vw,50px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#d1145a]">
              Discontexto
            </h1>
          </div>
          <p className="mt-10 max-w-[520px] text-[19px] font-light leading-[1.6] text-[#443f4f]">
            O que acontecia na vida do artista, no mundo e nas paradas quando o disco caiu — e como ele
            soa agora. Nada de resenha: só contexto.
          </p>

          <div className="mt-12">
            <SearchForm isAdmin={isAdmin} />
          </div>

          {result.state === "empty" && (
            <p className="mt-8 font-light text-[#443f4f]">
              Ainda não há álbuns no acervo. Busque um artista ou álbum para começar.
            </p>
          )}
        </div>

        {result.state === "ready" && (
          <div className="relative min-h-[470px] w-full min-w-0">
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
          <div className="mt-24 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <h2 className="font-heading text-[clamp(30px,8vw,46px)] font-extrabold tracking-[-0.025em] text-[#120f18]">
              O acervo
            </h2>
            <span className="font-mono text-[10px] tracking-[0.26em] text-[#a8a2b0]">ROLE E ESCOLHA</span>
          </div>
          <div className="mt-9">
            <CollectionList entries={collection} />
          </div>
        </>
      )}
    </div>
  );
}
