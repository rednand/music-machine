import { describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.fn().mockReturnValue({ from: vi.fn() });
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClient(...args)
}));

describe("createSupabaseBrowserClient", () => {
  it("creates a browser client with the public URL and anon key", async () => {
    const { createSupabaseBrowserClient } = await import("./client.js");

    createSupabaseBrowserClient();

    expect(createBrowserClient).toHaveBeenCalledWith(expect.any(String), expect.any(String));
  });
});
