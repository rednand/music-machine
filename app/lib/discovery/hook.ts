import type { NarrativeFacet, NarrativeStatement } from "../ai/narrative";

const FACET_PREFERENCE: NarrativeFacet[] = ["album_summary", "reception_vs_legacy", "artist_moment"];

const MAX_HOOK_LENGTH = 140;

export interface HookDeps {
  findByAlbumAndFacet(albumId: string, facet: NarrativeFacet): Promise<{ id: string; status: string } | null>;
  findStatementsByArticleId(articleId: string): Promise<NarrativeStatement[]>;
}

function toBriefHook(text: string): string {
  if (text.length <= MAX_HOOK_LENGTH) {
    return text;
  }

  const truncated = text.slice(0, MAX_HOOK_LENGTH);
  const lastSentenceEnd = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf("!"), truncated.lastIndexOf("?"));
  if (lastSentenceEnd > 0) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : MAX_HOOK_LENGTH).trimEnd()}…`;
}

export async function deriveAlbumHook(albumId: string, deps: HookDeps): Promise<string | null> {
  for (const facet of FACET_PREFERENCE) {
    const article = await deps.findByAlbumAndFacet(albumId, facet);
    if (article?.status !== "published") {
      continue;
    }

    const statements = await deps.findStatementsByArticleId(article.id);
    if (statements.length > 0) {
      return toBriefHook(statements[0].text);
    }
  }

  return null;
}
