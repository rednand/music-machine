import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createInfluenceRepository } from "./influence";

describe("InfluenceRepository", () => {
  it("creates and lists influence links originating from an album", async () => {
    const supabase = createFakeSupabase({});
    const repo = createInfluenceRepository(supabase as never);

    await repo.create({
      from_album_id: "control",
      to_album_id: "some-later-album",
      explanation: "Definiu o new jack swing dos anos seguintes.",
      source_id: "source-1"
    });

    const results = await repo.findByFromAlbumId("control");

    expect(results).toEqual([expect.objectContaining({ to_album_id: "some-later-album" })]);
  });

  it("returns an empty array when an album has no known influence relationships", async () => {
    const supabase = createFakeSupabase({});
    const repo = createInfluenceRepository(supabase as never);

    expect(await repo.findByFromAlbumId("obscure-album")).toEqual([]);
  });
});
