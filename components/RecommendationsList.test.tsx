import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecommendationsList } from "./RecommendationsList";

describe("RecommendationsList", () => {
  it("renders each recommendation with its narrative reason, not a bare name", () => {
    render(
      <RecommendationsList
        recommendations={[
          {
            id: "r1",
            subject_album_id: "control",
            recommended_album_id: "true-blue",
            reason: "same_era",
            explanation: "Lançado por volta da mesma época de Control."
          }
        ]}
      />
    );

    expect(screen.getByText("Lançado por volta da mesma época de Control.")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/albums/true-blue");
  });

  it("renders nothing when there are no recommendations", () => {
    const { container } = render(<RecommendationsList recommendations={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
