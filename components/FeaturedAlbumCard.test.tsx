import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedAlbumCard } from "./FeaturedAlbumCard";

describe("FeaturedAlbumCard", () => {
  it("renders the cover, artist, and year, linking to the album page", () => {
    render(
      <FeaturedAlbumCard
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
        entry={{ albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null }}
      />
    );

    expect(screen.getByRole("link", { name: /true blue/i })).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
