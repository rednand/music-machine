import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createPerformanceRecordRepository } from "./performance-record";

describe("PerformanceRecordRepository", () => {
  it("creates and lists performance records for an album", async () => {
    const supabase = createFakeSupabase({});
    const repo = createPerformanceRecordRepository(supabase as never);

    await repo.create({
      album_id: "album-1",
      kind: "chart_position",
      label: "Billboard 200",
      value: "1",
      source_id: "source-1"
    });

    const records = await repo.findByAlbumId("album-1");

    expect(records).toEqual([expect.objectContaining({ label: "Billboard 200", value: "1" })]);
  });

  it("returns an empty array when the album has no performance records", async () => {
    const supabase = createFakeSupabase({});
    const repo = createPerformanceRecordRepository(supabase as never);

    expect(await repo.findByAlbumId("album-without-data")).toEqual([]);
  });
});
