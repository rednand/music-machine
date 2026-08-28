import type { ChatCompletionClient } from "./client";
import { extractJsonObject } from "./parse-response";

interface RawTranslationResponse {
  translations: string[];
}

function buildPrompt(titles: string[]): string {
  return [
    "Traduza cada manchete de notícia abaixo para português do Brasil.",
    "Mantenha nomes próprios e títulos de álbuns/músicas no idioma original.",
    "Responda em pt-BR APENAS com um JSON no formato:",
    '{"translations":["...","..."]}',
    "As traduções devem estar na mesma ordem e ter exatamente a mesma quantidade de itens enviados.",
    "Manchetes:",
    titles.map((title, index) => `${index + 1}. ${title}`).join("\n")
  ].join("\n");
}

export async function translateTitles(titles: string[], gptClient: ChatCompletionClient): Promise<string[]> {
  if (titles.length === 0) {
    return titles;
  }

  try {
    const rawResponse = await gptClient.complete(buildPrompt(titles));
    const parsed = extractJsonObject<RawTranslationResponse>(rawResponse);
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== titles.length) {
      return titles;
    }
    return parsed.translations.map((translated, index) => translated || titles[index]);
  } catch (error) {
    console.error("Failed to translate news headlines, keeping original text", error);
    return titles;
  }
}
