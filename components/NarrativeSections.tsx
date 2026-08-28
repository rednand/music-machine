"use client";

import type { NarrativeResult } from "@/app/actions/album-context";
import type { NarrativeFacet } from "@/app/lib/ai/narrative";
import { NarrativeSection } from "@/components/NarrativeSection";
import { CategoryCardGrid } from "@/components/CategoryCardGrid";
import { ReceptionSplit } from "@/components/ReceptionSplit";
import { InfluenceList } from "@/components/InfluenceList";
import { CuriositiesList } from "@/components/CuriositiesList";
import { SectionCard } from "@/components/SectionCard";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { useNarrativeResult } from "@/components/useNarrativeResult";

const WORLD_CONTEXT_LABELS = ["Política", "Cultura", "Tecnologia"];
const GENERATION_ERROR_MESSAGE = "Não foi possível gerar este conteúdo agora.";

function LoadingSection({ title }: { title: string }) {
  return (
    <SectionCard title={title}>
      <LoadingIndicator label="Buscando conteúdo..." />
    </SectionCard>
  );
}

function ErrorSection({ title }: { title: string }) {
  return (
    <SectionCard title={title}>
      <p className="font-sans text-sm font-light text-[#6b6577]">
        {GENERATION_ERROR_MESSAGE}
      </p>
    </SectionCard>
  );
}

export function NarrativeSections({
  albumId,
  initial,
  year,
  children,
}: {
  albumId: string;
  initial: NarrativeResult;
  year: string;
  children?: React.ReactNode;
}) {
  const result = useNarrativeResult(albumId, initial);

  const isLoading =
    result.state === "not_started" || result.state === "in_progress";
  const isGroupError = result.state === "error" || result.state === "not_found";
  const failedFacets: NarrativeFacet[] =
    result.state === "ready" ? result.body.failedFacets : [];
  const pendingFacets: NarrativeFacet[] =
    result.state === "ready" ? result.body.pendingFacets : [];

  const artistMoment = result.state === "ready" ? result.body.artistMoment : [];
  const worldContext = result.state === "ready" ? result.body.worldContext : [];
  const receptionVsLegacy =
    result.state === "ready" ? result.body.receptionVsLegacy : [];
  const influence = result.state === "ready" ? result.body.influence : [];
  const curiosities = result.state === "ready" ? result.body.curiosities : [];

  const worldContextTitle = `O mundo em ${year}`;

  return (
    <>
      <div id="artista">
        {isLoading || pendingFacets.includes("artist_moment") ? (
          <LoadingSection title="O momento do artista" />
        ) : isGroupError || failedFacets.includes("artist_moment") ? (
          <ErrorSection title="O momento do artista" />
        ) : (
          <NarrativeSection
            title="O momento do artista"
            statements={artistMoment}
          />
        )}
      </div>

      <div id="mundo">
        {isLoading || pendingFacets.includes("world_context") ? (
          <LoadingSection title={worldContextTitle} />
        ) : isGroupError || failedFacets.includes("world_context") ? (
          <ErrorSection title={worldContextTitle} />
        ) : (
          <CategoryCardGrid
            title={worldContextTitle}
            statements={worldContext}
            labels={WORLD_CONTEXT_LABELS}
          />
        )}
      </div>

      {children}

      <div id="legado">
        {isLoading || pendingFacets.includes("reception_vs_legacy") ? (
          <LoadingSection title="Recepção então x legado hoje" />
        ) : isGroupError || failedFacets.includes("reception_vs_legacy") ? (
          <ErrorSection title="Recepção então x legado hoje" />
        ) : (
          <ReceptionSplit
            title="Recepção então x legado hoje"
            statements={receptionVsLegacy}
          />
        )}
      </div>

      {isLoading ? (
        <LoadingSection title="Influência" />
      ) : isGroupError ? (
        <ErrorSection title="Influência" />
      ) : (
        influence.length > 0 && (
          <SectionCard id="influencia" title="Influência">
            <InfluenceList influences={influence} />
          </SectionCard>
        )
      )}

      {isLoading ? (
        <LoadingSection title="Curiosidades" />
      ) : isGroupError ? (
        <ErrorSection title="Curiosidades" />
      ) : (
        curiosities.length > 0 && (
          <SectionCard id="curiosidades" title="Curiosidades">
            <CuriositiesList curiosities={curiosities} />
          </SectionCard>
        )
      )}
    </>
  );
}
