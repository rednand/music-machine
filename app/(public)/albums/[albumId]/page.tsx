import Link from "next/link";
import { getAlbumContext } from "@/app/actions/album-context";
import { Header } from "@/components/Header";
import { AlbumTabs } from "@/components/AlbumTabs";
import { AlbumInfoCards } from "@/components/AlbumInfoCards";
import { TrackList } from "@/components/TrackList";
import { CreditsList } from "@/components/CreditsList";
import { NarrativeSection } from "@/components/NarrativeSection";
import { PerformancePanel } from "@/components/PerformancePanel";
import { CuriositiesList } from "@/components/CuriositiesList";
import { InfluenceList } from "@/components/InfluenceList";
import { RecommendationsList } from "@/components/RecommendationsList";
import { OtherAlbumsByArtist } from "@/components/OtherAlbumsByArtist";

function NumberedSection({
  id,
  title,
  children
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="relative mb-8 overflow-hidden rounded-xl border border-white/90 bg-white/50 p-8 backdrop-blur-xl"
      style={{ boxShadow: "0 34px 60px -44px rgba(23,20,32,0.35)" }}
    >
      <h2 className="relative z-10 mb-5 font-heading text-2xl font-extrabold text-[#120f18]">{title}</h2>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export default async function AlbumPage({
  params,
  searchParams
}: {
  params: Promise<{ albumId: string }>;
  searchParams: Promise<{ track?: string }>;
}) {
  const { albumId } = await params;
  const { track } = await searchParams;
  const result = await getAlbumContext(albumId);

  if (result.state === "not_found") {
    return <p className="p-6">Álbum não encontrado.</p>;
  }

  if (result.state === "pending") {
    return <p className="p-6">Ainda estamos preparando o contexto deste álbum...</p>;
  }

  const { body } = result;
  const year = body.header.releaseDate.slice(0, 4);

  return (
    <div className="relative mx-auto max-w-[980px] px-6 py-[74px] pb-[140px] md:px-[clamp(24px,4vw,72px)] md:pl-[clamp(104px,9vw,140px)]">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
      >
        ← ACERVO
      </Link>

      <Header header={body.header} />

      <div className="mt-10">
        <AlbumTabs />
      </div>

      <div className="mt-10">
        <NumberedSection id="album" title="O álbum">
          <AlbumInfoCards releaseDate={body.header.releaseDate} label={body.header.label} credits={body.credits} />
          <div className="mt-6">
            <TrackList tracks={body.tracks} highlightedTrackId={track} />
          </div>
          <CreditsList credits={body.credits} />
        </NumberedSection>

        <div id="artista">
          <NarrativeSection title="O momento do artista" statements={body.artistMoment} />
        </div>

        <div id="mundo">
          <NarrativeSection title={`O mundo em ${year}`} statements={body.worldContext} />
        </div>

        <div id="cenario">
          <NarrativeSection title="O cenário musical" statements={body.musicalScene} />
        </div>

        <NumberedSection id="desempenho" title="Desempenho">
          <PerformancePanel records={body.performance} />
        </NumberedSection>

        <div id="legado">
          <NarrativeSection title="Recepção então x legado hoje" statements={body.receptionVsLegacy} />
        </div>

        <NumberedSection id="influencia" title="Influência">
          <InfluenceList influences={body.influence} />
        </NumberedSection>

        <NumberedSection id="curiosidades" title="Curiosidades">
          <CuriositiesList curiosities={body.curiosities} />
        </NumberedSection>

        <NumberedSection id="linha-do-tempo" title={`Linha do tempo de ${body.header.artist}`}>
          <OtherAlbumsByArtist albums={body.otherAlbumsByArtist} />
        </NumberedSection>

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
