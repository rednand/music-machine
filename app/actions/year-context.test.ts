// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import * as yearModule from "../lib/discovery/year";
import { getYearContext } from "./year-context";

vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({})
}));

describe("getYearContext", () => {
  it("returns the ready state built by the year aggregation", async () => {
    vi.spyOn(yearModule, "buildYearPage").mockResolvedValue({
      state: "ready",
      year: "1986",
      albums: [{ albumId: "album-1", title: "Control", artistName: "Janet Jackson", releaseYear: "1986", hook: null }],
      historicalEvents: [{ title: "Desastre do Challenger", date: "1986-01-28" }]
    });

    const result = await getYearContext("1986");

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.albums[0].albumId).toBe("album-1");
    }
  });

  it("returns the invalid state as-is", async () => {
    vi.spyOn(yearModule, "buildYearPage").mockResolvedValue({ state: "invalid" });

    expect(await getYearContext("abcd")).toEqual({ state: "invalid" });
  });
});
