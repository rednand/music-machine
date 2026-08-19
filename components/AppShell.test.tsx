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
});
