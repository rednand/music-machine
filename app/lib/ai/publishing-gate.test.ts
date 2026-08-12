import { describe, expect, it } from "vitest";
import { validateStatements } from "./publishing-gate";

const sourceTexts = ["Control was released on February 4, 1986, by A&M Records."];

describe("validateStatements", () => {
  it("passes when every fact statement cites at least one source", () => {
    const result = validateStatements(
      [
        { text: "Control foi lançado em 4 de fevereiro de 1986 pela A&M Records.", kind: "fact", sourceIds: ["source-1"] },
        { text: "O álbum é visto como um marco.", kind: "interpretation", sourceIds: [] }
      ],
      sourceTexts
    );

    expect(result.valid).toBe(true);
  });

  it("fails when a fact statement has no source citation", () => {
    const result = validateStatements(
      [{ text: "Control vendeu 10 milhões de cópias no mundo.", kind: "fact", sourceIds: [] }],
      sourceTexts
    );

    expect(result.valid).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([expect.stringContaining("missing source")]));
  });

  it("fails when a statement copies source text verbatim", () => {
    const result = validateStatements(
      [
        {
          text: "Control was released on February 4, 1986, by A&M Records.",
          kind: "fact",
          sourceIds: ["source-1"]
        }
      ],
      sourceTexts
    );

    expect(result.valid).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([expect.stringContaining("copied")]));
  });
});
