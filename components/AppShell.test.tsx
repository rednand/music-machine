import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

describe("AppShell", () => {
  it("renders navigation links to Home, Acervo, Eras, and Sorteio only, with no Linhas destination", async () => {
    const { AppShell } = await import("./AppShell.js");

    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>
    );

    const homeLinks = screen.getAllByRole("link", { name: /^home$/i });
    const acervoLinks = screen.getAllByRole("link", { name: /^acervo$/i });
    const erasLinks = screen.getAllByRole("link", { name: /^eras$/i });
    const sorteioLinks = screen.getAllByRole("link", { name: /^sorteio$/i });

    expect(homeLinks.length).toBeGreaterThan(0);
    expect(homeLinks[0]).toHaveAttribute("href", "/");
    expect(acervoLinks.length).toBeGreaterThan(0);
    expect(acervoLinks[0]).toHaveAttribute("href", "/acervo");
    expect(erasLinks.length).toBeGreaterThan(0);
    expect(erasLinks[0]).toHaveAttribute("href", "/years");
    expect(sorteioLinks.length).toBeGreaterThan(0);
    expect(sorteioLinks[0]).toHaveAttribute("href", "/sorteio");
    expect(screen.queryByRole("link", { name: /linhas/i })).not.toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("shows no sign-in link when not an admin, and a sign-out button when signed in as the admin", async () => {
    const { AppShell } = await import("./AppShell.js");

    const { rerender } = render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>
    );

    expect(screen.queryByRole("link", { name: /entrar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sair/i })).not.toBeInTheDocument();

    rerender(
      <AppShell isAdmin>
        <p>conteúdo</p>
      </AppShell>
    );

    expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /entrar/i })).not.toBeInTheDocument();
  });
});
