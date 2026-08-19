import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedAlbumCard } from "./FeaturedAlbumCard";

describe("FeaturedAlbumCard", () => {
  it("renders the cover, artist, and year, linking to the album page", () => {
    render(
      <FeaturedAlbumCard
        index={0}
        entry={{
          albumId: "album-1",
          title: "True Blue",
          artistName: "Madonna",
          releaseYear: "1986",
          coverArtUrl: "https://example.com/cover.jpg",
          hook: "O disco em que a estrela pop virou autora."
        }}
      />
    );

    expect(screen.getByRole("link", { name: /true blue/i })).toHaveAttribute("href", "/albums/album-1");
    expect(screen.getByText("MADONNA")).toBeInTheDocument();
    expect(screen.getByText("1986")).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders gracefully without a cover image", () => {
    render(
      <FeaturedAlbumCard
        index={0}
        entry={{ albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null }}
      />
    );

    expect(screen.getByRole("link", { name: /true blue/i })).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("gives each card in the stack a distinct position/rotation based on its index", () => {
    const { container: first } = render(
      <FeaturedAlbumCard
        index={0}
        entry={{ albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null }}
      />
    );
    const { container: second } = render(
      <FeaturedAlbumCard
        index={1}
        entry={{ albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null }}
      />
    );

    const firstLink = first.querySelector("a");
    const secondLink = second.querySelector("a");
    expect(firstLink?.style.transform).not.toBe(secondLink?.style.transform);
    expect(firstLink?.style.left).not.toBe(secondLink?.style.left);
  });

  it("still renders correctly when it is the only card in the stack", () => {
    render(
      <FeaturedAlbumCard
        index={0}
        entry={{ albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null }}
      />
    );

    expect(screen.getByRole("link", { name: /true blue/i })).toBeInTheDocument();
    expect(screen.getByText("MADONNA")).toBeInTheDocument();
    expect(screen.getByText("1986")).toBeInTheDocument();
  });
});
