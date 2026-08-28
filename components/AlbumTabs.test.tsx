import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/album-context", () => ({
  getAlbumNarrative: vi.fn()
}));

import { AlbumTabs } from "./AlbumTabs";

const readyBody = {
  artistMoment: [{ text: "Momento do artista.", kind: "fact" as const, sourceIds: [] }],
  worldContext: [{ text: "Contexto de mundo.", kind: "fact" as const, sourceIds: [] }],
  musicalScene: [],
  receptionVsLegacy: [{ text: "No lançamento.", kind: "fact" as const, sourceIds: [] }],
  summary: [],
  curiosities: [{ id: "c1", album_id: "album-1", summary: "Curiosidade.", status: "unconfirmed" as const, source_id: "s1" }],
  influence: [{ id: "i1", artistName: "Missy Elliott", explanation: "Influência." }],
  failedFacets: [],
  pendingFacets: []
};

describe("AlbumTabs", () => {
  it("renders a link for every section that has content, anchored to that section's id", () => {
    render(
      <AlbumTabs
        albumId="album-1"
        initial={{ state: "ready", body: readyBody }}
        hasSameEraAlbums={true}
        hasOtherAlbumsByArtist={true}
        hasEra={true}
      />
    );

    expect(screen.getByRole("link", { name: "ÁLBUM" })).toHaveAttribute("href", "#album");
    expect(screen.getByRole("link", { name: "ERA" })).toHaveAttribute("href", "#era");
    expect(screen.getByRole("link", { name: "LINHA DO TEMPO" })).toHaveAttribute("href", "#linha-do-tempo");
    expect(screen.getAllByRole("link")).toHaveLength(10);
  });

  it("shows every AI-dependent tab while the narrative is still loading, since those sections still render a placeholder", () => {
    render(
      <AlbumTabs
        albumId="album-1"
        initial={{ state: "not_started" }}
        hasSameEraAlbums={false}
        hasOtherAlbumsByArtist={false}
        hasEra={false}
      />
    );

    expect(screen.getByRole("link", { name: "ARTISTA" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "MUNDO" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LEGADO" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INFLUÊNCIA" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CURIOSIDADES" })).toBeInTheDocument();
  });

  it("hides the Influência and Curiosidades tabs when there is no data for them", () => {
    render(
      <AlbumTabs
        albumId="album-1"
        initial={{ state: "ready", body: { ...readyBody, influence: [], curiosities: [] } }}
        hasSameEraAlbums={true}
        hasOtherAlbumsByArtist={true}
        hasEra={true}
      />
    );

    expect(screen.queryByRole("link", { name: "INFLUÊNCIA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "CURIOSIDADES" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ARTISTA" })).toBeInTheDocument();
  });

  it("keeps a tab visible while its facet is still pending, even once the overall result is ready", () => {
    render(
      <AlbumTabs
        albumId="album-1"
        initial={{
          state: "ready",
          body: { ...readyBody, receptionVsLegacy: [], pendingFacets: ["reception_vs_legacy"] }
        }}
        hasSameEraAlbums={true}
        hasOtherAlbumsByArtist={true}
        hasEra={true}
      />
    );

    expect(screen.getByRole("link", { name: "LEGADO" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ARTISTA" })).toBeInTheDocument();
  });

  it("hides the Cenário, Era, and Linha do tempo tabs when there is no data for them", () => {
    render(
      <AlbumTabs
        albumId="album-1"
        initial={{ state: "ready", body: readyBody }}
        hasSameEraAlbums={false}
        hasOtherAlbumsByArtist={false}
        hasEra={false}
      />
    );

    expect(screen.queryByRole("link", { name: "CENÁRIO" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ERA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "LINHA DO TEMPO" })).not.toBeInTheDocument();
  });

  it("always shows the Álbum and Desempenho tabs regardless of narrative state", () => {
    render(
      <AlbumTabs
        albumId="album-1"
        initial={{ state: "error" }}
        hasSameEraAlbums={false}
        hasOtherAlbumsByArtist={false}
        hasEra={false}
      />
    );

    expect(screen.getByRole("link", { name: "ÁLBUM" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DESEMPENHO" })).toBeInTheDocument();
  });
});
