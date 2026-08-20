import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchForm } from "./SearchForm";
import * as searchAction from "@/app/actions/search";
import * as songSearchAction from "@/app/actions/song-search";

vi.mock("server-only", () => ({}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

describe("SearchForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("shows disambiguated known results after searching", async () => {
    vi.spyOn(searchAction, "searchCatalog").mockResolvedValue([
      { kind: "known", id: "album-1", title: "Control", artistName: "Janet Jackson", releaseDate: "1986-02-04" }
    ]);

    render(<SearchForm />);

    await userEvent.type(screen.getByRole("searchbox"), "Control");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => expect(screen.getByText("Control")).toBeInTheDocument());
    expect(screen.getByText(/janet jackson/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /control/i })).toHaveAttribute("href", "/albums/album-1");
  });

  it("shows a loading indicator while a search is in progress, then hides it once results arrive", async () => {
    let resolveSearch: (value: searchAction.SearchResultItem[]) => void = () => {};
    vi.spyOn(searchAction, "searchCatalog").mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve; })
    );

    render(<SearchForm />);

    await userEvent.type(screen.getByRole("searchbox"), "Control");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    expect(await screen.findByText(/buscando/i)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeDisabled();

    resolveSearch([{ kind: "known", id: "album-1", title: "Control", artistName: "Janet Jackson", releaseDate: "1986-02-04" }]);

    await waitFor(() => expect(screen.queryByText(/buscando/i)).not.toBeInTheDocument());
    expect(screen.getByRole("searchbox")).toBeEnabled();
  });

  it("shows a no-results message when nothing matches", async () => {
    vi.spyOn(searchAction, "searchCatalog").mockResolvedValue([]);

    render(<SearchForm />);

    await userEvent.type(screen.getByRole("searchbox"), "doesnotexist");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => expect(screen.getByText(/nenhum resultado/i)).toBeInTheDocument());
  });

  it("shows a waiting state while resolving a selected candidate, then navigates to its album page", async () => {
    vi.spyOn(searchAction, "searchCatalog").mockResolvedValue([
      { kind: "candidate", externalId: "cat-9", query: "Rhythm Nation", title: "Rhythm Nation 1814", artistName: "Janet Jackson", releaseDate: "1989-09-19" }
    ]);
    let resolveIngest: (value: searchAction.ResolveCandidateResult) => void = () => {};
    vi.spyOn(searchAction, "resolveSearchCandidate").mockImplementation(
      () => new Promise((resolve) => { resolveIngest = resolve; })
    );

    render(<SearchForm />);

    await userEvent.type(screen.getByRole("searchbox"), "Rhythm Nation");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    const candidateButton = await screen.findByRole("button", { name: /rhythm nation 1814/i });
    await userEvent.click(candidateButton);

    expect(await screen.findByText(/salvando/i)).toBeInTheDocument();

    resolveIngest({ state: "ready", albumId: "album-new" });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/albums/album-new"));
  });

  it("shows a clear failure message when resolving a candidate fails, without navigating", async () => {
    vi.spyOn(searchAction, "searchCatalog").mockResolvedValue([
      { kind: "candidate", externalId: "cat-9", query: "Rhythm Nation", title: "Rhythm Nation 1814", artistName: "Janet Jackson", releaseDate: "1989-09-19" }
    ]);
    vi.spyOn(searchAction, "resolveSearchCandidate").mockResolvedValue({ state: "error", message: "Não foi possível salvar este item." });

    render(<SearchForm />);

    await userEvent.type(screen.getByRole("searchbox"), "Rhythm Nation");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    const candidateButton = await screen.findByRole("button", { name: /rhythm nation 1814/i });
    await userEvent.click(candidateButton);

    await waitFor(() => expect(screen.getByText("Não foi possível salvar este item.")).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("searches songs and links to the album with the track highlighted when mode is set to música", async () => {
    vi.spyOn(songSearchAction, "searchSongs").mockResolvedValue([
      { trackId: "track-1", title: "Nasty", albumId: "album-1", albumTitle: "Control", artistName: "Janet Jackson" }
    ]);
    const albumSearchSpy = vi.spyOn(searchAction, "searchCatalog");

    render(<SearchForm />);

    await userEvent.click(screen.getByRole("button", { name: /música/i }));
    await userEvent.type(screen.getByRole("searchbox"), "Nasty");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => expect(screen.getByText("Nasty")).toBeInTheDocument());
    expect(screen.getByText(/control/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /nasty/i })).toHaveAttribute("href", "/albums/album-1?track=track-1");
    expect(albumSearchSpy).not.toHaveBeenCalled();
  });

  it("shows a no-results state guiding to album search when a song search matches nothing", async () => {
    vi.spyOn(songSearchAction, "searchSongs").mockResolvedValue([]);

    render(<SearchForm />);

    await userEvent.click(screen.getByRole("button", { name: /música/i }));
    await userEvent.type(screen.getByRole("searchbox"), "doesnotexist");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => expect(screen.getByText(/nenhuma música encontrada/i)).toBeInTheDocument());
  });
});
