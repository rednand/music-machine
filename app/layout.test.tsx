import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Playfair_Display: () => ({ variable: "--font-serif" }),
  Syne: () => ({ variable: "--font-heading" }),
  IBM_Plex_Mono: () => ({ variable: "--font-mono" }),
  Work_Sans: () => ({ variable: "--font-sans" })
}));

vi.mock("./lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
  })
}));

describe("RootLayout", () => {
  it("declares pt-BR metadata for the product", async () => {
    const { metadata } = await import("./layout.js");

    expect(metadata.title).toBe("Music Time Machine");
    expect(metadata.description).toMatch(/álbuns/i);
  });

  it("renders the AppShell around its children", async () => {
    const RootLayout = (await import("./layout.js")).default;
    const element = await RootLayout({ children: <p>conteúdo</p> });

    const htmlProps = element.props;
    expect(htmlProps.lang).toBe("pt-BR");
  });
});
