import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreditsList } from "./CreditsList";

describe("CreditsList", () => {
  it("renders each credit as a person — role pill", () => {
    render(
      <CreditsList
        credits={[
          { id: "c1", album_id: "album-1", person_name: "Patrick Leonard", role: "Keyboards", source_id: "s1" },
          { id: "c2", album_id: "album-1", person_name: "Bruce Gaitsch", role: "Guitar", source_id: "s1" }
        ]}
      />
    );

    expect(screen.getByText("Patrick Leonard — Keyboards")).toBeInTheDocument();
    expect(screen.getByText("Bruce Gaitsch — Guitar")).toBeInTheDocument();
  });

  it("renders nothing when there are no credits", () => {
    const { container } = render(<CreditsList credits={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
