import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/actions/album-context", () => ({
  getAlbumNarrative: vi.fn(),
}));

import { NarrativeSections } from "./NarrativeSections";
import * as albumContextAction from "@/app/actions/album-context";

const readyBody = {
  artistMoment: [
    { text: "Momento do artista.", kind: "fact" as const, sourceIds: [] },
  ],
  worldContext: [
    { text: "Contexto de mundo.", kind: "fact" as const, sourceIds: [] },
  ],
  musicalScene: [],
  receptionVsLegacy: [
    { text: "No lançamento.", kind: "fact" as const, sourceIds: [] },
  ],
  summary: [],
  curiosities: [
    {
      id: "c1",
      album_id: "album-1",
      summary: "Curiosidade.",
      status: "unconfirmed" as const,
      source_id: "s1",
    },
  ],
  influence: [
    { id: "i1", artistName: "Missy Elliott", explanation: "Influência." },
  ],
  failedFacets: [],
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("NarrativeSections", () => {
  it("shows a loading placeholder for each AI-dependent section while not started", () => {
    render(
      <NarrativeSections
        albumId="album-1"
        initial={{ state: "not_started" }}
        year="1986"
      />,
    );

    expect(
      screen.getAllByText(/buscando conteúdo/i).length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("renders content directly when the initial result is already ready", () => {
    render(
      <NarrativeSections
        albumId="album-1"
        initial={{ state: "ready", body: readyBody }}
        year="1986"
      />,
    );

    expect(screen.getByText("Momento do artista.")).toBeInTheDocument();
    expect(screen.getByText("Contexto de mundo.")).toBeInTheDocument();
    expect(screen.getByText("Curiosidade.")).toBeInTheDocument();
    expect(screen.getByText("Missy Elliott")).toBeInTheDocument();
    expect(screen.queryByText(/buscando conteúdo/i)).not.toBeInTheDocument();
  });

  it("polls and swaps in content once generation finishes, without further polling", async () => {
    vi.mocked(albumContextAction.getAlbumNarrative).mockResolvedValue({
      state: "ready",
      body: readyBody,
    });

    render(
      <NarrativeSections
        albumId="album-1"
        initial={{ state: "in_progress" }}
        year="1986"
      />,
    );

    expect(screen.getAllByText(/buscando conteúdo/i).length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3007);
    });

    expect(screen.getByText("Momento do artista.")).toBeInTheDocument();
    expect(albumContextAction.getAlbumNarrative).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(albumContextAction.getAlbumNarrative).toHaveBeenCalledTimes(1);
  });

  it("keeps polling after a failed request instead of stalling forever", async () => {
    vi.mocked(albumContextAction.getAlbumNarrative)
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ state: "ready", body: readyBody });

    render(
      <NarrativeSections
        albumId="album-1"
        initial={{ state: "in_progress" }}
        year="1986"
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3007);
    });
    expect(albumContextAction.getAlbumNarrative).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Momento do artista.")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3007);
    });
    expect(albumContextAction.getAlbumNarrative).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Momento do artista.")).toBeInTheDocument();
  });

  it("renders a per-section error state when the whole narrative fetch failed", () => {
    render(
      <NarrativeSections
        albumId="album-1"
        initial={{ state: "error" }}
        year="1986"
      />,
    );

    expect(
      screen.getAllByText(/não foi possível gerar/i).length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("renders a per-section error state only for a facet that failed validation, leaving others intact", () => {
    render(
      <NarrativeSections
        albumId="album-1"
        initial={{
          state: "ready",
          body: {
            ...readyBody,
            worldContext: [],
            failedFacets: ["world_context"],
          },
        }}
        year="1986"
      />,
    );

    expect(screen.getByText("Momento do artista.")).toBeInTheDocument();
    expect(screen.getByText(/não foi possível gerar/i)).toBeInTheDocument();
  });

  it("hides the Influência and Curiosidades titles entirely when there is no data for them", () => {
    render(
      <NarrativeSections
        albumId="album-1"
        initial={{
          state: "ready",
          body: { ...readyBody, influence: [], curiosities: [] },
        }}
        year="1986"
      />,
    );

    expect(screen.queryByText("Influência")).not.toBeInTheDocument();
    expect(screen.queryByText("Curiosidades")).not.toBeInTheDocument();
  });

  it("renders technical-sheet children between the world-context and reception sections", () => {
    render(
      <NarrativeSections
        albumId="album-1"
        initial={{ state: "ready", body: readyBody }}
        year="1986"
      >
        <div data-testid="technical-slot">slot</div>
      </NarrativeSections>,
    );

    expect(screen.getByTestId("technical-slot")).toBeInTheDocument();
  });
});
