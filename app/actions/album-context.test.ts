// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import * as orchestration from "../lib/ingestion/album-context";

vi.mock("server-only", () => ({}));

vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({})
}));

vi.mock("../lib/supabase/admin.js", () => ({
  createSupabaseAdminClient: vi.fn().mockReturnValue({})
}));

vi.mock("../lib/auth", () => ({
  getCurrentIsAdmin: vi.fn().mockResolvedValue(false)
}));

vi.mock("next/server", () => ({
  after: vi.fn()
}));

import { getAlbumTechnicalSheet, getAlbumNarrative } from "./album-context";

describe("getAlbumTechnicalSheet", () => {
  it("returns the ready state with a populated technical body", async () => {
    vi.spyOn(orchestration, "assembleTechnicalSheet").mockResolvedValue({
      state: "ready",
      body: {
        header: { title: "Control", artist: "Janet Jackson", releaseDate: "1986-02-04", hook: null },
        tracks: [],
        credits: [],
        otherAlbumsByArtist: [],
        sameEraAlbums: [],
        performance: null,
        recommendations: [],
        listPlacements: []
      }
    });

    const result = await getAlbumTechnicalSheet("album-1");

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.performance).toBeNull();
      expect(result.body.header.title).toBe("Control");
    }
  });

  it("returns the not_found state as-is", async () => {
    vi.spyOn(orchestration, "assembleTechnicalSheet").mockResolvedValue({ state: "not_found" });

    expect(await getAlbumTechnicalSheet("unknown")).toEqual({ state: "not_found" });
  });

  it("returns the error state as-is", async () => {
    vi.spyOn(orchestration, "assembleTechnicalSheet").mockResolvedValue({ state: "error", message: "x" });

    expect(await getAlbumTechnicalSheet("album-1")).toEqual({ state: "error", message: "x" });
  });
});

describe("getAlbumNarrative", () => {
  it("returns the ready state with a populated influence array", async () => {
    vi.spyOn(orchestration, "assembleNarrative").mockResolvedValue({
      state: "ready",
      body: {
        artistMoment: [],
        worldContext: [],
        musicalScene: [],
        receptionVsLegacy: [],
        summary: [],
        curiosities: [],
        influence: [{ id: "i1", artistName: "Missy Elliott", albumId: "album-2", explanation: "x" }],
        failedFacets: []
      }
    });

    const result = await getAlbumNarrative("album-1");

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.body.influence).toHaveLength(1);
    }
  });

  it("returns the in_progress state as-is", async () => {
    vi.spyOn(orchestration, "assembleNarrative").mockResolvedValue({ state: "in_progress" });

    expect(await getAlbumNarrative("album-1")).toEqual({ state: "in_progress" });
  });

  it("returns the not_started state as-is", async () => {
    vi.spyOn(orchestration, "assembleNarrative").mockResolvedValue({ state: "not_started" });

    expect(await getAlbumNarrative("album-1")).toEqual({ state: "not_started" });
  });

  it("returns the not_found state as-is", async () => {
    vi.spyOn(orchestration, "assembleNarrative").mockResolvedValue({ state: "not_found" });

    expect(await getAlbumNarrative("unknown")).toEqual({ state: "not_found" });
  });
});
