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

  it("returns the already-persisted article instead of throwing when a concurrent request already created it", async () => {
    const existingArticle = { id: "article-1", album_id: "album-1", facet: "world_context", status: "pending", language: "pt-BR" };
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { code: "23505", message: "duplicate key value" } })
          })
        }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: existingArticle, error: null })
            })
          })
        })
      })
    };
    const repo = createNarrativeArticleRepository(supabase as never);

    const result = await repo.createPending("album-1", "world_context");

    expect(result).toEqual(existingArticle);
  });

  it("still throws for a genuine failure that isn't a unique-constraint conflict", async () => {
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { code: "500", message: "connection reset" } })
          })
        })
      })
    };
    const repo = createNarrativeArticleRepository(supabase as never);

    await expect(repo.createPending("album-1", "world_context")).rejects.toThrow();
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

  it("finds published articles across many albums and facets in one batched call", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    const summaryArticle = await repo.createPending("album-7", "album_summary");
    await repo.publish(summaryArticle.id, [{ text: "Resumo.", kind: "fact", order: 0, sourceIds: [] }]);
    const pendingArticle = await repo.createPending("album-8", "artist_moment");
    await repo.createPending("album-9", "world_context");

    const results = await repo.findPublishedByAlbumIdsAndFacets(
      ["album-7", "album-8", "album-9"],
      ["album_summary", "artist_moment"]
    );

    expect(results).toEqual([expect.objectContaining({ album_id: "album-7", facet: "album_summary" })]);
    expect(results.map((article) => article.id)).not.toContain(pendingArticle.id);
  });

  it("returns an empty array without querying when given no album ids", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    expect(await repo.findPublishedByAlbumIdsAndFacets([], ["album_summary"])).toEqual([]);
  });

  it("finds only the first statement per article across many articles in one batched call", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    const first = await repo.createPending("album-10", "album_summary");
    await repo.publish(first.id, [
      { text: "Primeira frase.", kind: "fact", order: 0, sourceIds: [] },
      { text: "Segunda frase.", kind: "fact", order: 1, sourceIds: [] }
    ]);
    const second = await repo.createPending("album-11", "album_summary");
    await repo.publish(second.id, [{ text: "Outra frase.", kind: "fact", order: 0, sourceIds: [] }]);

    const firstTextByArticleId = await repo.findFirstStatementTextByArticleIds([first.id, second.id]);

    expect(firstTextByArticleId.get(first.id)).toBe("Primeira frase.");
    expect(firstTextByArticleId.get(second.id)).toBe("Outra frase.");
  });

  it("returns an empty map without querying when given no article ids", async () => {
    const supabase = createFakeSupabase({});
    const repo = createNarrativeArticleRepository(supabase as never);

    expect(await repo.findFirstStatementTextByArticleIds([])).toEqual(new Map());
  });
});
