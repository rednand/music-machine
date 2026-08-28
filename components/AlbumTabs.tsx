"use client";

import type { NarrativeResult } from "@/app/actions/album-context";
import type { NarrativeFacet } from "@/app/lib/ai/narrative";
import { useNarrativeResult } from "@/components/useNarrativeResult";

const TABS = [
  { id: "album", label: "ÁLBUM" },
  { id: "artista", label: "ARTISTA" },
  { id: "mundo", label: "MUNDO" },
  { id: "cenario", label: "CENÁRIO" },
  { id: "desempenho", label: "DESEMPENHO" },
  { id: "legado", label: "LEGADO" },
  { id: "influencia", label: "INFLUÊNCIA" },
  { id: "curiosidades", label: "CURIOSIDADES" },
  { id: "era", label: "ERA" },
  { id: "linha-do-tempo", label: "LINHA DO TEMPO" }
];

export function AlbumTabs({
  albumId,
  initial,
  hasSameEraAlbums,
  hasOtherAlbumsByArtist,
  hasEra
}: {
  albumId: string;
  initial: NarrativeResult;
  hasSameEraAlbums: boolean;
  hasOtherAlbumsByArtist: boolean;
  hasEra: boolean;
}) {
  const result = useNarrativeResult(albumId, initial);

  const isLoading = result.state === "not_started" || result.state === "in_progress";
  const isGroupError = result.state === "error" || result.state === "not_found";
  const body = result.state === "ready" ? result.body : null;
  const failedFacets: NarrativeFacet[] = body?.failedFacets ?? [];
  const pendingFacets: NarrativeFacet[] = body?.pendingFacets ?? [];

  function facetVisible(facet: NarrativeFacet, statements: { length: number } | undefined): boolean {
    return (
      isLoading ||
      isGroupError ||
      pendingFacets.includes(facet) ||
      failedFacets.includes(facet) ||
      Boolean(statements && statements.length > 0)
    );
  }

  function groupVisible(items: { length: number } | undefined): boolean {
    return isLoading || isGroupError || Boolean(items && items.length > 0);
  }

  const visible: Record<string, boolean> = {
    album: true,
    artista: facetVisible("artist_moment", body?.artistMoment),
    mundo: facetVisible("world_context", body?.worldContext),
    era: hasEra,
    cenario: hasSameEraAlbums,
    desempenho: true,
    legado: facetVisible("reception_vs_legacy", body?.receptionVsLegacy),
    influencia: groupVisible(body?.influence),
    curiosidades: groupVisible(body?.curiosities),
    "linha-do-tempo": hasOtherAlbumsByArtist
  };

  return (
    <nav className="flex flex-wrap gap-[26px] border-y border-[#171420]/[0.12] px-0.5 py-4">
      {TABS.filter((tab) => visible[tab.id]).map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          className="font-mono text-[9.5px] tracking-[0.2em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
