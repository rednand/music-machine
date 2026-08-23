import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchForm } from "./SearchForm";
import * as searchAction from "@/app/actions/search";

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
      { kind: "known", id: "album-1", title: "Control", artistName: "Janet Jackson", releaseDate: "1986-02-04", sourceUrl: "local_database" }
    ]);

    render(<SearchForm />);

    await userEvent.type(screen.getByRole("searchbox"), "Control");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => expect(screen.getByText("Control")).toBeInTheDocument());
    expect(screen.getByText("JANET JACKSON · 1986")).toBeInTheDocument();
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

    resolveSearch([{ kind: "known", id: "album-1", title: "Control", artistName: "Janet Jackson", releaseDate: "1986-02-04", sourceUrl: "local_database" }]);

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
      {
        kind: "candidate",
        externalId: "cat-9",
        query: "Rhythm Nation",
        title: "Rhythm Nation 1814",
        artistName: "Janet Jackson",
        releaseDate: "1989-09-19",
        sourceUrl: "https://api.deezer.com/search/album?q=Rhythm+Nation",
        musicBrainzUrl: "https://musicbrainz.org/ws/2/release-group/?query=x"
      }
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
      {
        kind: "candidate",
        externalId: "cat-9",
        query: "Rhythm Nation",
        title: "Rhythm Nation 1814",
        artistName: "Janet Jackson",
        releaseDate: "1989-09-19",
        sourceUrl: "https://api.deezer.com/search/album?q=Rhythm+Nation",
        musicBrainzUrl: "https://musicbrainz.org/ws/2/release-group/?query=x"
      }
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

  it("shows the raw endpoint response for admins after a search, and hides it for everyone else", async () => {
    vi.spyOn(searchAction, "searchCatalog").mockResolvedValue([
      { kind: "known", id: "album-1", title: "Control", artistName: "Janet Jackson", releaseDate: "1986-02-04", sourceUrl: "local_database" }
    ]);

    const { rerender } = render(<SearchForm />);
    await userEvent.type(screen.getByRole("searchbox"), "Control");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));
    await waitFor(() => expect(screen.getByText("Control")).toBeInTheDocument());

    expect(screen.queryByText(/debug/i)).not.toBeInTheDocument();

    rerender(<SearchForm isAdmin />);
    expect(screen.getByText(/debug/i)).toBeInTheDocument();
    expect(screen.getByText(/"kind": "known"/)).toBeInTheDocument();
  });

  it("navigates straight to the year page when mode is set to ano, without calling album search", async () => {
    const albumSearchSpy = vi.spyOn(searchAction, "searchCatalog");

    render(<SearchForm />);

    await userEvent.click(screen.getByRole("button", { name: /^ano$/i }));
    await userEvent.type(screen.getByRole("searchbox"), "1986");
    await userEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/years/1986"));
    expect(albumSearchSpy).not.toHaveBeenCalled();
  });
});
