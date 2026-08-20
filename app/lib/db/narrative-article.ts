import type { SupabaseLike } from "./supabase-like";
import type { NarrativeFacet, NarrativeStatement } from "../ai/narrative";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;
}

export type NarrativeArticleStatus = "pending" | "published" | "failed_validation" | "stale";

export interface NarrativeArticleRow {
  id: string;
  album_id: string;
  facet: NarrativeFacet;
  status: NarrativeArticleStatus;
  language: string;
  generated_at?: string | null;
}

export interface NarrativeStatementInput extends NarrativeStatement {
  order: number;
}

export function createNarrativeArticleRepository(supabase: SupabaseLike) {
  return {
    async createPending(albumId: string, facet: NarrativeFacet): Promise<NarrativeArticleRow> {
      const { data, error } = await supabase
        .from<NarrativeArticleRow>("narrative_articles")
        .insert({ album_id: albumId, facet, status: "pending", language: "pt-BR" })
        .select()
        .single();
      if (data) {
        return data;
      }
      if (isUniqueViolation(error)) {
        const existing = await supabase
          .from<NarrativeArticleRow>("narrative_articles")
          .select("*")
          .eq("album_id", albumId)
          .eq("facet", facet)
          .maybeSingle();
        if (existing.data) {
          return existing.data;
        }
      }
      throw new Error(`Failed to create narrative article: ${error ? JSON.stringify(error) : "no row returned"}`);
    },

    async publish(id: string, statements: NarrativeStatementInput[]): Promise<NarrativeArticleRow> {
      const { data: priorStatements } = await supabase
        .from<{ id: string }>("narrative_statements")
        .select("*")
        .eq("narrative_article_id", id);

      for (const prior of priorStatements ?? []) {
        await supabase.from("narrative_statement_sources").delete().eq("narrative_statement_id", prior.id);
      }
      await supabase.from("narrative_statements").delete().eq("narrative_article_id", id);

      for (const statement of statements) {
        const { data: createdStatement } = await supabase
          .from<{ id: string }>("narrative_statements")
          .insert({
            narrative_article_id: id,
            text: statement.text,
            kind: statement.kind,
            order: statement.order
          })
          .select()
          .single();

        for (const sourceId of statement.sourceIds) {
          await supabase
            .from("narrative_statement_sources")
            .insert({ narrative_statement_id: createdStatement?.id, source_id: sourceId })
            .select()
            .single();
        }
      }

      const { data } = await supabase
        .from<NarrativeArticleRow>("narrative_articles")
        .update({ status: "published", generated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      return data as NarrativeArticleRow;
    },

    async markFailedValidation(id: string): Promise<NarrativeArticleRow> {
      const { data } = await supabase
        .from<NarrativeArticleRow>("narrative_articles")
        .update({ status: "failed_validation" })
        .eq("id", id)
        .select()
        .single();
      return data as NarrativeArticleRow;
    },

    async markStale(id: string): Promise<NarrativeArticleRow> {
      const { data } = await supabase
        .from<NarrativeArticleRow>("narrative_articles")
        .update({ status: "stale" })
        .eq("id", id)
        .select()
        .single();
      return data as NarrativeArticleRow;
    },

    async requeueForRegeneration(id: string): Promise<NarrativeArticleRow> {
      const { data } = await supabase
        .from<NarrativeArticleRow>("narrative_articles")
        .update({ status: "pending" })
        .eq("id", id)
        .select()
        .single();
      return data as NarrativeArticleRow;
    },

    async findByAlbumAndFacet(albumId: string, facet: NarrativeFacet): Promise<NarrativeArticleRow | null> {
      const { data } = await supabase
        .from<NarrativeArticleRow>("narrative_articles")
        .select("*")
        .eq("album_id", albumId)
        .eq("facet", facet)
        .maybeSingle();
      return data;
    },

    async findStatementsByArticleId(articleId: string): Promise<NarrativeStatement[]> {
      const { data: statementRows } = await supabase
        .from<{ id: string; text: string; kind: NarrativeStatement["kind"] }>("narrative_statements")
        .select("*")
        .eq("narrative_article_id", articleId);

      const rows = statementRows ?? [];
      const statements: NarrativeStatement[] = [];
      for (const row of rows) {
        const { data: sourceLinks } = await supabase
          .from<{ source_id: string }>("narrative_statement_sources")
          .select("*")
          .eq("narrative_statement_id", row.id);
        statements.push({
          text: row.text,
          kind: row.kind,
          sourceIds: (sourceLinks ?? []).map((link) => link.source_id)
        });
      }
      return statements;
    }
  };
}

export type NarrativeArticleRepository = ReturnType<typeof createNarrativeArticleRepository>;
