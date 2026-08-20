import { describe, expect, it, vi } from "vitest";
import { deriveAlbumHook } from "./hook";

describe("deriveAlbumHook", () => {
  it("prefers the first published album_summary statement", async () => {
    const deps = {
      findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
        Promise.resolve(
          facet === "album_summary" ? { id: "article-1", status: "published" } : { id: "article-2", status: "published" }
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

  it("falls back to reception_vs_legacy when album_summary has no published statement", async () => {
    const deps = {
      findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
        Promise.resolve(
          facet === "album_summary"
            ? { id: "article-1", status: "failed_validation" }
            : facet === "reception_vs_legacy"
              ? { id: "article-2", status: "published" }
              : { id: "article-3", status: "published" }
        )
      ),
      findStatementsByArticleId: vi.fn().mockImplementation((articleId: string) =>
        Promise.resolve(
          articleId === "article-2"
            ? [{ text: "Recepção e legado do álbum.", kind: "fact", sourceIds: [] }]
            : [{ text: "Outro texto qualquer.", kind: "fact", sourceIds: [] }]
        )
      )
    };

    const hook = await deriveAlbumHook("album-1", deps);

    expect(hook).toBe("Recepção e legado do álbum.");
  });

  it("falls back to artist_moment when neither album_summary nor reception_vs_legacy is published", async () => {
    const deps = {
      findByAlbumAndFacet: vi.fn().mockImplementation((_albumId: string, facet: string) =>
        Promise.resolve(
          facet === "album_summary" || facet === "reception_vs_legacy"
            ? { id: "article-1", status: "failed_validation" }
            : { id: "article-2", status: "published" }
        )
      ),
      findStatementsByArticleId: vi.fn().mockResolvedValue([{ text: "Texto do momento do artista.", kind: "fact", sourceIds: ["source-1"] }])
    };

    const hook = await deriveAlbumHook("album-1", deps);

    expect(hook).toBe("Texto do momento do artista.");
  });

  it("returns null when none of the preferred facets has a published statement", async () => {
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

  it("never calls reception_vs_legacy or artist_moment lookup when album_summary already has a usable statement", async () => {
    const findByAlbumAndFacet = vi.fn().mockResolvedValue({ id: "article-1", status: "published" });
    const deps = {
      findByAlbumAndFacet,
      findStatementsByArticleId: vi.fn().mockResolvedValue([{ text: "Gancho.", kind: "fact", sourceIds: [] }])
    };

    await deriveAlbumHook("album-1", deps);

    expect(findByAlbumAndFacet).toHaveBeenCalledTimes(1);
    expect(findByAlbumAndFacet).toHaveBeenCalledWith("album-1", "album_summary");
  });

  it("truncates a long statement at the last full sentence within the limit", async () => {
    const firstSentence =
      "No momento do lancamento, a imprensa musical elogiou a ousadia do album ao combinar faixas acusticas e pesadas.";
    const longText = `${firstSentence} Alem disso, o disco tambem foi visto como um marco na producao mais crua da banda em comparacao ao trabalho anterior.`;
    const deps = {
      findByAlbumAndFacet: vi.fn().mockResolvedValue({ id: "article-1", status: "published" }),
      findStatementsByArticleId: vi.fn().mockResolvedValue([{ text: longText, kind: "fact", sourceIds: [] }])
    };

    const hook = await deriveAlbumHook("album-1", deps);

    expect(hook).toBe(firstSentence);
    expect(hook!.length).toBeLessThanOrEqual(140);
  });

  it("truncates a long statement with no early sentence break at the last word boundary", async () => {
    const longText = "a".repeat(150);
    const deps = {
      findByAlbumAndFacet: vi.fn().mockResolvedValue({ id: "article-1", status: "published" }),
      findStatementsByArticleId: vi.fn().mockResolvedValue([{ text: longText, kind: "fact", sourceIds: [] }])
    };

    const hook = await deriveAlbumHook("album-1", deps);

    expect(hook).toBe(`${"a".repeat(140)}…`);
  });
});
