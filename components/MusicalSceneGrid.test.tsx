import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MusicalSceneGrid } from "./MusicalSceneGrid";

describe("MusicalSceneGrid", () => {
  it("renders a card per same-era album with title, artist, and year", () => {
    render(
      <MusicalSceneGrid
        title="O cenário musical"
        albums={[
          { albumId: "a1", title: "Control", artistName: "Janet Jackson", releaseYear: "1986" },
          { albumId: "a2", title: "Slippery When Wet", artistName: "Bon Jovi", releaseYear: "1986" }
        ]}
      />
    );

    expect(screen.getByText("Control")).toBeInTheDocument();
    expect(screen.getByText(/JANET JACKSON/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Control/ })).toHaveAttribute("href", "/albums/a1");
  });

  it("renders at most 3 cards even when more same-era albums are given", () => {
    render(
      <MusicalSceneGrid
        title="O cenário musical"
        albums={[
          { title: "A", artistName: "X" },
          { title: "B", artistName: "Y" },
          { title: "C", artistName: "Z" },
          { title: "D", artistName: "W" }
        ]}
      />
    );

    expect(screen.getAllByText(/^[A-D]$/)).toHaveLength(3);
  });

  it("renders a non-linked card when no albumId is known", () => {
    render(<MusicalSceneGrid title="O cenário musical" albums={[{ title: "Graceland", artistName: "Paul Simon" }]} />);

    expect(screen.getByText("Graceland")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no same-era albums", () => {
    const { container } = render(<MusicalSceneGrid title="O cenário musical" albums={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
