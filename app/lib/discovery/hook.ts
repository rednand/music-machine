import type { NarrativeFacet, NarrativeStatement } from "../ai/narrative";

const FACET_PREFERENCE: NarrativeFacet[] = ["reception_vs_legacy", "artist_moment"];

export interface HookDeps {
  findByAlbumAndFacet(albumId: string, facet: NarrativeFacet): Promise<{ id: string; status: string } | null>;
  findStatementsByArticleId(articleId: string): Promise<NarrativeStatement[]>;
}

export async function deriveAlbumHook(albumId: string, deps: HookDeps): Promise<string | null> {
  for (const facet of FACET_PREFERENCE) {
    const article = await deps.findByAlbumAndFacet(albumId, facet);
    if (article?.status !== "published") {
      continue;
    }

    const statements = await deps.findStatementsByArticleId(article.id);
    if (statements.length > 0) {
      return statements[0].text;
    }
  }

  return null;
}
