import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import AcervoPage from "./page";
import * as discoveryAction from "../../actions/discovery";

describe("AcervoPage", () => {
  it("renders every album from the catalog through the browser", async () => {
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({
      state: "ready",
      featured: {
        albumId: "album-1",
        title: "True Blue",
        artistName: "Madonna",
        releaseYear: "1986",
        hook: null
      },
      collection: [
        { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null },
        { albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null }
      ]
    });

    const element = await AcervoPage();
    render(element);

    expect(screen.getByRole("heading", { name: /o acervo/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "True Blue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nevermind" })).toBeInTheDocument();
  });

  it("shows an empty-state message when the catalog has no albums", async () => {
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({ state: "empty" });

    const element = await AcervoPage();
    render(element);

    expect(screen.getByText(/ainda não há álbuns/i)).toBeInTheDocument();
  });
});
