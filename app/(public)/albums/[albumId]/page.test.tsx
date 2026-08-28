import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn().mockResolvedValue({ data: { user: null } })
}));
vi.mock("../../../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({ auth: { getUser: getUserMock } })
}));

import AlbumPage from "./page";
import * as albumContextAction from "../../../actions/album-context";

const readyTechnicalBody = {
  header: { title: "Control", artist: "Janet Jackson", releaseDate: "1986-02-04", trackCount: 9, hook: "Janet toma as rédeas da própria carreira." },
  tracks: [
    { id: "track-1", album_id: "album-1", title: "Control", track_number: 1 },
    { id: "track-2", album_id: "album-1", title: "Nasty", track_number: 2 }
  ],
  credits: [{ id: "cr1", album_id: "album-1", person_name: "Jimmy Jam", role: "Produção", source_id: "s1" }],
  otherAlbumsByArtist: [
    { albumId: "album-2", title: "Rhythm Nation 1814", releaseYear: "1989", isCurrent: false, description: null }
  ],
  sameEraAlbums: [],
  performance: null,
  listPlacements: [],
  era: {
    year: "1986",
    historicalEvents: [{ title: "Acidente do vaivém Challenger", date: "1986-01-28" }],
    news: [{ title: "Janet Jackson announces reissue tour", date: "2024-03-15", url: "https://example.com/news" }]
  },
  recommendations: [
    {
      id: "r1",
      albumId: "album-3",
      title: "True Blue",
      artistName: "Madonna",
      releaseYear: "1986",
      reason: "same_era" as const,
      explanation: "Lançado por volta da mesma época de Control."
    }
  ]
};

const readyNarrativeBody = {
  artistMoment: [{ text: "Janet estava se reinventando artisticamente.", kind: "interpretation" as const, sourceIds: [] }],
  worldContext: [{ text: "O desastre do Challenger chocou o mundo.", kind: "fact" as const, sourceIds: ["source-1"] }],
  musicalScene: [],
  receptionVsLegacy: [],
  summary: [],
  curiosities: [{ id: "c1", album_id: "album-1", summary: "Curiosidade de bastidor.", status: "unconfirmed" as const, source_id: "s1" }],
  influence: [{ id: "i1", artistName: "Missy Elliott", albumId: "album-2", explanation: "Definiu o new jack swing." }],
  failedFacets: [],
  pendingFacets: []
};

describe("AlbumPage", () => {
  it("does not show the admin delete button for a signed-out visitor", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({ state: "ready", body: readyTechnicalBody });
    vi.spyOn(albumContextAction, "getAlbumNarrative").mockResolvedValue({ state: "ready", body: readyNarrativeBody });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.queryByRole("button", { name: /excluir álbum/i })).not.toBeInTheDocument();
  });

  it("shows the admin delete button when signed in as the admin", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    getUserMock.mockResolvedValue({ data: { user: { email: "admin@example.com" } } });
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({ state: "ready", body: readyTechnicalBody });
    vi.spyOn(albumContextAction, "getAlbumNarrative").mockResolvedValue({ state: "ready", body: readyNarrativeBody });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByRole("button", { name: /excluir álbum/i })).toBeInTheDocument();
  });

  it("renders every mandatory section, including world context and influence, once narrative is ready", async () => {
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({ state: "ready", body: readyTechnicalBody });
    vi.spyOn(albumContextAction, "getAlbumNarrative").mockResolvedValue({ state: "ready", body: readyNarrativeBody });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByRole("heading", { name: "Control" })).toBeInTheDocument();
    const hookText = screen.getByText("Janet toma as rédeas da própria carreira.");
    expect(hookText).toBeInTheDocument();
    const albumSectionHeading = screen.getByRole("heading", { name: "O álbum" });
    expect(hookText.compareDocumentPosition(albumSectionHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/o desastre do challenger/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Era 1986" })).toBeInTheDocument();
    expect(screen.getByText("Acidente do vaivém Challenger")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /janet jackson announces reissue tour/i })).toHaveAttribute(
      "href",
      "https://example.com/news"
    );
    expect(screen.getByText(/dados de desempenho não disponíveis/i)).toBeInTheDocument();
    expect(screen.getByText("Curiosidade de bastidor.")).toBeInTheDocument();
    expect(screen.getByText("Missy Elliott")).toBeInTheDocument();
    expect(screen.getByText("Definiu o new jack swing.")).toBeInTheDocument();
    expect(screen.getByText("True Blue")).toBeInTheDocument();
    expect(screen.getByText("Madonna")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rhythm nation 1814/i })).toHaveAttribute("href", "/albums/album-2");

    const eraHeading = screen.getByRole("heading", { name: "Era 1986" });
    const curiosidadeText = screen.getByText("Curiosidade de bastidor.");
    const linhaDoTempoHeading = screen.getByRole("heading", { name: "Linha do tempo de Janet Jackson" });
    expect(curiosidadeText.compareDocumentPosition(eraHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(eraHeading.compareDocumentPosition(linhaDoTempoHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const challengerEvent = screen.getByText("Acidente do vaivém Challenger");
    const albumMarker = screen.getByText("4 DE FEVEREIRO DE 1986");
    expect(challengerEvent.compareDocumentPosition(albumMarker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the Listas section with each list name and position when the album is on at least one list", async () => {
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({
      state: "ready",
      body: {
        ...readyTechnicalBody,
        listPlacements: [{ listName: "Rolling Stone's 500 Greatest Albums of All Time", position: 78 }]
      }
    });
    vi.spyOn(albumContextAction, "getAlbumNarrative").mockResolvedValue({ state: "ready", body: readyNarrativeBody });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByRole("heading", { name: "Listas" })).toBeInTheDocument();
    expect(screen.getByText("Rolling Stone's 500 Greatest Albums of All Time")).toBeInTheDocument();
    expect(screen.getByText("#78")).toBeInTheDocument();
  });

  it("hides the Listas section entirely when the album is on no list", async () => {
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({ state: "ready", body: readyTechnicalBody });
    vi.spyOn(albumContextAction, "getAlbumNarrative").mockResolvedValue({ state: "ready", body: readyNarrativeBody });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.queryByRole("heading", { name: "Listas" })).not.toBeInTheDocument();
  });

  it("renders the technical sheet immediately with loading placeholders while narrative is not started", async () => {
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({ state: "ready", body: readyTechnicalBody });
    vi.spyOn(albumContextAction, "getAlbumNarrative").mockResolvedValue({ state: "not_started" });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByRole("heading", { name: "Control" })).toBeInTheDocument();
    expect(screen.getAllByText(/buscando conteúdo/i).length).toBeGreaterThan(0);
  });

  it("renders a not-found message for an unknown album", async () => {
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({ state: "not_found" });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "unknown" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText(/não encontrado/i)).toBeInTheDocument();
  });

  it("renders an error message when the technical sheet fails to load", async () => {
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({ state: "error", message: "boom" });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
  });

  it("highlights the track identified by the ?track= search param", async () => {
    vi.spyOn(albumContextAction, "getAlbumTechnicalSheet").mockResolvedValue({ state: "ready", body: readyTechnicalBody });
    vi.spyOn(albumContextAction, "getAlbumNarrative").mockResolvedValue({ state: "ready", body: readyNarrativeBody });

    const element = await AlbumPage({
      params: Promise.resolve({ albumId: "album-1" }),
      searchParams: Promise.resolve({ track: "track-2" })
    });
    render(element);

    expect(screen.getByText("Nasty").closest("div[data-highlighted]")).toHaveAttribute("data-highlighted", "true");
    const trackTitleControl = screen.getAllByText("Control").find((el) => el.closest("div[data-highlighted]"));
    expect(trackTitleControl?.closest("div[data-highlighted]")).toHaveAttribute("data-highlighted", "false");
  });
});
