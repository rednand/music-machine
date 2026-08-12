// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import * as orchestration from "../lib/ingestion/album-context";
import { getAlbumContext } from "./album-context";

vi.mock("server-only", () => ({}));

vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({})
}));

vi.mock("../lib/supabase/admin.js", () => ({
  createSupabaseAdminClient: vi.fn().mockReturnValue({})
}));

describe("getAlbumContext", () => {
  it("returns the ready state with a populated influence array", async () => {
    vi.spyOn(orchestration, "assembleAlbumContext").mockResolvedValue({
      state: "ready",
      body: {
        header: { title: "Control", artist: "Janet Jackson", releaseDate: "1986-02-04", hook: null },
        tracks: [],
        credits: [],
        otherAlbumsByArtist: [],
        artistMoment: [],
        worldContext: [],
        musicalScene: [],
        performance: null,
        receptionVsLegacy: [],
        curiosities: [],
        influence: [{ id: "i1", to_album_id: "album-2", explanation: "x", source_id: "s1" }],
        recommendations: []
      }
    });

    const result = await getAlbumContext("album-1");

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.performance).toBeNull();
      expect(result.body.influence).toHaveLength(1);
    }
  });

  it("returns the pending state as-is", async () => {
    vi.spyOn(orchestration, "assembleAlbumContext").mockResolvedValue({ state: "pending" });

    expect(await getAlbumContext("album-1")).toEqual({ state: "pending" });
  });

  it("returns the not_found state as-is", async () => {
    vi.spyOn(orchestration, "assembleAlbumContext").mockResolvedValue({ state: "not_found" });

    expect(await getAlbumContext("unknown")).toEqual({ state: "not_found" });
  });
});
