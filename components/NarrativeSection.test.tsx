import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NarrativeSection } from "./NarrativeSection";

describe("NarrativeSection", () => {
  it("renders each statement with a source reference", () => {
    render(
      <NarrativeSection
        title="O momento do artista"
        statements={[
          { text: "Janet Jackson tinha 19 anos.", kind: "fact", sourceIds: ["source-1"] }
        ]}
      />
    );

    expect(screen.getByText("O momento do artista")).toBeInTheDocument();
    expect(screen.getByText("Janet Jackson tinha 19 anos.")).toBeInTheDocument();
    expect(screen.getByText(/source-1/)).toBeInTheDocument();
  });

  it("renders nothing when there are no statements", () => {
    const { container } = render(<NarrativeSection title="Vazio" statements={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders multiple statements as one connected paragraph, not a bulleted list", () => {
    render(
      <NarrativeSection
        title="O momento do artista"
        statements={[
          { text: "Janet Jackson tinha 19 anos.", kind: "fact", sourceIds: ["source-1"] },
          { text: "Ela buscava se libertar da sombra da família.", kind: "interpretation", sourceIds: [] }
        ]}
      />
    );

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    const paragraph = screen.getByText("Janet Jackson tinha 19 anos.").closest("p");
    expect(paragraph).toContainElement(screen.getByText("Ela buscava se libertar da sombra da família."));
  });

  it("consolidates source citations into a single footnote line instead of repeating them per statement", () => {
    render(
      <NarrativeSection
        title="O momento do artista"
        statements={[
          { text: "Primeira frase.", kind: "fact", sourceIds: ["source-1"] },
          { text: "Segunda frase.", kind: "fact", sourceIds: ["source-2"] }
        ]}
      />
    );

    expect(screen.getAllByText(/Fontes:/)).toHaveLength(1);
    expect(screen.getByText(/source-1/)).toBeInTheDocument();
    expect(screen.getByText(/source-2/)).toBeInTheDocument();
  });
});
