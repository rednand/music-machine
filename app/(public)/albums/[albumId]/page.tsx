import Link from "next/link";
import { getAlbumTechnicalSheet, getAlbumNarrative } from "@/app/actions/album-context";
import { getCurrentIsAdmin } from "@/app/lib/auth";
import { AdminDeleteAlbumButton } from "@/components/AdminDeleteAlbumButton";
import { Header } from "@/components/Header";
import { AlbumTabs } from "@/components/AlbumTabs";
import { AlbumInfoCards } from "@/components/AlbumInfoCards";
import { TrackList } from "@/components/TrackList";
import { CreditsList } from "@/components/CreditsList";
import { MusicalSceneGrid } from "@/components/MusicalSceneGrid";
import { SectionCard } from "@/components/SectionCard";
import { PerformancePanel } from "@/components/PerformancePanel";
import { RecommendationsList } from "@/components/RecommendationsList";
import { OtherAlbumsByArtist } from "@/components/OtherAlbumsByArtist";
import { NarrativeSections } from "@/components/NarrativeSections";
import { AlbumAmbientTint } from "@/components/AlbumAmbientTint";

export default async function AlbumPage({
  params,
  searchParams
}: {
  params: Promise<{ albumId: string }>;
  searchParams: Promise<{ track?: string }>;
}) {
  const { albumId } = await params;
  const { track } = await searchParams;
  const [result, narrative, isAdmin] = await Promise.all([
    getAlbumTechnicalSheet(albumId),
    getAlbumNarrative(albumId),
    getCurrentIsAdmin()
  ]);

  if (result.state === "not_found") {
    return <p className="p-6">Álbum não encontrado.</p>;
  }

  if (result.state === "error") {
    return <p className="p-6">Não foi possível carregar este álbum agora. Tente novamente em alguns instantes.</p>;
  }

  const { body } = result;
  const year = body.header.releaseDate.slice(0, 4);

  return (
    <div className="relative mx-auto max-w-[980px] px-6 py-[74px] pb-[140px] md:pl-0 md:pr-[clamp(24px,4vw,72px)]">
      <AlbumAmbientTint coverArtUrl={body.header.coverArtUrl} />
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
      >
        ← HOME
      </Link>

      <Header header={body.header} />

      {isAdmin && (
        <div className="mt-4">
          <AdminDeleteAlbumButton albumId={albumId} albumTitle={body.header.title} />
        </div>
      )}

      <div className="mt-10">
        <AlbumTabs />
      </div>

      {body.header.hook && (
        <p className="mt-8 font-sans text-lg font-light leading-relaxed text-[#443f4f]">{body.header.hook}</p>
      )}

      <div className="mt-10">
        <SectionCard id="album" title="O álbum">
          <AlbumInfoCards
            releaseDate={body.header.releaseDate}
            label={body.header.label}
            credits={body.credits}
            title={body.header.title}
            artistName={body.header.artist}
          />
          <div className="mt-6">
            <TrackList tracks={body.tracks} highlightedTrackId={track} />
          </div>
          <CreditsList credits={body.credits} />
        </SectionCard>

        <NarrativeSections albumId={albumId} initial={narrative} year={year}>
          <div id="cenario">
            <MusicalSceneGrid title="O cenário musical" albums={body.sameEraAlbums} />
          </div>

          <SectionCard id="desempenho" title="Desempenho">
            <PerformancePanel records={body.performance} />
          </SectionCard>
        </NarrativeSections>

        <SectionCard id="linha-do-tempo" title={`Linha do tempo de ${body.header.artist}`}>
          <OtherAlbumsByArtist albums={body.otherAlbumsByArtist} />
        </SectionCard>

        {body.recommendations.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 font-heading text-[32px] font-extrabold tracking-[-0.02em] text-[#120f18]">
              Explore também
            </h2>
            <RecommendationsList recommendations={body.recommendations} />
          </section>
        )}
      </div>
    </div>
  );
}
