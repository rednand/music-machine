import { describe, expect, it } from "vitest";
import { extractJsonObject, MalformedGroqResponseError } from "./parse-response";

describe("extractJsonObject", () => {
  it("parses a raw JSON object response", () => {
    const result = extractJsonObject('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("extracts JSON wrapped in prose", () => {
    const raw = 'Aqui está o resultado:\n\n{"statements": []}\n\nEspero que ajude!';
    expect(extractJsonObject(raw)).toEqual({ statements: [] });
  });

  it("extracts JSON wrapped in a markdown code fence", () => {
    const raw = '```json\n{"statements": [{"text": "x"}]}\n```';
    expect(extractJsonObject(raw)).toEqual({ statements: [{ text: "x" }] });
  });

  it("throws MalformedGroqResponseError when no JSON object is found", () => {
    expect(() => extractJsonObject("desculpe, não posso ajudar com isso")).toThrow(
      MalformedGroqResponseError
    );
  });

  it("throws MalformedGroqResponseError when the extracted text is not valid JSON", () => {
    expect(() => extractJsonObject("{not valid json}")).toThrow(MalformedGroqResponseError);
  });
});
