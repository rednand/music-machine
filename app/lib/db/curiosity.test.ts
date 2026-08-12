import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createCuriosityRepository } from "./curiosity";

describe("CuriosityRepository", () => {
  it("defaults status to unconfirmed when not explicitly confirmed", async () => {
    const supabase = createFakeSupabase({});
    const repo = createCuriosityRepository(supabase as never);

    const created = await repo.create({
      album_id: "album-1",
      summary: "Rumor sobre a gravação.",
      source_id: "source-1"
    });

    expect(created.status).toBe("unconfirmed");
  });

  it("respects an explicitly confirmed status", async () => {
    const supabase = createFakeSupabase({});
    const repo = createCuriosityRepository(supabase as never);

    const created = await repo.create({
      album_id: "album-1",
      summary: "Fato confirmado pela fonte.",
      source_id: "source-1",
      status: "confirmed"
    });

    expect(created.status).toBe("confirmed");
  });

  it("lists curiosities for an album", async () => {
    const supabase = createFakeSupabase({});
    const repo = createCuriosityRepository(supabase as never);

    await repo.create({ album_id: "album-1", summary: "x", source_id: "source-1" });

    const results = await repo.findByAlbumId("album-1");

    expect(results).toHaveLength(1);
  });
});
