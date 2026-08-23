// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const { getUserMock, rpcMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  rpcMock: vi.fn()
}));

vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({ auth: { getUser: getUserMock } })
}));

vi.mock("../lib/supabase/admin.js", () => ({
  createSupabaseAdminClient: vi.fn().mockReturnValue({ rpc: rpcMock })
}));

import { deleteAlbum } from "./admin";

describe("deleteAlbum", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the album via the cascade RPC when the caller is the admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "admin@example.com" } } });
    rpcMock.mockResolvedValue({ error: null });

    const result = await deleteAlbum("album-1");

    expect(result).toEqual({ state: "ready" });
    expect(rpcMock).toHaveBeenCalledWith("delete_album_cascade", { target_album_id: "album-1" });
  });

  it("refuses to delete when the caller is not signed in", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await deleteAlbum("album-1");

    expect(result).toEqual({ state: "error", message: "Não autorizado." });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("refuses to delete when the caller is signed in but is not the admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "someone-else@example.com" } } });

    const result = await deleteAlbum("album-1");

    expect(result).toEqual({ state: "error", message: "Não autorizado." });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns an error instead of throwing when the RPC call fails", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "admin@example.com" } } });
    rpcMock.mockResolvedValue({ error: { message: "db error" } });

    const result = await deleteAlbum("album-1");

    expect(result).toEqual({ state: "error", message: "Não foi possível excluir este álbum." });
  });
});
