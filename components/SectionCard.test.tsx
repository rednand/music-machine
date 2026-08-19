import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionCard } from "./SectionCard";

describe("SectionCard", () => {
  it("renders the title as a heading and the children inside the section", () => {
    render(
      <SectionCard title="O álbum">
        <p>conteúdo</p>
      </SectionCard>
    );

    expect(screen.getByRole("heading", { name: "O álbum" })).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("applies the given id to the section for anchor navigation", () => {
    const { container } = render(
      <SectionCard id="desempenho" title="Desempenho">
        <p>conteúdo</p>
      </SectionCard>
    );

    expect(container.querySelector("section#desempenho")).toBeInTheDocument();
  });

  it("renders without an id when none is given", () => {
    const { container } = render(
      <SectionCard title="Sem id">
        <p>conteúdo</p>
      </SectionCard>
    );

    expect(container.querySelector("section")).not.toHaveAttribute("id");
  });
});
