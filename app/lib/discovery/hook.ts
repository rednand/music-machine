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

async function findBestStatementText(albumId: string, deps: HookDeps): Promise<string | null> {
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

export async function deriveAlbumHook(albumId: string, deps: HookDeps): Promise<string | null> {
  const text = await findBestStatementText(albumId, deps);
  return text ? toBriefHook(text) : null;
}

export async function deriveAlbumFullHook(albumId: string, deps: HookDeps): Promise<string | null> {
  return findBestStatementText(albumId, deps);
}

export interface BatchHookDeps {
  findPublishedByAlbumIdsAndFacets(
    albumIds: string[],
    facets: NarrativeFacet[]
  ): Promise<{ id: string; album_id: string; facet: NarrativeFacet }[]>;
  findFirstStatementTextByArticleIds(articleIds: string[]): Promise<Map<string, string>>;
}

export async function deriveAlbumHooksBatch(albumIds: string[], deps: BatchHookDeps): Promise<Map<string, string | null>> {
  const hooksByAlbumId = new Map<string, string | null>(albumIds.map((albumId) => [albumId, null]));
  if (albumIds.length === 0) {
    return hooksByAlbumId;
  }

  const publishedArticles = await deps.findPublishedByAlbumIdsAndFacets(albumIds, FACET_PREFERENCE);

  const bestArticleByAlbumId = new Map<string, { id: string; facet: NarrativeFacet }>();
  for (const article of publishedArticles) {
    const current = bestArticleByAlbumId.get(article.album_id);
    if (!current || FACET_PREFERENCE.indexOf(article.facet) < FACET_PREFERENCE.indexOf(current.facet)) {
      bestArticleByAlbumId.set(article.album_id, article);
    }
  }

  const articleIds = Array.from(bestArticleByAlbumId.values(), (article) => article.id);
  const firstTextByArticleId = await deps.findFirstStatementTextByArticleIds(articleIds);

  for (const [albumId, article] of bestArticleByAlbumId) {
    const text = firstTextByArticleId.get(article.id);
    if (text) {
      hooksByAlbumId.set(albumId, toBriefHook(text));
    }
  }

  return hooksByAlbumId;
}
