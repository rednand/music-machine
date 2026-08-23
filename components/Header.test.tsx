import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("renders the album title, artist, cover, and a faint year watermark from the release date", () => {
    render(
      <Header
        header={{
          title: "Control",
          artist: "Janet Jackson",
          releaseDate: "1986-02-04",
          coverArtUrl: "https://example.com/cover.jpg",
          hook: "Control é hoje visto como o álbum que redefiniu a imagem artística de Janet Jackson."
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Control" })).toBeInTheDocument();
    expect(screen.getByText("JANET JACKSON")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Control" })).toBeInTheDocument();
    expect(screen.getByText("1986")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /deezer/i })).toHaveAttribute(
      "href",
      "https://www.deezer.com/search/Janet%20Jackson%20Control"
    );
    expect(screen.getByRole("link", { name: /spotify/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /youtube music/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /apple music/i })).toBeInTheDocument();
  });

  it("does not render an image when the album has no cover art", () => {
    render(<Header header={{ title: "Control", artist: "Janet Jackson", releaseDate: "1986-02-04", hook: null }} />);

    expect(screen.getByRole("heading", { name: "Control" })).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
