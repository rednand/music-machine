import type { NarrativeStatement } from "./narrative";

export interface ValidationResult {
  valid: boolean;
  failures: string[];
}

const MIN_VERBATIM_MATCH_LENGTH = 40;

const REFUSAL_PHRASES = [
  "não há fontes",
  "não existem fontes",
  "sem fontes disponíveis",
  "não foi possível encontrar",
  "não há informações disponíveis",
  "não há dados disponíveis",
  "não possui fontes",
  "não tenho informações",
  "não dispomos de"
];

function isNearVerbatimCopy(statementText: string, sourceTexts: string[]): boolean {
  const normalizedStatement = statementText.trim().toLowerCase();
  if (normalizedStatement.length < MIN_VERBATIM_MATCH_LENGTH) {
    return false;
  }
  return sourceTexts.some((sourceText) => sourceText.toLowerCase().includes(normalizedStatement));
}

function isRefusal(statementText: string): boolean {
  const normalized = statementText.toLowerCase();
  return REFUSAL_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function validateStatements(statements: NarrativeStatement[], sourceTexts: string[]): ValidationResult {
  const failures: string[] = [];

  for (const [index, statement] of statements.entries()) {
    if (!statement || typeof statement.text !== "string") {
      failures.push(`statement ${index}: missing or malformed statement`);
      continue;
    }
    if (statement.kind === "fact" && statement.sourceIds.length === 0) {
      failures.push(`statement ${index}: missing source citation for a fact statement`);
    }
    if (isNearVerbatimCopy(statement.text, sourceTexts)) {
      failures.push(`statement ${index}: copied text detected from a source excerpt`);
    }
    if (isRefusal(statement.text)) {
      failures.push(`statement ${index}: model refused to answer instead of producing content`);
    }
  }

  return { valid: failures.length === 0, failures };
}
