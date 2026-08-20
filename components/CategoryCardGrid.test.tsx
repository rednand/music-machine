import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryCardGrid } from "./CategoryCardGrid";

describe("CategoryCardGrid", () => {
  it("zips each label with its matching statement, one card per pair", () => {
    render(
      <CategoryCardGrid
        title="O mundo em 1986"
        labels={["Política", "Cultura", "Tecnologia"]}
        statements={[
          { text: "Chernobyl explode em abril.", kind: "fact", sourceIds: [] },
          { text: "MTV domina a formação do gosto pop.", kind: "fact", sourceIds: [] },
          { text: "O CD começa a superar o vinil.", kind: "fact", sourceIds: [] }
        ]}
      />
    );

    expect(screen.getByText("POLÍTICA")).toBeInTheDocument();
    expect(screen.getByText("Chernobyl explode em abril.")).toBeInTheDocument();
    expect(screen.getByText("CULTURA")).toBeInTheDocument();
    expect(screen.getByText("TECNOLOGIA")).toBeInTheDocument();
  });

  it("renders fewer cards than labels when the model returns fewer statements", () => {
    render(
      <CategoryCardGrid
        title="O mundo em 1986"
        labels={["Política", "Cultura", "Tecnologia"]}
        statements={[{ text: "Chernobyl explode em abril.", kind: "fact", sourceIds: [] }]}
      />
    );

    expect(screen.getByText("POLÍTICA")).toBeInTheDocument();
    expect(screen.queryByText("CULTURA")).not.toBeInTheDocument();
    expect(screen.queryByText("TECNOLOGIA")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no statements", () => {
    const { container } = render(
      <CategoryCardGrid title="O mundo em 1986" labels={["Política", "Cultura", "Tecnologia"]} statements={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
