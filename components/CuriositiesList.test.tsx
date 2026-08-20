import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CuriositiesList } from "./CuriositiesList";

describe("CuriositiesList", () => {
  it("renders each curiosity's summary text", () => {
    render(
      <CuriositiesList
        curiosities={[
          { id: "c1", album_id: "a1", summary: "Fato confirmado.", status: "confirmed", source_id: "s1" },
          { id: "c2", album_id: "a1", summary: "Rumor não confirmado.", status: "unconfirmed", source_id: "s1" },
          { id: "c3", album_id: "a1", summary: "Versão contestada.", status: "disputed", source_id: "s1" }
        ]}
      />
    );

    expect(screen.getByText("Fato confirmado.")).toBeInTheDocument();
    expect(screen.getByText("Rumor não confirmado.")).toBeInTheDocument();
    expect(screen.getByText("Versão contestada.")).toBeInTheDocument();
  });

  it("shows a placeholder message when there are no curiosities", () => {
    render(<CuriositiesList curiosities={[]} />);

    expect(screen.getByText(/nenhuma curiosidade/i)).toBeInTheDocument();
  });
});
