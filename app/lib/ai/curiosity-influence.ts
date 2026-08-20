import type { ChatCompletionClient } from "./client";
import { extractJsonObject } from "./parse-response";
import type { SourceExcerpt } from "./narrative";

export interface ConfirmedInfluences {
  influencedBy: string[];
  influenced: string[];
}

export interface SynthesizeFactsInput {
  albumTitle: string;
  artistName: string;
  sourceExcerpts: SourceExcerpt[];
  confirmedInfluences?: ConfirmedInfluences;
}

export interface GeneratedFactItem {
  text: string;
  kind: "fact";
  sourceIds: string[];
}

export interface SynthesizeFactsResult {
  items: GeneratedFactItem[];
  generationFailed?: boolean;
}

interface RawFactResponse {
  items: GeneratedFactItem[];
}

function sourcesBlock(sourceExcerpts: SourceExcerpt[]): string {
  return sourceExcerpts.map((excerpt) => `[${excerpt.id}] ${excerpt.text}`).join("\n");
}

function buildCuriosityPrompt(input: SynthesizeFactsInput): string {
  return [
    "Você é um sintetizador de curiosidades musicais em pt-BR.",
    `Álbum: ${input.albumTitle} — Artista: ${input.artistName}`,
    "Extraia fatos curiosos, específicos e pouco óbvios sobre este álbum a partir das fontes abaixo — não repita informações básicas como data de lançamento, gravadora ou gênero, que já aparecem em outras partes da página.",
    "Se nenhuma fonte tiver um fato curioso genuíno, responda com uma lista vazia — nunca invente um fato para preencher.",
    "Fontes disponíveis (cite pelo id entre colchetes em sourceIds):",
    sourcesBlock(input.sourceExcerpts),
    "Responda em pt-BR APENAS com um JSON no formato:",
    '{"items":[{"text":"...","kind":"fact","sourceIds":["source-id"]}]}',
    "Cada item deve citar exatamente um id em sourceIds. Nunca invente fatos. Nunca copie o texto das fontes literalmente."
  ].join("\n");
}

function confirmedInfluencesBlock(confirmed?: ConfirmedInfluences): string {
  if (!confirmed || (confirmed.influencedBy.length === 0 && confirmed.influenced.length === 0)) {
    return "";
  }

  return [
    "A Wikipedia confirma estas relações de influência para este artista — priorize estes nomes, mas só inclua os que você conseguir contextualizar com as fontes abaixo (não invente uma explicação genérica só para incluir o nome):",
    confirmed.influencedBy.length > 0 ? `Influenciado por: ${confirmed.influencedBy.join(", ")}` : "",
    confirmed.influenced.length > 0 ? `Influenciou: ${confirmed.influenced.join(", ")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function buildInfluencePrompt(input: SynthesizeFactsInput): string {
  return [
    "Você é um sintetizador de relações de influência musical em pt-BR.",
    `Álbum: ${input.albumTitle} — Artista: ${input.artistName}`,
    confirmedInfluencesBlock(input.confirmedInfluences),
    "A partir das fontes abaixo, identifique relações de influência concretas envolvendo este álbum: outro artista ou álbum que ele influenciou, ou que o influenciou.",
    "Cada afirmação deve nomear explicitamente o outro artista ou álbum no próprio texto (não apenas nas fontes), e deixar claro a direção da influência.",
    "Se nenhuma fonte descrever uma relação de influência concreta, responda com uma lista vazia — nunca invente uma para preencher.",
    "Fontes disponíveis (cite pelo id entre colchetes em sourceIds):",
    sourcesBlock(input.sourceExcerpts),
    "Responda em pt-BR APENAS com um JSON no formato:",
    '{"items":[{"text":"...","kind":"fact","sourceIds":["source-id"]}]}',
    "Cada item deve citar exatamente um id em sourceIds. Nunca invente relações. Nunca copie o texto das fontes literalmente."
  ]
    .filter(Boolean)
    .join("\n");
}

async function synthesizeFacts(
  prompt: string,
  gptClient: ChatCompletionClient
): Promise<SynthesizeFactsResult> {
  try {
    const rawResponse = await gptClient.complete(prompt);
    const parsed = extractJsonObject<RawFactResponse>(rawResponse);
    return { items: parsed.items };
  } catch {
    return { items: [], generationFailed: true };
  }
}

export function synthesizeCuriosities(
  input: SynthesizeFactsInput,
  gptClient: ChatCompletionClient
): Promise<SynthesizeFactsResult> {
  return synthesizeFacts(buildCuriosityPrompt(input), gptClient);
}

export function synthesizeInfluence(
  input: SynthesizeFactsInput,
  gptClient: ChatCompletionClient
): Promise<SynthesizeFactsResult> {
  return synthesizeFacts(buildInfluencePrompt(input), gptClient);
}
