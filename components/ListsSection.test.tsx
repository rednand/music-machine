import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListsSection } from "./ListsSection";

describe("ListsSection", () => {
  it("renders each list placement with its name and position", () => {
    render(
      <ListsSection
        placements={[
          { listName: "Rolling Stone's 500 Greatest Albums of All Time", position: 78 },
          { listName: "Apple Music: 100 Best Albums", position: 12 }
        ]}
      />
    );

    expect(screen.getByText("Rolling Stone's 500 Greatest Albums of All Time")).toBeInTheDocument();
    expect(screen.getByText("#78")).toBeInTheDocument();
    expect(screen.getByText("Apple Music: 100 Best Albums")).toBeInTheDocument();
    expect(screen.getByText("#12")).toBeInTheDocument();
  });

  it("renders nothing when the album is on no list", () => {
    const { container } = render(<ListsSection placements={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
