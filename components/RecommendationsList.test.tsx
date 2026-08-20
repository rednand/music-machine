import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecommendationsList } from "./RecommendationsList";

describe("RecommendationsList", () => {
  it("renders each recommendation as a card with its title, artist, year, and reason", () => {
    render(
      <RecommendationsList
        recommendations={[
          {
            id: "r1",
            albumId: "true-blue",
            title: "True Blue",
            artistName: "Madonna",
            releaseYear: "1986",
            reason: "same_era",
            explanation: "Lançado por volta da mesma época de Control."
          }
        ]}
      />
    );

    expect(screen.getByText("True Blue")).toBeInTheDocument();
    expect(screen.getByText("Madonna")).toBeInTheDocument();
    expect(screen.getByText(/1986/)).toBeInTheDocument();
    expect(screen.getByText(/mesma época/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/albums/true-blue");
  });

  it("renders nothing when there are no recommendations", () => {
    const { container } = render(<RecommendationsList recommendations={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
