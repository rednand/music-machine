import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlbumTabs } from "./AlbumTabs";

describe("AlbumTabs", () => {
  it("renders a link for each album page section, anchored to that section's id", () => {
    render(<AlbumTabs />);

    expect(screen.getByRole("link", { name: "ÁLBUM" })).toHaveAttribute("href", "#album");
    expect(screen.getByRole("link", { name: "LINHA DO TEMPO" })).toHaveAttribute("href", "#linha-do-tempo");
    expect(screen.getAllByRole("link")).toHaveLength(9);
  });
});
