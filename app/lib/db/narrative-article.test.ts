import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createNarrativeArticleRepository } from "./narrative-article";

describe("NarrativeArticleRepository state machine", () => {
  it("creates a pending article for a facet and moves it to published with statements", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    const created = await repo.createPending("album-1", "artist_moment");
    expect(created.status).toBe("pending");

    const published = await repo.publish(created.id, [
      { text: "Fato citado.", kind: "fact", order: 0, sourceIds: ["source-1"] }
    ]);

    expect(published.status).toBe("published");
    expect(published.generated_at).toBeTruthy();
  });

  it("moves from pending to failed_validation", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    const created = await repo.createPending("album-2", "world_context");
    const failed = await repo.markFailedValidation(created.id);

    expect(failed.status).toBe("failed_validation");
  });

  it("moves from published to stale and back to pending for regeneration", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    const created = await repo.createPending("album-3", "musical_scene");
    await repo.publish(created.id, []);

    const stale = await repo.markStale(created.id);
    expect(stale.status).toBe("stale");

    const requeued = await repo.requeueForRegeneration(created.id);
    expect(requeued.status).toBe("pending");
  });

  it("replaces prior statements instead of accumulating duplicates when republished", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    const created = await repo.createPending("album-6", "artist_moment");
    await repo.publish(created.id, [{ text: "Primeira versão.", kind: "fact", order: 0, sourceIds: ["source-1"] }]);
    await repo.publish(created.id, [{ text: "Segunda versão.", kind: "fact", order: 0, sourceIds: ["source-1"] }]);

    const statements = await repo.findStatementsByArticleId(created.id);

    expect(statements).toEqual([expect.objectContaining({ text: "Segunda versão." })]);
  });

  it("reads back the published statements and their source ids", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    const created = await repo.createPending("album-5", "artist_moment");
    await repo.publish(created.id, [
      { text: "Fato citado.", kind: "fact", order: 0, sourceIds: ["source-1", "source-2"] }
    ]);

    const statements = await repo.findStatementsByArticleId(created.id);

    expect(statements).toEqual([
      expect.objectContaining({ text: "Fato citado.", kind: "fact", sourceIds: expect.arrayContaining(["source-1", "source-2"]) })
    ]);
  });

  it("finds an article by album id and facet", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    await repo.createPending("album-4", "reception_vs_legacy");

    const found = await repo.findByAlbumAndFacet("album-4", "reception_vs_legacy");

    expect(found).toEqual(expect.objectContaining({ album_id: "album-4", facet: "reception_vs_legacy" }));
  });
});
