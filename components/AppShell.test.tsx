import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

describe("AppShell", () => {
  it("renders navigation links to Acervo and Eras only, with no Linhas destination", async () => {
    const { AppShell } = await import("./AppShell.js");

    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>
    );

    const acervoLinks = screen.getAllByRole("link", { name: /acervo/i });
    const erasLinks = screen.getAllByRole("link", { name: /eras/i });

    expect(acervoLinks.length).toBeGreaterThan(0);
    expect(acervoLinks[0]).toHaveAttribute("href", "/");
    expect(erasLinks.length).toBeGreaterThan(0);
    expect(erasLinks[0]).toHaveAttribute("href", "/years");
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
