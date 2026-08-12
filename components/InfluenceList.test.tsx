import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfluenceList } from "./InfluenceList";

describe("InfluenceList", () => {
  it("renders each influence with its explanation", () => {
    render(
      <InfluenceList
        influences={[
          { id: "i1", from_album_id: "a1", to_album_id: "a2", explanation: "Definiu o new jack swing.", source_id: "s1" }
        ]}
      />
    );

    expect(screen.getByText("Definiu o new jack swing.")).toBeInTheDocument();
  });

  it("renders nothing when there is no known influence", () => {
    const { container } = render(<InfluenceList influences={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("links to the influenced album when it is known", () => {
    render(
      <InfluenceList
        influences={[
          { id: "i1", from_album_id: "a1", to_album_id: "a2", explanation: "Definiu o new jack swing.", source_id: "s1" }
        ]}
      />
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/albums/a2");
  });
});
