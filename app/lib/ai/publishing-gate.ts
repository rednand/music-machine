import type { NarrativeStatement } from "./narrative";

export interface ValidationResult {
  valid: boolean;
  failures: string[];
}

const MIN_VERBATIM_MATCH_LENGTH = 40;

function isNearVerbatimCopy(statementText: string, sourceTexts: string[]): boolean {
  const normalizedStatement = statementText.trim().toLowerCase();
  if (normalizedStatement.length < MIN_VERBATIM_MATCH_LENGTH) {
    return false;
  }
  return sourceTexts.some((sourceText) => sourceText.toLowerCase().includes(normalizedStatement));
}

export function validateStatements(statements: NarrativeStatement[], sourceTexts: string[]): ValidationResult {
  const failures: string[] = [];

  for (const [index, statement] of statements.entries()) {
    if (statement.kind === "fact" && statement.sourceIds.length === 0) {
      failures.push(`statement ${index}: missing source citation for a fact statement`);
    }
    if (isNearVerbatimCopy(statement.text, sourceTexts)) {
      failures.push(`statement ${index}: copied text detected from a source excerpt`);
    }
  }

  return { valid: failures.length === 0, failures };
}
