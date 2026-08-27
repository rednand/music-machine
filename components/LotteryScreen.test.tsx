import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LotteryEntry } from "@/app/lib/discovery/lottery";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const searchCatalogMock = vi.fn();
const resolveSearchCandidateMock = vi.fn();
vi.mock("@/app/actions/search", () => ({
  searchCatalog: (...args: unknown[]) => searchCatalogMock(...args),
  resolveSearchCandidate: (...args: unknown[]) => resolveSearchCandidateMock(...args)
}));

import { LotteryScreen } from "./LotteryScreen";

const inLocalCatalog: LotteryEntry = {
  key: "beyonce|lemonade",
  artistName: "Beyoncé",
  albumTitle: "Lemonade",
  placements: [
    { listName: "Rolling Stone 500", position: 32 },
    { listName: "Apple Music 100", position: 10 }
  ],
  albumId: "album-1",
  genre: "R&B",
  releaseYear: "2016"
};

const notInLocalCatalog: LotteryEntry = {
  key: "radiohead|ok computer",
  artistName: "Radiohead",
  albumTitle: "OK Computer",
  placements: [{ listName: "Q Magazine's 100 Greatest Albums Ever", position: 1 }],
  albumId: null,
  genre: null,
  releaseYear: null
};

const otherLocalCatalog: LotteryEntry = {
  key: "janet jackson|control",
  artistName: "Janet Jackson",
  albumTitle: "Control",
  placements: [{ listName: "Rolling Stone 500", position: 111 }],
  albumId: "album-2",
  genre: "Pop",
  releaseYear: "1986"
};

beforeEach(() => {
  pushMock.mockReset();
  searchCatalogMock.mockReset();
  resolveSearchCandidateMock.mockReset();
  vi.spyOn(Math, "random").mockReturnValue(0);
});

describe("LotteryScreen", () => {
  it("draws an album and shows every list it appears on", () => {
    render(<LotteryScreen pool={[inLocalCatalog, notInLocalCatalog]} />);

    fireEvent.click(screen.getByRole("button", { name: /^sortear$/i }));

    expect(screen.getByText("Lemonade")).toBeInTheDocument();
    expect(screen.getByText(/beyoncé/i)).toBeInTheDocument();
    expect(screen.getByText("Rolling Stone 500")).toBeInTheDocument();
    expect(screen.getByText("#32")).toBeInTheDocument();
    expect(screen.getByText("Apple Music 100")).toBeInTheDocument();
  });

  it("links straight to the album page when the drawn album is already in the local catalog", () => {
    render(<LotteryScreen pool={[inLocalCatalog]} />);

    fireEvent.click(screen.getByRole("button", { name: /^sortear$/i }));

    expect(screen.getByRole("link", { name: /ver página do álbum/i })).toHaveAttribute("href", "/albums/album-1");
  });

  it("offers to search and add the album when it isn't in the local catalog yet", () => {
    render(<LotteryScreen pool={[notInLocalCatalog]} />);

    fireEvent.click(screen.getByRole("button", { name: /^sortear$/i }));

    expect(screen.getByRole("button", { name: /buscar e adicionar este álbum/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ver página do álbum/i })).not.toBeInTheDocument();
  });

  it("searches, resolves the best candidate, and navigates to the new album page", async () => {
    searchCatalogMock.mockResolvedValue([
      {
        kind: "candidate",
        externalId: "ext-1",
        query: "Radiohead OK Computer",
        title: "OK Computer",
        artistName: "Radiohead",
        releaseDate: "1997-06-16",
        sourceUrl: "https://deezer.example",
        musicBrainzUrl: "https://musicbrainz.example"
      }
    ]);
    resolveSearchCandidateMock.mockResolvedValue({ state: "ready", albumId: "album-9" });

    render(<LotteryScreen pool={[notInLocalCatalog]} />);
    fireEvent.click(screen.getByRole("button", { name: /^sortear$/i }));
    fireEvent.click(screen.getByRole("button", { name: /buscar e adicionar este álbum/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/albums/album-9"));
    expect(searchCatalogMock).toHaveBeenCalledWith("Radiohead OK Computer");
    expect(resolveSearchCandidateMock).toHaveBeenCalledWith("Radiohead OK Computer", "ext-1");
  });

  it("shows an error instead of navigating when the search finds nothing", async () => {
    searchCatalogMock.mockResolvedValue([]);

    render(<LotteryScreen pool={[notInLocalCatalog]} />);
    fireEvent.click(screen.getByRole("button", { name: /^sortear$/i }));
    fireEvent.click(screen.getByRole("button", { name: /buscar e adicionar este álbum/i }));

    expect(await screen.findByText(/não encontramos esse álbum/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("filters the pool by genre before drawing, using only entries already in the local catalog", () => {
    render(<LotteryScreen pool={[inLocalCatalog, notInLocalCatalog]} />);

    fireEvent.change(screen.getByLabelText(/gênero/i), { target: { value: "R&B" } });
    expect(screen.getByText("1 ÁLBUM ELEGÍVEL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^sortear$/i }));

    expect(screen.getByText("Lemonade")).toBeInTheDocument();
  });

  it("shows a message when no album matches the selected filters", () => {
    render(<LotteryScreen pool={[inLocalCatalog, otherLocalCatalog]} />);

    fireEvent.change(screen.getByLabelText(/gênero/i), { target: { value: "R&B" } });
    fireEvent.change(screen.getByLabelText(/década/i), { target: { value: "1980s" } });
    fireEvent.click(screen.getByRole("button", { name: /^sortear$/i }));

    expect(screen.getByText(/nenhum álbum encontrado com esses filtros/i)).toBeInTheDocument();
  });

  it("does not offer genre or decade filters when nothing in the pool has been ingested locally", () => {
    render(<LotteryScreen pool={[notInLocalCatalog]} />);

    expect(screen.queryByLabelText(/gênero/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/década/i)).not.toBeInTheDocument();
  });
});
