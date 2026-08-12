import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createReviewRepository } from "./review";

describe("ReviewRepository", () => {
  it("creates and lists reviews for an album", async () => {
    const supabase = createFakeSupabase({});
    const repo = createReviewRepository(supabase as never);

    await repo.create({
      album_id: "album-1",
      publication: "Rolling Stone",
      stance: "contemporary",
      summary: "A landmark reinvention.",
      source_url: "https://example.com/review",
      source_id: "source-1"
    });

    const reviews = await repo.findByAlbumId("album-1");

    expect(reviews).toEqual([expect.objectContaining({ publication: "Rolling Stone", stance: "contemporary" })]);
  });

  it("returns an empty array when the album has no reviews", async () => {
    const supabase = createFakeSupabase({});
    const repo = createReviewRepository(supabase as never);

    expect(await repo.findByAlbumId("album-without-reviews")).toEqual([]);
  });
});
