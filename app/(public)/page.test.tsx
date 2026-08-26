import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn().mockResolvedValue({ data: { user: null } })
}));
vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({ auth: { getUser: getUserMock } })
}));

import DiscoverPage from "./page";
import * as discoveryAction from "../actions/discovery";

describe("DiscoverPage", () => {
  it("renders the headline, search form, featured spotlight, and collection list for a non-empty catalog", async () => {
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({
      state: "ready",
      featured: {
        albumId: "album-1",
        title: "True Blue",
        artistName: "Madonna",
        releaseYear: "1986",
        hook: "O disco em que a estrela pop virou autora."
      },
      collection: [
        {
          albumId: "album-1",
          title: "True Blue",
          artistName: "Madonna",
          releaseYear: "1986",
          hook: "O disco em que a estrela pop virou autora."
        },
        { albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null }
      ]
    });

    const element = await DiscoverPage();
    render(element);

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "True Blue" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Nevermind" })).toBeInTheDocument();
    expect(screen.getAllByText("O disco em que a estrela pop virou autora.").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /true blue/i })[0]).toHaveAttribute("href", "/albums/album-1");
  });

  it("renders the hero title and the disco-clock logo above it", async () => {
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({
      state: "ready",
      featured: { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null },
      collection: [{ albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null }]
    });

    const element = await DiscoverPage();
    const { container } = render(element);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/Discontexto/i);
    expect(container.querySelector('img[src="/logo-disco-relogio.svg"]')).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("shows a clickable ticker of recent entries and no longer shows count badges", async () => {
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({
      state: "ready",
      featured: { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null },
      collection: [
        { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null },
        { albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null }
      ]
    });

    const element = await DiscoverPage();
    render(element);

    expect(screen.getAllByRole("link", { name: /nevermind/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\d+\s*álbuns?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*artistas?/i)).not.toBeInTheDocument();
  });

  it("renders the featured albums as an overlapping stack sized to the catalog", async () => {
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({
      state: "ready",
      featured: { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null },
      collection: [
        { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null },
        { albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", hook: null },
        { albumId: "album-3", title: "OK Computer", artistName: "Radiohead", releaseYear: "1997", hook: null }
      ]
    });

    const element = await DiscoverPage();
    render(element);

    expect(screen.getAllByRole("link", { name: /true blue/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("RADIOHEAD")).toBeInTheDocument();
    expect(screen.getAllByText("1986").length).toBeGreaterThan(0);
  });

  it("degrades the featured stack to a single card when the catalog has exactly one album", async () => {
    const entry = { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: null };
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({
      state: "ready",
      featured: entry,
      collection: [entry]
    });

    const element = await DiscoverPage();
    render(element);

    expect(screen.getAllByText("MADONNA").length).toBe(1);
  });

  it("shows an inviting empty state guiding the visitor to search when the catalog has zero albums", async () => {
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({ state: "empty" });

    const element = await DiscoverPage();
    render(element);

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByText(/busque um artista ou álbum/i)).toBeInTheDocument();
  });

  it("renders a single-album catalog as both the spotlight and the sole collection entry", async () => {
    const entry = {
      albumId: "album-1",
      title: "True Blue",
      artistName: "Madonna",
      releaseYear: "1986",
      hook: null
    };
    vi.spyOn(discoveryAction, "getDiscoveryPage").mockResolvedValue({
      state: "ready",
      featured: entry,
      collection: [entry]
    });

    const element = await DiscoverPage();
    render(element);

    expect(screen.getAllByRole("link", { name: /true blue/i }).length).toBeGreaterThanOrEqual(2);
  });
});
