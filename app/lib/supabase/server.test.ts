import { describe, expect, it, vi } from "vitest";

const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([{ name: "sb-token", value: "abc" }]),
  set: vi.fn()
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore)
}));

const createServerClient = vi.fn().mockReturnValue({ from: vi.fn() });
vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args)
}));

describe("createSupabaseServerClient", () => {
  it("creates a server client wired to the Next.js cookie store", async () => {
    const { createSupabaseServerClient } = await import("./server.js");

    await createSupabaseServerClient();

    expect(createServerClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ cookies: expect.objectContaining({ getAll: expect.any(Function) }) })
    );
  });

  it("reads cookies via the provided getAll implementation", async () => {
    const { createSupabaseServerClient } = await import("./server.js");

    await createSupabaseServerClient();

    const options = createServerClient.mock.calls.at(-1)?.[2];
    expect(options.cookies.getAll()).toEqual([{ name: "sb-token", value: "abc" }]);
  });
});
