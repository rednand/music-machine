import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerformancePanel } from "./PerformancePanel";

describe("PerformancePanel", () => {
  it("shows an unavailable message instead of fabricating data when performance is null", () => {
    render(<PerformancePanel records={null} />);

    expect(screen.getByText(/dados de desempenho não disponíveis/i)).toBeInTheDocument();
  });

  it("shows the unavailable message when records is an empty array", () => {
    render(<PerformancePanel records={[]} />);

    expect(screen.getByText(/dados de desempenho não disponíveis/i)).toBeInTheDocument();
  });

  it("renders each performance record as a stat card with its label and value", () => {
    render(
      <PerformancePanel
        records={[
          { id: "p1", album_id: "a1", kind: "chart_position", label: "Billboard 200", value: "1", source_id: "s1" },
          { id: "p2", album_id: "a1", kind: "certification", label: "United States", value: "Platinum", source_id: "s1" }
        ]}
      />
    );

    expect(screen.getByText(/billboard 200/i)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/united states/i)).toBeInTheDocument();
    expect(screen.getByText("Platinum")).toBeInTheDocument();
  });
});
