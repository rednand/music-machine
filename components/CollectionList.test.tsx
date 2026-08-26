import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionList } from "./CollectionList";

describe("CollectionList", () => {
  it("renders each entry with year, title, artist, hook, and a link to its album page", () => {
    render(
      <CollectionList
        entries={[
          { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: "O disco em que a estrela pop virou autora." },
          { albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "True Blue" })).toBeInTheDocument();
    expect(screen.getByText("O disco em que a estrela pop virou autora.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nevermind" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /true blue/i })).toHaveAttribute("href", "/albums/album-1");
    expect(screen.getByRole("link", { name: /nevermind/i })).toHaveAttribute("href", "/albums/album-2");
  });

  it("omits the hook line for an entry with no usable narrative yet", () => {
    render(
      <CollectionList
        entries={[{ albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null }]}
      />
    );

    expect(screen.queryByText(/estrela pop/)).not.toBeInTheDocument();
  });

  it("renders nothing when there are no entries", () => {
    const { container } = render(<CollectionList entries={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  const threeEntries = [
    { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null },
    { albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null },
    { albumId: "album-3", title: "The Miseducation of Lauryn Hill", artistName: "Lauryn Hill", releaseYear: "1998", hook: null }
  ];

  it("shows only the preview count with a link to the full acervo route", () => {
    render(<CollectionList entries={threeEntries} previewCount={2} />);

    expect(screen.getByRole("heading", { name: "True Blue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nevermind" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /miseducation/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver o acervo inteiro/i })).toHaveAttribute("href", "/acervo");
  });

  it("shows every entry with no 'ver o acervo inteiro' link when entries are at or below the preview count", () => {
    render(<CollectionList entries={threeEntries.slice(0, 2)} previewCount={2} />);

    expect(screen.getByRole("heading", { name: "True Blue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nevermind" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ver o acervo inteiro/i })).not.toBeInTheDocument();
  });
});
