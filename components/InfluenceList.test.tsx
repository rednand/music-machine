import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfluenceList } from "./InfluenceList";

describe("InfluenceList", () => {
  it("renders each influence with its artist name and explanation", () => {
    render(
      <InfluenceList
        influences={[
          { id: "i1", artistName: "Britney Spears", albumId: "a2", explanation: "Herdou o manual de reinvenção visual." }
        ]}
      />
    );

    expect(screen.getByText("Britney Spears")).toBeInTheDocument();
    expect(screen.getByText("Herdou o manual de reinvenção visual.")).toBeInTheDocument();
  });

  it("shows a fallback message when there is no known influence", () => {
    render(<InfluenceList influences={[]} />);

    expect(screen.getByText("Nenhuma influência registrada para este álbum.")).toBeInTheDocument();
  });

  it("links to the influenced album when it is known", () => {
    render(
      <InfluenceList
        influences={[{ id: "i1", artistName: "Britney Spears", albumId: "a2", explanation: "Definiu o new jack swing." }]}
      />
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/albums/a2");
  });

  it("omits the album link when no album is known", () => {
    render(<InfluenceList influences={[{ id: "i1", artistName: "Kylie Minogue", explanation: "Absorveu a fórmula pop." }]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
