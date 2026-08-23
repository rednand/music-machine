import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlbumInfoCards } from "./AlbumInfoCards";

describe("AlbumInfoCards", () => {
  it("renders release date, label, and production credits when present", () => {
    render(
      <AlbumInfoCards
        releaseDate="1986-06-30"
        label="Sire / Warner Bros."
        title="True Blue"
        artistName="Madonna"
        credits={[
          { id: "c1", album_id: "album-1", person_name: "Madonna", role: "Producer", source_id: "s1" },
          { id: "c2", album_id: "album-1", person_name: "Patrick Leonard", role: "Producer", source_id: "s1" },
          { id: "c3", album_id: "album-1", person_name: "Patrick Leonard", role: "Keyboards", source_id: "s1" }
        ]}
      />
    );

    expect(screen.getByText("LANÇAMENTO")).toBeInTheDocument();
    expect(screen.getByText("30 de junho de 1986")).toBeInTheDocument();
    expect(screen.getByText("GRAVADORA")).toBeInTheDocument();
    expect(screen.getByText("Sire / Warner Bros.")).toBeInTheDocument();
    expect(screen.getByText("PRODUÇÃO")).toBeInTheDocument();
    expect(screen.getByText("Madonna · Patrick Leonard")).toBeInTheDocument();
  });

  it("omits gravadora and produção cards when there is no label or production credit", () => {
    render(<AlbumInfoCards releaseDate="1986-06-30" credits={[]} title="True Blue" artistName="Madonna" />);

    expect(screen.getByText("LANÇAMENTO")).toBeInTheDocument();
    expect(screen.queryByText("GRAVADORA")).not.toBeInTheDocument();
    expect(screen.queryByText("PRODUÇÃO")).not.toBeInTheDocument();
  });

  it("renders a streaming icon link per platform, built from the album title and artist", () => {
    render(<AlbumInfoCards releaseDate="1986-06-30" credits={[]} title="True Blue" artistName="Madonna" />);

    expect(screen.getByText("OUVIR")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ouvir no deezer/i })).toHaveAttribute(
      "href",
      "https://www.deezer.com/search/Madonna%20True%20Blue"
    );
    expect(screen.getByRole("link", { name: /ouvir no spotify/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ouvir no youtube music/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ouvir no apple music/i })).toBeInTheDocument();
  });
});
