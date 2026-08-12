import type { ChatCompletionClient } from "./client";
import { extractJsonObject } from "./parse-response";

export type NarrativeFacet = "artist_moment" | "world_context" | "musical_scene" | "reception_vs_legacy";

export type StatementKind = "fact" | "interpretation" | "critical_opinion" | "unconfirmed";

export interface NarrativeStatement {
  text: string;
  kind: StatementKind;
  sourceIds: string[];
}

export interface SourceExcerpt {
  id: string;
  text: string;
}

export interface SameEraAlbumRef {
  title: string;
  artistName: string;
}

export interface HistoricalEventRef {
  title: string;
  date: string;
}

export interface SynthesizeNarrativeInput {
  albumTitle: string;
  artistName: string;
  structuredData: Record<string, unknown>;
  sameEraAlbums: SameEraAlbumRef[];
  historicalEvents: HistoricalEventRef[];
  sourceExcerpts: SourceExcerpt[];
}

export interface FacetResult {
  statements: NarrativeStatement[];
  generationFailed?: boolean;
}

export interface SynthesizeNarrativeResult {
  facets: Record<NarrativeFacet, FacetResult>;
}

const FACETS: NarrativeFacet[] = ["artist_moment", "world_context", "musical_scene", "reception_vs_legacy"];

const FACET_FOCUS: Record<NarrativeFacet, string> = {
  artist_moment:
    "Foque exclusivamente no momento pessoal e profissional do artista nessa época — não fale do mundo, de outros artistas, ou de como o álbum foi recebido.",
  world_context:
    "Foque exclusivamente no que acontecia no mundo (política, cultura, tecnologia) nessa época — não repita a biografia do artista nem fale de outros álbuns. Explore também a cultura pop e as tendências do momento (moda, entretenimento, costumes do dia a dia), não só grandes eventos políticos ou tecnológicos.",
  musical_scene:
    "Foque exclusivamente na cena musical da época (outros álbuns/artistas em destaque) — não repita a biografia do artista nem o contexto mundial.",
  reception_vs_legacy:
    "Foque exclusivamente em como o álbum foi recebido no lançamento e como é visto hoje — não repita a biografia do artista nem o contexto mundial."
};

function buildPrompt(facet: NarrativeFacet, input: SynthesizeNarrativeInput): string {
  const sourcesBlock = input.sourceExcerpts.map((excerpt) => `[${excerpt.id}] ${excerpt.text}`).join("\n");

  const facetSpecificContext =
    facet === "musical_scene"
      ? `Álbuns da mesma época: ${input.sameEraAlbums.map((a) => `${a.title} (${a.artistName})`).join(", ")}`
      : facet === "world_context"
        ? `Acontecimentos históricos próximos ao lançamento: ${input.historicalEvents.map((e) => `${e.title} (${e.date})`).join(", ")}`
        : "";

  return [
    `Você é um sintetizador de narrativas musicais em pt-BR. Seção: ${facet}.`,
    `Álbum: ${input.albumTitle} — Artista: ${input.artistName}`,
    `Dados estruturados: ${JSON.stringify(input.structuredData)}`,
    facetSpecificContext,
    FACET_FOCUS[facet],
    "O título do álbum, o artista e a data de lançamento já aparecem no topo da página — não repita essas informações básicas, vá direto ao conteúdo específico desta seção.",
    "Escreva como um texto corrido e conectado, com frases que se encadeiam naturalmente por meio de conectivos (\"além disso\", \"nesse mesmo período\", \"apesar disso\"), e não como uma lista de fatos soltos e desconectados entre si.",
    "Fontes disponíveis (cite pelo id entre colchetes em sourceIds):",
    sourcesBlock,
    "Responda em pt-BR APENAS com um JSON no formato:",
    '{"statements":[{"text":"...","kind":"fact|interpretation|critical_opinion|unconfirmed","sourceIds":["source-id"]}]}',
    "Nunca invente fatos, vendas, posições em charts, prêmios ou citações. Nunca copie o texto das fontes literalmente."
  ]
    .filter(Boolean)
    .join("\n");
}

interface RawStatementResponse {
  statements: NarrativeStatement[];
}

export async function synthesizeNarrative(
  input: SynthesizeNarrativeInput,
  gptClient: ChatCompletionClient,
  facetsToGenerate: NarrativeFacet[] = FACETS
): Promise<SynthesizeNarrativeResult> {
  const facets = {} as Record<NarrativeFacet, FacetResult>;

  for (const facet of facetsToGenerate) {
    const prompt = buildPrompt(facet, input);
    try {
      const rawResponse = await gptClient.complete(prompt);
      const parsed = extractJsonObject<RawStatementResponse>(rawResponse);
      facets[facet] = { statements: parsed.statements };
    } catch {
      facets[facet] = { statements: [], generationFailed: true };
    }
  }

  return { facets };
}
