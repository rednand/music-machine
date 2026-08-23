import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OtherAlbumsByArtist } from "./OtherAlbumsByArtist";
import * as searchAction from "@/app/actions/search";

vi.mock("server-only", () => ({}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

describe("OtherAlbumsByArtist", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders each other album in chronological order, linking to its own context page", () => {
    render(
      <OtherAlbumsByArtist
        albums={[
          { albumId: "album-2", title: "Like a Virgin", releaseYear: "1984", isCurrent: false, description: null },
          { albumId: "album-3", title: "Like a Prayer", releaseYear: "1989", isCurrent: false, description: null }
        ]}
      />
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/albums/album-2");
    expect(screen.getByText("Like a Virgin")).toBeInTheDocument();
    expect(screen.getByText("1984")).toBeInTheDocument();
  });

  it("renders nothing when the artist has no other known albums", () => {
    const { container } = render(<OtherAlbumsByArtist albums={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("highlights the current album and shows its description when available", () => {
    render(
      <OtherAlbumsByArtist
        albums={[
          { albumId: "album-2", title: "True Blue", releaseYear: "1986", isCurrent: true, description: "Assume co-produção e composição." },
          { albumId: "album-3", title: "Like a Prayer", releaseYear: "1989", isCurrent: false, description: null }
        ]}
      />
    );

    expect(screen.getByText("True Blue")).toHaveClass("text-[#d1145a]");
    expect(screen.getByText("Assume co-produção e composição.")).toBeInTheDocument();
    expect(screen.getByText("Like a Prayer")).not.toHaveClass("text-[#d1145a]");
  });

  it("fills in the timeline dot for the current album, leaving other dots hollow", () => {
    const { container } = render(
      <OtherAlbumsByArtist
        albums={[
          { albumId: "album-2", title: "True Blue", releaseYear: "1986", isCurrent: true, description: null },
          { albumId: "album-3", title: "Like a Prayer", releaseYear: "1989", isCurrent: false, description: null }
        ]}
      />
    );

    const dots = container.querySelectorAll('span[aria-hidden="true"]');
    expect(dots).toHaveLength(2);
    expect(dots[0]).toHaveClass("bg-[#d1145a]");
    expect(dots[0]).not.toHaveClass("bg-[#f7f4f1]");
    expect(dots[1]).toHaveClass("bg-[#f7f4f1]");
    expect(dots[1]).not.toHaveClass("bg-[#d1145a]");
  });

  it("renders the current album as non-interactive, without a link or button", () => {
    render(
      <OtherAlbumsByArtist
        albums={[
          { albumId: "album-2", title: "Dangerous", releaseYear: "1991", isCurrent: true, description: null },
          { albumId: "album-3", title: "Off the Wall", releaseYear: "1979", isCurrent: false, description: null }
        ]}
      />
    );

    expect(screen.queryByRole("link", { name: /dangerous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dangerous/i })).not.toBeInTheDocument();
    expect(screen.getByText("Dangerous")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /off the wall/i })).toBeInTheDocument();
  });

  it("renders a Spotify-only entry as a button instead of a link", () => {
    render(
      <OtherAlbumsByArtist
        albums={[
          { albumId: "album-2", title: "Like a Virgin", releaseYear: "1984", isCurrent: false, description: null },
          {
            title: "Rhythm Nation 1814",
            releaseYear: "1989",
            isCurrent: false,
            description: null,
            externalId: "spotify-rn1814",
            query: "Janet Jackson Rhythm Nation 1814"
          }
        ]}
      />
    );

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /rhythm nation 1814/i })).toBeInTheDocument();
  });

  it("resolves and navigates to a Spotify-only album when clicked", async () => {
    vi.spyOn(searchAction, "resolveSearchCandidate").mockResolvedValue({ state: "ready", albumId: "album-new" });

    render(
      <OtherAlbumsByArtist
        albums={[
          {
            title: "Rhythm Nation 1814",
            releaseYear: "1989",
            isCurrent: false,
            description: null,
            externalId: "spotify-rn1814",
            query: "Janet Jackson Rhythm Nation 1814"
          }
        ]}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /rhythm nation 1814/i }));

    expect(searchAction.resolveSearchCandidate).toHaveBeenCalledWith("Janet Jackson Rhythm Nation 1814", "spotify-rn1814");
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/albums/album-new"));
  });

  it("shows a failure message instead of navigating when resolving a Spotify-only album fails", async () => {
    vi.spyOn(searchAction, "resolveSearchCandidate").mockResolvedValue({
      state: "error",
      message: "Não foi possível salvar este item."
    });

    render(
      <OtherAlbumsByArtist
        albums={[
          {
            title: "Rhythm Nation 1814",
            releaseYear: "1989",
            isCurrent: false,
            description: null,
            externalId: "spotify-rn1814",
            query: "Janet Jackson Rhythm Nation 1814"
          }
        ]}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /rhythm nation 1814/i }));

    await waitFor(() => expect(screen.getByText("Não foi possível salvar este item.")).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
