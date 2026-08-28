import type { ChatCompletionClient } from "./client";
import { extractJsonObject } from "./parse-response";

export type NarrativeFacet = "artist_moment" | "world_context" | "musical_scene" | "reception_vs_legacy" | "album_summary";

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
  albumId?: string;
  title: string;
  artistName: string;
  releaseYear?: string;
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

const STANDALONE_STATEMENT_FACETS: NarrativeFacet[] = ["world_context", "reception_vs_legacy", "album_summary"];

type BuildablePromptFacet = Exclude<NarrativeFacet, "reception_vs_legacy">;

const FACET_FOCUS: Record<BuildablePromptFacet, string> = {
  artist_moment:
    "Foque exclusivamente no momento pessoal e profissional do artista nessa época — não fale do mundo, de outros artistas, ou de como o álbum foi recebido.",
  world_context:
    "Escreva EXATAMENTE 3 statements, nesta ordem fixa: (1) política/eventos históricos marcantes da época, (2) cultura pop e tendências do momento (moda, entretenimento, costumes do dia a dia), (3) tecnologia. Cada statement deve ter 1-2 frases e tratar apenas do seu próprio tema, sem misturar os três — cada um será exibido como um card separado. Não repita a biografia do artista nem fale de outros álbuns. Classifique kind como \"interpretation\" (nunca \"fact\"), pois os eventos históricos listados são pano de fundo geral e não uma fonte pontual citável desta análise — deixe sourceIds como uma lista vazia.",
  musical_scene:
    "Foque exclusivamente na cena musical da época (outros álbuns/artistas em destaque) — não repita a biografia do artista nem o contexto mundial.",
  album_summary:
    "Escreva exatamente UMA frase autônoma e independente de qualquer contexto anterior, que resuma o que este álbum representa (sua essência, significado ou importância). Não use conectivos que assumam uma seção anterior (como \"nesse mesmo período\", \"além disso\", \"apesar disso\"). A frase deve fazer sentido sozinha, com no máximo 160 caracteres, pois será exibida como um resumo curto de até 2 linhas. Classifique kind como \"interpretation\" (nunca \"fact\"), pois esta frase sintetiza a essência do álbum e não cita uma fonte pontual — deixe sourceIds como uma lista vazia."
};

const RECEPTION_LAUNCH_FOCUS =
  "Escreva UM único statement sobre como este álbum foi recebido pela crítica e pelo público especificamente NO MOMENTO DO LANÇAMENTO — a reação imediata, contemporânea ao lançamento. Não mencione reavaliações posteriores, o legado atual, nem use expressões como \"anos depois\", \"hoje\" ou \"atualmente\" — descreva apenas a recepção da época. Bloco independente e autocontido.";

function receptionTodayFocus(elapsedTime: string): string {
  return `Escreva UM único statement sobre como este álbum é visto e avaliado ${elapsedTime} — a percepção e reavaliação atuais, com o distanciamento do tempo. Não descreva a recepção original do lançamento — fale apenas de como ele é visto agora. Bloco independente e autocontido.`;
}

function describeElapsedTime(releaseDateValue: unknown): string {
  const releaseDate = typeof releaseDateValue === "string" ? new Date(releaseDateValue) : null;
  if (!releaseDate || Number.isNaN(releaseDate.getTime())) {
    return "hoje";
  }

  const years = new Date().getFullYear() - releaseDate.getFullYear();
  if (years <= 0) {
    return "hoje, recém-lançado";
  }
  if (years === 1) {
    return "hoje, um ano depois";
  }
  if (years < 10) {
    return `hoje, ${years} anos depois`;
  }

  const decades = Math.round(years / 10);
  return decades <= 1 ? "hoje, cerca de uma década depois" : `hoje, cerca de ${decades} décadas depois`;
}

function buildPrompt(facet: BuildablePromptFacet, input: SynthesizeNarrativeInput): string {
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
    facet === "album_summary"
      ? "Responda com um único statement, não uma lista de fatos ou um texto corrido de múltiplas frases."
      : STANDALONE_STATEMENT_FACETS.includes(facet)
        ? "Cada statement deve ser um bloco independente e autocontido — não use conectivos que assumam um statement anterior (como \"além disso\", \"nesse mesmo período\", \"apesar disso\"), pois cada um será exibido isoladamente, não como um texto corrido."
        : "Escreva como um texto corrido e conectado, com frases que se encadeiam naturalmente por meio de conectivos (\"além disso\", \"nesse mesmo período\", \"apesar disso\"), e não como uma lista de fatos soltos e desconectados entre si.",
    "Fontes disponíveis (cite pelo id entre colchetes em sourceIds):",
    sourcesBlock,
    "Responda em pt-BR APENAS com um JSON no formato:",
    facet === "album_summary"
      ? '{"statements":[{"text":"...","kind":"interpretation","sourceIds":[]}]}'
      : '{"statements":[{"text":"...","kind":"fact|interpretation|critical_opinion|unconfirmed","sourceIds":["source-id"]}]}',
    "Nunca invente fatos, vendas, posições em charts, prêmios ou citações. Nunca copie o texto das fontes literalmente."
  ]
    .filter(Boolean)
    .join("\n");
}

function buildReceptionPrompt(period: "launch" | "today", input: SynthesizeNarrativeInput): string {
  const sourcesBlock = input.sourceExcerpts.map((excerpt) => `[${excerpt.id}] ${excerpt.text}`).join("\n");
  const focus =
    period === "launch" ? RECEPTION_LAUNCH_FOCUS : receptionTodayFocus(describeElapsedTime(input.structuredData.releaseDate));

  return [
    `Você é um sintetizador de narrativas musicais em pt-BR. Seção: reception_vs_legacy (${period === "launch" ? "no lançamento" : "hoje"}).`,
    `Álbum: ${input.albumTitle} — Artista: ${input.artistName}`,
    `Dados estruturados: ${JSON.stringify(input.structuredData)}`,
    focus,
    "O título do álbum, o artista e a data de lançamento já aparecem no topo da página — não repita essas informações básicas, vá direto ao conteúdo específico desta seção.",
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
    try {
      if (facet === "reception_vs_legacy") {
        const [launchRaw, todayRaw] = await Promise.all([
          gptClient.complete(buildReceptionPrompt("launch", input)),
          gptClient.complete(buildReceptionPrompt("today", input))
        ]);
        const launch = extractJsonObject<RawStatementResponse>(launchRaw).statements[0];
        const today = extractJsonObject<RawStatementResponse>(todayRaw).statements[0];
        if (!launch || !today) {
          facets[facet] = { statements: [], generationFailed: true };
          continue;
        }
        facets[facet] = { statements: [launch, today] };
        continue;
      }

      const rawResponse = await gptClient.complete(buildPrompt(facet, input));
      const parsed = extractJsonObject<RawStatementResponse>(rawResponse);
      facets[facet] = { statements: parsed.statements };
    } catch (error) {
      console.error(`Failed to synthesize facet ${facet}`, error);
      facets[facet] = { statements: [], generationFailed: true };
    }
  }

  return { facets };
}
