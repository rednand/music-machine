import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import AlbumPage from "./page";
import * as albumContextAction from "../../../actions/album-context";

const readyBody = {
  header: { title: "Control", artist: "Janet Jackson", releaseDate: "1986-02-04", trackCount: 9, hook: "Janet toma as rédeas da própria carreira." },
  tracks: [
    { id: "track-1", album_id: "album-1", title: "Control", track_number: 1 },
    { id: "track-2", album_id: "album-1", title: "Nasty", track_number: 2 }
  ],
  credits: [{ id: "cr1", album_id: "album-1", person_name: "Jimmy Jam", role: "Produção", source_id: "s1" }],
  otherAlbumsByArtist: [{ albumId: "album-2", title: "Rhythm Nation 1814", releaseYear: "1989" }],
  artistMoment: [{ text: "Janet estava se reinventando artisticamente.", kind: "interpretation" as const, sourceIds: [] }],
  worldContext: [{ text: "O desastre do Challenger chocou o mundo.", kind: "fact" as const, sourceIds: ["source-1"] }],
  musicalScene: [],
  performance: null,
  receptionVsLegacy: [],
  curiosities: [{ id: "c1", album_id: "album-1", summary: "Curiosidade de bastidor.", status: "unconfirmed" as const, source_id: "s1" }],
  influence: [{ id: "i1", from_album_id: "album-1", to_album_id: "album-2", explanation: "Definiu o new jack swing.", source_id: "s1" }],
  recommendations: [
    {
      id: "r1",
      subject_album_id: "album-1",
      recommended_album_id: "album-3",
      reason: "same_era" as const,
      explanation: "Lançado por volta da mesma época de Control."
    }
  ]
};

describe("AlbumPage", () => {
  it("renders every mandatory section, including world context and influence", async () => {
    vi.spyOn(albumContextAction, "getAlbumContext").mockResolvedValue({ state: "ready", body: readyBody });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByRole("heading", { name: "Control" })).toBeInTheDocument();
    expect(screen.getByText(/o desastre do challenger/i)).toBeInTheDocument();
    expect(screen.getByText(/dados de desempenho não disponíveis/i)).toBeInTheDocument();
    expect(screen.getByText("Curiosidade de bastidor.")).toBeInTheDocument();
    expect(screen.getByText("Definiu o new jack swing.")).toBeInTheDocument();
    expect(screen.getByText("Lançado por volta da mesma época de Control.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rhythm nation 1814/i })).toHaveAttribute("href", "/albums/album-2");
  });

  it("shows a preparing message while the context is pending", async () => {
    vi.spyOn(albumContextAction, "getAlbumContext").mockResolvedValue({ state: "pending" });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "album-1" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText(/preparando/i)).toBeInTheDocument();
  });

  it("renders a not-found message for an unknown album", async () => {
    vi.spyOn(albumContextAction, "getAlbumContext").mockResolvedValue({ state: "not_found" });

    const element = await AlbumPage({ params: Promise.resolve({ albumId: "unknown" }), searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText(/não encontrado/i)).toBeInTheDocument();
  });

  it("highlights the track identified by the ?track= search param", async () => {
    vi.spyOn(albumContextAction, "getAlbumContext").mockResolvedValue({ state: "ready", body: readyBody });

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
