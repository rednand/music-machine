import { describe, expect, it, vi } from "vitest";
import { deriveAlbumHook } from "./hook";

describe("deriveAlbumHook", () => {
  it("prefers the first published reception_vs_legacy statement", async () => {
    const deps = {
      findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
        Promise.resolve(
          facet === "reception_vs_legacy" ? { id: "article-1", status: "published" } : { id: "article-2", status: "published" }
        )
      ),
      findStatementsByArticleId: vi.fn().mockImplementation((articleId: string) =>
        Promise.resolve(
          articleId === "article-1"
            ? [{ text: "O disco em que a estrela pop virou autora.", kind: "interpretation", sourceIds: [] }]
            : [{ text: "Outro texto qualquer.", kind: "fact", sourceIds: [] }]
        )
      )
    };

    const hook = await deriveAlbumHook("album-1", deps);

    expect(hook).toBe("O disco em que a estrela pop virou autora.");
  });

  it("falls back to artist_moment when reception_vs_legacy has no published statement", async () => {
    const deps = {
      findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
        Promise.resolve(facet === "reception_vs_legacy" ? { id: "article-1", status: "failed_validation" } : { id: "article-2", status: "published" })
      ),
      findStatementsByArticleId: vi.fn().mockResolvedValue([{ text: "Texto do momento do artista.", kind: "fact", sourceIds: ["source-1"] }])
    };

    const hook = await deriveAlbumHook("album-1", deps);

    expect(hook).toBe("Texto do momento do artista.");
  });

  it("returns null when neither preferred facet has a published statement", async () => {
    const deps = {
      findByAlbumAndFacet: vi.fn().mockResolvedValue(null),
      findStatementsByArticleId: vi.fn()
    };

    expect(await deriveAlbumHook("album-1", deps)).toBeNull();
  });

  it("returns null when the published article has zero statements", async () => {
    const deps = {
      findByAlbumAndFacet: vi.fn().mockResolvedValue({ id: "article-1", status: "published" }),
      findStatementsByArticleId: vi.fn().mockResolvedValue([])
    };

    expect(await deriveAlbumHook("album-1", deps)).toBeNull();
  });

  it("never calls artist_moment lookup when reception_vs_legacy already has a usable statement", async () => {
    const findByAlbumAndFacet = vi.fn().mockResolvedValue({ id: "article-1", status: "published" });
    const deps = {
      findByAlbumAndFacet,
      findStatementsByArticleId: vi.fn().mockResolvedValue([{ text: "Gancho.", kind: "fact", sourceIds: [] }])
    };

    await deriveAlbumHook("album-1", deps);

    expect(findByAlbumAndFacet).toHaveBeenCalledTimes(1);
    expect(findByAlbumAndFacet).toHaveBeenCalledWith("album-1", "reception_vs_legacy");
  });
});
