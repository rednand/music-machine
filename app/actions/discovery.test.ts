// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import * as collectionModule from "../lib/discovery/collection";
import { getDiscoveryPage } from "./discovery";

vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({})
}));

describe("getDiscoveryPage", () => {
  it("returns the ready state built by the collection aggregation", async () => {
    vi.spyOn(collectionModule, "buildDiscoveryPage").mockResolvedValue({
      state: "ready",
      featured: { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: "x" },
      collection: [{ albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", hook: "x" }]
    });

    const result = await getDiscoveryPage();

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.featured.albumId).toBe("album-1");
    }
  });

  it("returns the empty state as-is", async () => {
    vi.spyOn(collectionModule, "buildDiscoveryPage").mockResolvedValue({ state: "empty" });

    expect(await getDiscoveryPage()).toEqual({ state: "empty" });
  });
});
