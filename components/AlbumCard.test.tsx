import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlbumCard } from "./AlbumCard";

describe("AlbumCard", () => {
  it("renders the title, year, artist, genre, hook, and links to the album page", () => {
    render(
      <AlbumCard
        entry={{
          albumId: "album-1",
          title: "What's Going On",
          artistName: "Marvin Gaye",
          releaseYear: "1971",
          genre: "Soul",
          hook: "Um álbum-conceito sobre a guerra e a cidade."
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "What's Going On" })).toBeInTheDocument();
    expect(screen.getByText(/1971/)).toBeInTheDocument();
    expect(screen.getByText(/MARVIN GAYE/)).toBeInTheDocument();
    expect(screen.getByText(/SOUL/)).toBeInTheDocument();
    expect(screen.getByText("Um álbum-conceito sobre a guerra e a cidade.")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/albums/album-1");
  });

  it("omits the genre segment when the album has none on record", () => {
    render(
      <AlbumCard
        entry={{ albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null }}
      />
    );

    expect(screen.getByText("1991 · NIRVANA")).toBeInTheDocument();
  });
});
