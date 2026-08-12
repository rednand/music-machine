import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createClient = vi.fn().mockReturnValue({ from: vi.fn() });
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args)
}));

describe("createSupabaseAdminClient", () => {
  it("creates a client with the service-role key and no session persistence", async () => {
    const { createSupabaseAdminClient } = await import("./admin.js");

    createSupabaseAdminClient();

    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ auth: { autoRefreshToken: false, persistSession: false } })
    );
  });
});
