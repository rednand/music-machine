// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import * as lotteryModule from "../lib/discovery/lottery";
import { getLotteryPool } from "./lottery";

vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({})
}));

describe("getLotteryPool", () => {
  it("returns the pool built by the lottery aggregation", async () => {
    vi.spyOn(lotteryModule, "buildLotteryPool").mockResolvedValue([
      {
        key: "beyonce|lemonade",
        artistName: "Beyoncé",
        albumTitle: "Lemonade",
        placements: [{ listName: "Rolling Stone 500", position: 32 }],
        albumId: "album-1",
        genre: "R&B",
        releaseYear: "2016"
      }
    ]);

    const result = await getLotteryPool();

    expect(result).toHaveLength(1);
    expect(result[0].albumId).toBe("album-1");
  });
});
