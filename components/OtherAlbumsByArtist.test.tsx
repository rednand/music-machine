import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OtherAlbumsByArtist } from "./OtherAlbumsByArtist";

describe("OtherAlbumsByArtist", () => {
  it("renders each other album in chronological order, linking to its own context page", () => {
    render(
      <OtherAlbumsByArtist
        albums={[
          { albumId: "album-2", title: "Like a Virgin", releaseYear: "1984" },
          { albumId: "album-3", title: "Like a Prayer", releaseYear: "1989" }
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
});
